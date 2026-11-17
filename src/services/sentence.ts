// services/sentence.ts — Cắt câu trong một đoạn văn.
// - sentenceAt: câu ĐẦY ĐỦ (tới dấu chấm) chứa từ được chạm — làm ngữ cảnh cho AI giải nghĩa từ.
// - clauseAt: vế câu chứa chữ được bấm giữ, ngắt ở MỌI dấu (chấm, phẩy, hai chấm, chấm phẩy, ngoặc kép…) — để tô chọn.
// - splitSentences: chia nhỏ theo cả dấu phẩy / hai chấm để dịch từng vế ngắn trong khung dịch câu.

const ENDERS = /[。！？!?；…]/;
/** Dấu ngắt vế: một vế kết thúc ở các dấu này cũng tính là một "câu" khi dịch. Không gồm 、(liệt kê). */
const CLAUSE_ENDERS = /[。！？!?；…，,：:]/;
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

/** Dấu ngắt khi bấm giữ để tô chọn: mọi dấu câu và dấu ngoặc kép / ngoặc đơn. */
const PICK_BREAKS = /[。．.！？!?；;…，,：:、「」『』"“”‘’（）()《》〈〉—\s]/;

/** Vế câu chứa ký tự `offset`: [start, end) theo ký tự, không gồm dấu ngắt hai đầu.
 *  null nếu `offset` rơi đúng vào một dấu. */
export function clauseAt(paragraph: string, offset: number): [number, number] | null {
  const chars = [...paragraph];
  if (offset < 0 || offset >= chars.length || PICK_BREAKS.test(chars[offset])) return null;
  let start = offset;
  while (start > 0 && !PICK_BREAKS.test(chars[start - 1])) start--;
  let end = offset + 1;
  while (end < chars.length && !PICK_BREAKS.test(chars[end])) end++;
  return [start, end];
}

export interface SentenceSpan {
  text: string;
  start: number; // vị trí ký tự bắt đầu trong đoạn
  end: number; // vị trí ký tự kết thúc (không gồm)
}

/** Cắt đoạn thành từng vế (ngắt ở dấu chấm, chấm than, hỏi, chấm phẩy, phẩy, hai chấm).
 *  Dấu đóng ngoặc ngay sau dấu ngắt (。」) thuộc về vế trước. */
export function splitSentences(paragraph: string): SentenceSpan[] {
  const chars = [...paragraph];
  const out: SentenceSpan[] = [];
  let start = 0;
  let i = 0;
  while (i < chars.length) {
    if (CLAUSE_ENDERS.test(chars[i])) {
      let end = i + 1;
      while (end < chars.length && (CLAUSE_ENDERS.test(chars[end]) || CLOSERS.test(chars[end]))) end++;
      out.push({ text: chars.slice(start, end).join(''), start, end });
      start = end;
      i = end;
    } else i++;
  }
  if (start < chars.length) out.push({ text: chars.slice(start).join(''), start, end: chars.length });
  return out.filter((s) => s.text.trim());
}
