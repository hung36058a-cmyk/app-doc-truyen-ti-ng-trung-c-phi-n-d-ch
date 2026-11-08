// modules/epub/parseEpub.ts — Đọc file EPUB (zip) thành Book: metadata, chương, mục lục.
// Chương được cắt theo MỤC LỤC (nhiều EPUB gộp nhiều chương vào một file, hoặc cắt một chương ra nhiều file);
// EPUB không có mục lục thì mỗi file trong spine là một chương.
// Chỉ lấy chữ (bỏ ảnh, bỏ định dạng). Không hỗ trợ EPUB có DRM.
// Phụ thuộc: JSZip. Không đụng tới giao diện hay lưu trữ.

import JSZip from 'jszip';
import type { Book, Chapter, TocItem } from '@/core/types';

/** Thẻ tạo ra chỗ ngắt đoạn. */
const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'div',
  'section', 'article', 'header', 'footer', 'aside', 'main', 'nav', 'figure', 'figcaption',
  'table', 'tr', 'td', 'th', 'hr', 'center',
]);
/** Thẻ bỏ qua hẳn (không phải chữ truyện; rt/rp là phiên âm ruby). */
const SKIP_TAGS = new Set(['script', 'style', 'head', 'title', 'rt', 'rp', 'svg', 'math']);

export class EpubError extends Error {}

interface ManifestItem { href: string; type: string; props: string }
interface RawTocEntry { title: string; file: string; frag: string }

/** Hàm chính: nhận file người dùng chọn, trả về Book. */
export async function parseEpub(file: Blob, fallbackTitle = 'Truyện không tên'): Promise<Book> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new EpubError('File này không phải EPUB hợp lệ.');
  }
  if (zip.file('META-INF/encryption.xml')) {
    throw new EpubError('File EPUB này có DRM (bị mã hóa), app không mở được.');
  }

  const opfPath = await findOpfPath(zip);
  const opf = parseXml(await readText(zip, opfPath));
  const baseDir = dirOf(opfPath);

  const title = textOf(opf, 'title') || fallbackTitle;
  const author = textOf(opf, 'creator').replace(/^unknown$/i, '');

  const manifest = new Map<string, ManifestItem>();
  for (const item of byTag(opf, 'item')) {
    manifest.set(item.getAttribute('id') ?? '', {
      href: resolvePath(baseDir, item.getAttribute('href') ?? ''),
      type: item.getAttribute('media-type') ?? '',
      props: item.getAttribute('properties') ?? '',
    });
  }

  // 1) Đọc toàn bộ chữ theo thứ tự spine thành một dãy đoạn; ghi lại vị trí bắt đầu của mỗi file và mỗi id
  const paragraphs: string[] = [];
  const fileStart = new Map<string, number>(); // file -> chỉ số đoạn đầu tiên
  const anchorAt = new Map<string, number>(); // "file#id" -> chỉ số đoạn
  const fileTitles: { start: number; title: string }[] = [];

  for (const ref of byTag(opf, 'itemref')) {
    const item = manifest.get(ref.getAttribute('idref') ?? '');
    if (!item || !item.type.includes('html')) continue;
    const html = await readText(zip, item.href).catch(() => '');
    if (!html) continue;
    const doc = parseHtml(html);
    fileStart.set(item.href, paragraphs.length);
    fileTitles.push({ start: paragraphs.length, title: headingOf(doc) });
    collectBlocks(doc, item.href, paragraphs, anchorAt);
  }
  if (paragraphs.length === 0) throw new EpubError('Không tìm thấy nội dung chữ trong file EPUB.');

  // 2) Mục lục -> điểm cắt chương
  const rawToc = await readToc(zip, manifest);
  const points: { title: string; start: number }[] = [];
  for (const t of rawToc) {
    const start = t.frag ? anchorAt.get(`${t.file}#${t.frag}`) ?? fileStart.get(t.file) : fileStart.get(t.file);
    if (start === undefined || start >= paragraphs.length) continue;
    if (points.length && start <= points[points.length - 1].start) continue; // bỏ mục trùng hoặc lùi
    points.push({ title: t.title, start });
  }

  let chapters: Chapter[];
  if (points.length >= 2 || (points.length === 1 && fileTitles.length === 1)) {
    if (points[0].start > 0) points.unshift({ title: 'Mở đầu', start: 0 });
    chapters = points.map((p, i) => ({
      id: `c${i}`,
      title: p.title,
      paragraphs: paragraphs.slice(p.start, points[i + 1]?.start ?? paragraphs.length),
    }));
  } else {
    // không có mục lục dùng được: mỗi file là một chương
    chapters = fileTitles
      .map((f, i) => ({ start: f.start, end: fileTitles[i + 1]?.start ?? paragraphs.length, title: f.title }))
      .filter((f) => f.end > f.start)
      .map((f, i) => {
        const paras = paragraphs.slice(f.start, f.end);
        return { id: `c${i}`, title: f.title || paras[0].slice(0, 20), paragraphs: paras };
      });
  }

  const toc: TocItem[] = chapters.map((c, i) => ({ title: c.title, chapterIndex: i }));
  return { id: `${title}-${file.size}`, title, author, chapters, toc, addedAt: Date.now() };
}

// ---------- trích chữ ----------

/**
 * Duyệt cây HTML theo thứ tự, gom chữ thành đoạn: mỗi khối (p, div, h1...) hoặc <br> là một chỗ ngắt đoạn.
 * Bắt được cả chữ nằm trần trong <body>/<div> cạnh tiêu đề (nhiều EPUB kiểu "<h3>3</h3>chữ<br/>chữ").
 * Mỗi id trỏ vào đoạn chứa nó, hoặc đoạn kế tiếp nếu nó nằm giữa các đoạn.
 */
function collectBlocks(doc: Document, file: string, out: string[], anchorAt: Map<string, number>) {
  const body = doc.querySelector('body') ?? doc.documentElement;
  let buf = '';
  const flush = () => {
    const text = buf.replace(/\s+/g, ' ').trim();
    buf = '';
    if (text) out.push(text);
  };
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) { buf += child.nodeValue ?? ''; continue; }
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      const tag = el.localName.toLowerCase();
      if (SKIP_TAGS.has(tag)) continue;
      if (tag === 'br') { flush(); continue; }
      const block = BLOCK_TAGS.has(tag);
      if (block) flush();
      const id = el.id || (tag === 'a' ? el.getAttribute('name') ?? '' : '');
      if (id) anchorAt.set(`${file}#${id}`, out.length);
      walk(el);
      if (block) flush();
    }
  };
  walk(body);
  flush();
}

/** Tiêu đề thật của file (bỏ qua <title> chung chung kiểu "index"). */
function headingOf(doc: Document): string {
  const h = (doc.querySelector('h1, h2, h3')?.textContent ?? '').trim();
  if (h) return h;
  const t = (doc.querySelector('title')?.textContent ?? '').trim();
  return /^(index|untitled|cover|unknown)$/i.test(t) ? '' : t;
}

// ---------- mục lục (EPUB3 nav hoặc EPUB2 ncx) ----------

async function readToc(zip: JSZip, manifest: Map<string, ManifestItem>): Promise<RawTocEntry[]> {
  const items: RawTocEntry[] = [];
  const push = (title: string, href: string) => {
    const [file, frag = ''] = href.split('#');
    const clean = title.replace(/\s+/g, ' ').trim();
    if (clean) items.push({ title: clean, file, frag: decodeURIComponent(frag) });
  };

  const nav = [...manifest.values()].find((m) => m.props.split(' ').includes('nav'));
  if (nav) {
    const doc = parseHtml(await readText(zip, nav.href).catch(() => ''));
    const dir = dirOf(nav.href);
    const tocNav =
      [...doc.querySelectorAll('nav')].find((n) => (n.getAttribute('epub:type') ?? n.getAttribute('type')) === 'toc') ?? doc;
    for (const a of tocNav.querySelectorAll('a[href]')) push(a.textContent ?? '', resolvePath(dir, a.getAttribute('href') ?? ''));
    if (items.length) return items;
  }

  const ncx = [...manifest.values()].find((m) => m.type === 'application/x-dtbncx+xml');
  if (ncx) {
    const doc = parseXml(await readText(zip, ncx.href).catch(() => '<x/>'));
    const dir = dirOf(ncx.href);
    for (const point of byTag(doc, 'navPoint')) {
      const label = byTag(point, 'text')[0]?.textContent ?? '';
      const src = byTag(point, 'content')[0]?.getAttribute('src') ?? '';
      push(label, resolvePath(dir, src));
    }
  }
  return items;
}

// ---------- tiện ích ----------

async function findOpfPath(zip: JSZip): Promise<string> {
  const container = await readText(zip, 'META-INF/container.xml').catch(() => '');
  const path = container ? byTag(parseXml(container), 'rootfile')[0]?.getAttribute('full-path') : null;
  if (path) return path;
  const opf = Object.keys(zip.files).find((f) => f.endsWith('.opf'));
  if (!opf) throw new EpubError('File EPUB thiếu phần mô tả nội dung (.opf).');
  return opf;
}

async function readText(zip: JSZip, path: string): Promise<string> {
  const f = zip.file(safeDecode(path)) ?? zip.file(path);
  if (!f) throw new Error(`missing ${path}`);
  return f.async('string');
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

/** XHTML chuẩn trước; file lỗi cú pháp thì đọc lại như HTML thường. */
function parseHtml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xhtml+xml');
  return doc.querySelector('parsererror') ? new DOMParser().parseFromString(text, 'text/html') : doc;
}

/** Lấy phần tử theo tên, bỏ qua namespace (dc:title, opf:item...). */
function byTag(root: Document | Element, local: string): Element[] {
  return [...root.querySelectorAll('*')].filter(
    (el) => el.localName === local || el.tagName.toLowerCase().endsWith(`:${local.toLowerCase()}`),
  );
}

function textOf(root: Document, local: string): string {
  return (byTag(root, local)[0]?.textContent ?? '').trim();
}

function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i + 1);
}

function resolvePath(base: string, rel: string): string {
  const parts = (base + rel).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}
