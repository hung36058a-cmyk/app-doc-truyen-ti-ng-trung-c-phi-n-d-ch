// modules/anki/cardHtml.ts — Chuyển nội dung thẻ thành HTML sạch cho mặt sau thẻ Anki,
// theo đúng thứ tự mẫu thẻ của người dùng:
// 1 (pinyin) [Hán Việt]: nghĩa Việt · 2 = nghĩa Anh; (từ loại) · 3 câu gốc · 4 câu ví dụ AI
// 5 cấu trúc đi kèm · 6 phân biệt từ gần nghĩa. Muốn đổi bố cục thẻ: chỉ sửa file này.

import type { CardContent } from '@/core/types';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** In đậm từ đang học trong câu (sau khi đã escape). */
function boldWord(sentence: string, word: string): string {
  const safe = escapeHtml(sentence);
  const w = escapeHtml(word);
  return w ? safe.split(w).join(`<b>${w}</b>`) : safe;
}

/** Pinyin trên thẻ viết liền như mẫu: "chēng hu" -> "chēnghu". */
export function compactPinyin(p: string): string {
  return p.replace(/\s+/g, '');
}

export function cardBackHtml(word: string, sentence: string, c: CardContent): string {
  const lines: string[] = [];
  lines.push(
    `<div>(${escapeHtml(compactPinyin(c.pinyin))}) [${escapeHtml(c.hanviet)}]: ${escapeHtml(c.vietnamese)}</div>`,
  );
  lines.push(`<div>= ${escapeHtml(c.english)}${c.partOfSpeech ? `; (${escapeHtml(c.partOfSpeech)})` : ''}</div>`);

  const ex: string[] = [];
  if (sentence) ex.push(exampleLine(sentence, c.sentenceVi, word));
  for (const e of c.examples) if (e.zh.trim()) ex.push(exampleLine(e.zh, e.vi, word));
  if (ex.length) lines.push(`<br><div>${ex.join('<br>')}</div>`);

  const pats = c.patterns.filter((p) => p.trim());
  if (pats.length) lines.push(`<br><div>${pats.map((p) => escapeHtml(p)).join('<br>')}</div>`);
  if (c.comparison.trim()) lines.push(`<br><div>${escapeHtml(c.comparison).replace(/\n/g, '<br>')}</div>`);
  return lines.join('\n');
}

function exampleLine(zh: string, vi: string, word: string): string {
  return `${boldWord(zh.trim(), word)}${vi.trim() ? ` <span style="color:#888">(${escapeHtml(vi.trim())})</span>` : ''}`;
}
