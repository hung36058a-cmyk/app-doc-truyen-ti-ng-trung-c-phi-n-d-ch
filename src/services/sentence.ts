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

export interface SentenceSpan {
  text: string;
  start: number; // vị trí ký tự bắt đầu trong đoạn
  end: number; // vị trí ký tự kết thúc (không gồm)
}

/** Cắt đoạn thành từng câu. Dấu đóng ngoặc ngay sau dấu kết câu (。」) thuộc về câu trước. */
export function splitSentences(paragraph: string): SentenceSpan[] {
  const chars = [...paragraph];
  const out: SentenceSpan[] = [];
  let start = 0;
  let i = 0;
  while (i < chars.length) {
    if (ENDERS.test(chars[i])) {
      let end = i + 1;
      while (end < chars.length && (ENDERS.test(chars[end]) || CLOSERS.test(chars[end]))) end++;
      out.push({ text: chars.slice(start, end).join(''), start, end });
      start = end;
      i = end;
    } else i++;
  }
  if (start < chars.length) out.push({ text: chars.slice(start).join(''), start, end: chars.length });
  return out.filter((s) => s.text.trim());
}
