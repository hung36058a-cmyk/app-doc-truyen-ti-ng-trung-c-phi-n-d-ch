// services/phrase.ts — Hàm thuần cho "cụm từ" (collocation): kiểm tra cụm AI trả về có hợp lệ không,
// và tìm vị trí cụm trong đoạn văn để tô sáng cả cụm trên trang đọc.

import type { PhrasePart } from '@/core/types';

/** Cụm hợp lệ: chứa từ vừa chạm, và (nếu biết câu) nằm nguyên văn trong câu. */
export function isValidPhrase(phrase: string, word: string, sentence: string): boolean {
  if (!phrase || phrase === word || !phrase.includes(word)) return false;
  return !sentence || sentence.includes(phrase);
}

/** Các từ nhỏ hợp lệ: ghép lại phải đúng bằng cụm, nếu không thì bỏ (AI trả sai). */
export function validParts(parts: unknown, phrase: string): PhrasePart[] {
  if (!Array.isArray(parts)) return [];
  const list = parts
    .map((p) => ({ text: String(p?.text ?? '').trim(), meaning: String(p?.meaning ?? '').trim() }))
    .filter((p) => p.text);
  return list.map((p) => p.text).join('') === phrase ? list : [];
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
