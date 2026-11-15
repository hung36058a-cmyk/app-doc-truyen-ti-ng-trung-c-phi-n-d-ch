// modules/txt/parseTxt.ts — Đọc file truyện .txt thành Book.
// 1) Đoán bảng mã: UTF-8 / UTF-16 (có BOM), nếu không phải UTF-8 thì thử GB18030 (Giản thể) và Big5 (Phồn thể),
//    chọn bản giải mã ít chữ lỗi / chữ hiếm nhất.
// 2) Mỗi dòng có chữ là một đoạn.
// 3) Cắt chương theo dòng tiêu đề kiểu "第一章 …", "第12回", "楔子", "Chapter 3"; không tìm thấy thì chia đều.

import type { Book, Chapter } from '@/core/types';

export class TxtError extends Error {}

const NUM = '[0-9０-９零〇一二三四五六七八九十百千万萬两兩]+';
/** Dòng tiêu đề chương. Muốn nhận thêm kiểu tiêu đề khác: sửa biểu thức này.
 *  章/回/节/卷 nhận mọi kiểu ("第一章論壇"); 部/集/篇/幕/话 dễ trùng câu thường ("第一部手機") nên phải có
 *  khoảng trắng, dấu hai chấm hoặc hết dòng ngay sau. */
const CHAPTER_LINE = new RegExp(
  `^(第\\s*${NUM}\\s*([章回节節卷]|[部集篇幕话話](?=$|[\\s:：、.．]))|(序章|序言|楔子|引子|前言|尾声|尾聲|后记|後記|番外|终章|終章|完本感言)(?=$|[\\s:：、.．])|chapter\\s*\\d+)`,
  'i',
);
/** Câu văn thường hay kết thúc bằng dấu này; tiêu đề chương thì hiếm. */
const SENTENCE_END = /[。！？!?…”」』]$/;
/** Tiêu đề chương dài quá mức này thì coi là câu văn thường. */
const MAX_TITLE_LEN = 40;
/** Không có tiêu đề chương: chia mỗi phần chừng này đoạn. */
const PARAS_PER_PART = 120;

export async function parseTxt(file: Blob, title = 'Truyện không tên'): Promise<Book> {
  const text = decode(new Uint8Array(await file.arrayBuffer()));
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((l) => l.replace(/^[\s　﻿]+|[\s　]+$/g, ''))
    .filter((l) => l.length > 0);
  if (lines.length === 0) throw new TxtError('File .txt này không có chữ.');

  const chapters = splitChapters(lines);
  return {
    id: `${title}-${file.size}`,
    title,
    author: '',
    chapters,
    toc: chapters.map((c, i) => ({ title: c.title, chapterIndex: i })),
    addedAt: Date.now(),
  };
}

function splitChapters(lines: string[]): Chapter[] {
  const heads: number[] = [];
  lines.forEach((l, i) => {
    if (l.length <= MAX_TITLE_LEN && CHAPTER_LINE.test(l) && !SENTENCE_END.test(l)) heads.push(i);
  });

  const out: Chapter[] = [];
  const push = (title: string, paragraphs: string[]) => {
    if (paragraphs.length) out.push({ id: `c${out.length}`, title, paragraphs });
  };

  if (heads.length >= 2) {
    if (heads[0] > 0) push('Mở đầu', lines.slice(0, heads[0]));
    heads.forEach((h, k) => {
      const body = lines.slice(h + 1, heads[k + 1] ?? lines.length);
      // chương rỗng (chỉ có tiêu đề) vẫn giữ để mục lục không mất chương
      push(lines[h], body.length ? body : [lines[h]]);
    });
  } else {
    for (let i = 0, n = 1; i < lines.length; i += PARAS_PER_PART, n++) push(`Phần ${n}`, lines.slice(i, i + PARAS_PER_PART));
  }
  return out;
}

/** Giải mã byte thành chữ, tự đoán bảng mã. */
export function decode(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    /* không phải UTF-8 */
  }
  const sample = bytes.subarray(0, 200_000);
  let best = { enc: 'gb18030', score: Infinity };
  for (const enc of ['gb18030', 'big5']) {
    try {
      const s = badness(new TextDecoder(enc).decode(sample));
      if (s < best.score) best = { enc, score: s };
    } catch {
      /* trình duyệt không hỗ trợ bảng mã này */
    }
  }
  return new TextDecoder(best.enc).decode(bytes);
}

/** Điểm "xấu" của bản giải mã: chữ lỗi tính nặng, chữ hiếm (thường do đoán sai bảng mã) tính nhẹ. */
function badness(s: string): number {
  let bad = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0xfffd) bad += 10;
    else if ((c >= 0x3400 && c <= 0x4dbf) || (c >= 0xe000 && c <= 0xf8ff) || (c >= 0xac00 && c <= 0xd7af) || c >= 0x20000) bad += 1;
  }
  return bad;
}
