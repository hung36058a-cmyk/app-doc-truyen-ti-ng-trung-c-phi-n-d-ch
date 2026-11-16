// ui/hooks/useTextPick.ts — Tự tô chọn chữ trong truyện bằng HAI CON TRỎ CỦA APP (không dùng bôi đen của Android,
// nên không hiện menu Copy/Share và thanh tìm kiếm Google).
// Bấm giữ một chữ -> chọn từ đó, hiện 2 con trỏ; kéo con trỏ để nới / thu vùng chọn (qua nhiều đoạn cũng được).
// Vùng chọn tô bằng CSS Custom Highlight (chính xác từng chữ); máy không hỗ trợ thì ReaderScreen tô theo từ.

import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

/** Một điểm trong chương: đoạn thứ mấy, ký tự thứ mấy trong đoạn. */
export interface Pos { para: number; at: number }
/** Vùng chọn [a, b): a đứng trước b. */
export interface Pick { a: Pos; b: Pos }
export interface HandleBox { x: number; y: number; h: number } // toạ độ trong khung cuộn; h = chiều cao dòng chữ

export const HIGHLIGHT_OK = typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
const NAME = 'pick';

const cmp = (p: Pos, q: Pos) => p.para - q.para || p.at - q.at;
const paraEl = (root: HTMLElement, i: number) => root.querySelector<HTMLElement>(`[data-p="${i}"]`);
const paraLen = (p: HTMLElement) => [...(p.textContent ?? '')].length;

/** Điểm DOM (text node + vị trí UTF-16) ứng với ký tự thứ `at` của đoạn. */
function domPoint(root: HTMLElement, pos: Pos): { node: Node; offset: number } | null {
  const p = paraEl(root, pos.para);
  if (!p) return null;
  let last: { node: Node; offset: number } | null = null;
  for (const span of p.querySelectorAll<HTMLElement>('[data-o]')) {
    const node = span.firstChild;
    if (!node) continue;
    const chars = [...(node.textContent ?? '')];
    const o = Number(span.dataset.o);
    if (pos.at < o + chars.length) return { node, offset: chars.slice(0, Math.max(0, pos.at - o)).join('').length };
    last = { node, offset: (node.textContent ?? '').length };
  }
  return last;
}

function toRange(root: HTMLElement, a: Pos, b: Pos): Range | null {
  const s = domPoint(root, a);
  const e = domPoint(root, b);
  if (!s || !e) return null;
  const r = document.createRange();
  r.setStart(s.node, s.offset);
  r.setEnd(e.node, e.offset);
  return r;
}

/** Điểm trong chương nằm dưới toạ độ màn hình (x, y); null nếu không trúng chữ nào của truyện. */
function posAt(root: HTMLElement, x: number, y: number): Pos | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | null = null;
  let offset = 0;
  const cp = doc.caretPositionFromPoint?.(x, y);
  if (cp) { node = cp.offsetNode; offset = cp.offset; }
  else {
    const cr = doc.caretRangeFromPoint?.(x, y);
    if (cr) { node = cr.startContainer; offset = cr.startOffset; }
  }
  const from = node && (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement);
  let p = from?.closest<HTMLElement>('[data-p]') ?? null;
  if (p && root.contains(p) && node) {
    const r = document.createRange();
    r.setStart(p, 0);
    r.setEnd(node, offset);
    return { para: Number(p.dataset.p), at: [...r.toString()].length };
  }
  // không lấy được vị trí con trỏ (trình duyệt cũ, hoặc chạm vào khoảng trống): dùng <span> dưới ngón tay
  const span = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-o]');
  p = span?.closest<HTMLElement>('[data-p]') ?? null;
  if (!span || !p || !root.contains(p)) return null;
  const box = span.getBoundingClientRect();
  const len = [...(span.textContent ?? '')].length;
  const inside = Math.round(((x - box.left) / Math.max(1, box.width)) * len);
  return { para: Number(p.dataset.p), at: Number(span.dataset.o) + Math.max(0, Math.min(len, inside)) };
}

/** Chữ nằm trong vùng chọn (các đoạn nối bằng xuống dòng). */
export function pickText(paragraphs: string[], pick: Pick): string {
  const out: string[] = [];
  for (let i = pick.a.para; i <= pick.b.para; i++) {
    const chars = [...(paragraphs[i] ?? '')];
    out.push(chars.slice(i === pick.a.para ? pick.a.at : 0, i === pick.b.para ? pick.b.at : chars.length).join(''));
  }
  return out.join('\n').trim();
}

export function useTextPick(body: RefObject<HTMLDivElement>, layoutKey: unknown) {
  const [pick, setPick] = useState<Pick | null>(null);
  const [boxes, setBoxes] = useState<{ a: HandleBox; b: HandleBox } | null>(null);
  const drag = useRef<{ which: 'a' | 'b'; dx: number; dy: number } | null>(null);
  const current = useRef<Pick | null>(null);
  current.current = pick;

  // tô vùng chọn + đặt 2 con trỏ (tính lại khi vùng chọn, cỡ chữ, chương... thay đổi)
  useLayoutEffect(() => {
    const root = body.current;
    const range = root && pick ? toRange(root, pick.a, pick.b) : null;
    if (HIGHLIGHT_OK) {
      if (range) CSS.highlights.set(NAME, new Highlight(range));
      else CSS.highlights.delete(NAME);
    }
    if (!root || !range) return setBoxes(null);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) return setBoxes(null);
    const frame = root.getBoundingClientRect();
    const first = rects[0];
    const lastRect = rects[rects.length - 1];
    const toBox = (x: number, r: DOMRect): HandleBox => ({ x: x - frame.left + root.scrollLeft, y: r.top - frame.top + root.scrollTop, h: r.height });
    setBoxes({ a: toBox(first.left, first), b: toBox(lastRect.right, lastRect) });
  }, [pick, layoutKey]);

  useEffect(() => () => { if (HIGHLIGHT_OK) CSS.highlights.delete(NAME); }, []);

  /** Bắt đầu chọn: [at, at + length) trong đoạn para. */
  const start = (para: number, at: number, length: number) => setPick({ a: { para, at }, b: { para, at: at + Math.max(1, length) } });
  const clear = () => setPick(null);

  /** Handler gắn vào từng con trỏ. */
  const handle = (which: 'a' | 'b') => ({
    onPointerDown: (e: PointerEvent) => {
      const box = boxes?.[which];
      const root = body.current;
      if (!box || !root) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      // điểm "ngắm" là giữa dòng chữ của con trỏ, không phải chỗ ngón tay (ngón tay nằm dưới dòng chữ)
      const frame = root.getBoundingClientRect();
      const aimX = box.x + frame.left - root.scrollLeft;
      const aimY = box.y + frame.top - root.scrollTop + box.h / 2;
      drag.current = { which, dx: aimX - e.clientX, dy: aimY - e.clientY };
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current;
      const root = body.current;
      const cur = current.current;
      if (!d || !root || !cur) return;
      e.preventDefault();
      // kéo sát mép trên / dưới thì tự cuộn
      const frame = root.getBoundingClientRect();
      if (e.clientY > frame.bottom - 70) root.scrollTop += 14;
      else if (e.clientY < frame.top + 70) root.scrollTop -= 14;
      const pos = posAt(root, e.clientX + d.dx, e.clientY + d.dy);
      if (!pos) return;
      const fixed = d.which === 'a' ? cur.b : cur.a;
      const order = cmp(pos, fixed);
      if (order === 0) return; // không cho vùng chọn rỗng
      // kéo vượt qua con trỏ kia: hai con trỏ đổi vai
      const next: Pick = order < 0 ? { a: pos, b: fixed } : { a: fixed, b: pos };
      d.which = order < 0 ? 'a' : 'b';
      if (cmp(next.a, cur.a) !== 0 || cmp(next.b, cur.b) !== 0) setPick(next);
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  });

  /** Vùng [start, end) của đoạn i nằm trong vùng chọn (để tô theo từ khi máy không có CSS Highlight); [-1, -1] nếu không. */
  const rangeIn = (p: Pick | null, i: number): [number, number] => {
    if (!p || i < p.a.para || i > p.b.para) return [-1, -1];
    return [i === p.a.para ? p.a.at : 0, i === p.b.para ? p.b.at : Infinity];
  };

  return { pick, boxes, start, clear, handle, rangeIn, paraLen };
}
