// services/sentence.ts — Cắt ra câu chứa vị trí từ được chạm trong một đoạn văn.

const ENDERS = /[。！？!?；…]/;
const CLOSERS = /[」』"”）)]/;

/** offset = vị trí (theo ký tự) của từ trong đoạn. */
export function sentenceAt(paragraph: string, offset: number): string {
  const chars = [...paragraph];
  let start = offset;
  while (start > 0 && !ENDERS.test(chars[start - 1])) start--;
  let end = offset;
  while (end < chars.length && !ENDERS.test(chars[end])) end++;
  while (end < chars.length && (ENDERS.test(chars[end]) || CLOSERS.test(chars[end]))) end++;
  return chars.slice(start, end).join('').replace(/^[」』"”\s]+/, '').trim();
}
