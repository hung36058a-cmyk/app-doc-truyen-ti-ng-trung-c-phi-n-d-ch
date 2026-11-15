// services/phrase.ts — Hàm thuần cho "cụm từ" (collocation): kiểm tra cụm AI trả về có hợp lệ không,
// và tìm vị trí cụm trong đoạn văn để tô sáng cả cụm trên trang đọc.

import type { PhrasePart } from '@/core/types';

/** Phó từ mức độ / hư từ hay bị AI ghép nhầm vào đầu hoặc cuối cụm (vd 有點 + 哭笑不得). */
const EDGE_WORDS = ['有點兒', '有點', '有些', '一點', '非常', '十分', '特別', '已經', '真是', '實在', '簡直',
  '很', '太', '更', '最', '真', '好', '挺', '都', '也', '就', '又', '還', '才', '再', '了', '的', '地', '得', '著', '過', '呢', '嗎', '吧', '啊'];

/**
 * Làm gọn cụm AI trả về: bỏ phó từ/hư từ ở hai đầu (有點哭笑不得 -> 哭笑不得).
 * Trả '' nếu không còn là cụm hợp lệ: phải chứa từ vừa chạm, dài hơn từ đó, và (nếu biết câu) nằm nguyên văn trong câu.
 */
export function cleanPhrase(phrase: string, word: string, sentence: string): string {
  let p = phrase.trim();
  for (let changed = true; changed; ) {
    changed = false;
    for (const w of EDGE_WORDS) {
      if (p.startsWith(w) && p.length > w.length && p.slice(w.length).includes(word)) { p = p.slice(w.length); changed = true; }
      if (p.endsWith(w) && p.length > w.length && p.slice(0, -w.length).includes(word)) { p = p.slice(0, -w.length); changed = true; }
    }
  }
  if (!p || p === word || !p.includes(word)) return '';
  if (sentence && !sentence.includes(p)) return '';
  return p;
}

/** Tìm trong danh sách cụm đã biết một cụm chứa từ vừa chạm và có mặt trong câu (cụm dài nhất thắng). */
export function knownPhraseIn(phrases: Iterable<string>, word: string, sentence: string): string {
  let best = '';
  for (const p of phrases) if (p.length > best.length && p !== word && p.includes(word) && sentence.includes(p)) best = p;
  return best;
}

/** Các từ nhỏ hợp lệ: ghép lại phải đúng bằng cụm, nếu không thì bỏ (AI trả sai). */
export function validParts(parts: unknown, phrase: string): PhrasePart[] {
  if (!Array.isArray(parts)) return [];
  const list = parts
    .map((p) => ({ text: String(p?.text ?? '').trim(), meaning: String(p?.meaning ?? '').trim() }))
    .filter((p) => p.text);
  if (list.map((p) => p.text).join('') === phrase) return list;
  // cụm đã được làm gọn: giữ các từ nhỏ nằm trong cụm, nếu ghép lại vẫn khớp
  const kept = list.filter((p) => phrase.includes(p.text));
  return kept.map((p) => p.text).join('') === phrase ? kept : [];
}

/**
 * Khoảng ký tự [start, end) cần tô sáng: nếu có cụm thì là chỗ cụm xuất hiện đè lên từ vừa chạm
 * (start/end = vị trí từ vừa chạm, tính theo ký tự), không thì chính từ vừa chạm.
 */
export function highlightRange(paragraph: string, start: number, end: number, phrase?: string): [number, number] {
  if (!phrase) return [start, end];
  const chars = [...paragraph];
  const n = [...phrase].length;
  for (let i = Math.max(0, end - n); i <= start && i + n <= chars.length; i++) {
    if (chars.slice(i, i + n).join('') === phrase) return [i, i + n];
  }
  return [start, end];
}
