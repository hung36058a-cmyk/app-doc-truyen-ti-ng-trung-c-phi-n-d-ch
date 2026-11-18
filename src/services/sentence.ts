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

/** Dấu ngắt khi bấm giữ để tô chọn: mọi dấu câu và dấu ngoặc kép / ngoặc đơn.
 *  KHÔNG ngắt ở dấu cách, để truyện tiếng Việt/Anh cũng tô cả vế chứ không chỉ một từ. */
const PICK_BREAKS = /[。．.！？!?；;…，,：:、「」『』"“”‘’（）()《》〈〉—\n]/;
const DIGIT = /[0-9０-９]/;

/** chars[i] có phải chỗ ngắt vế không. Dấu . , : nằm giữa hai chữ số (3,4 · 3.500 · 10:30) không tính. */
function isBreak(chars: string[], i: number): boolean {
  const c = chars[i];
  if (!PICK_BREAKS.test(c)) return false;
  if (/[.,:．，：]/.test(c) && DIGIT.test(chars[i - 1] ?? '') && DIGIT.test(chars[i + 1] ?? '')) return false;
  return true;
}

/** Vế câu chứa ký tự `offset`: [start, end) theo ký tự, không gồm dấu ngắt và khoảng trắng hai đầu.
 *  null nếu `offset` rơi đúng vào một dấu (hoặc vế chỉ toàn khoảng trắng). */
export function clauseAt(paragraph: string, offset: number): [number, number] | null {
  const chars = [...paragraph];
  if (offset < 0 || offset >= chars.length || isBreak(chars, offset)) return null;
  let start = offset;
  while (start > 0 && !isBreak(chars, start - 1)) start--;
  let end = offset + 1;
  while (end < chars.length && !isBreak(chars, end)) end++;
  while (start < end && /\s/.test(chars[start])) start++;
  while (end > start && /\s/.test(chars[end - 1])) end--;
  return end > start ? [start, end] : null;
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
