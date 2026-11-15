// services/bookScript.ts — Chuyển cả một truyện từ Giản thể sang Phồn thể (tên truyện, tác giả, tên chương,
// mục lục, từng đoạn). Giữ nguyên id truyện và số ký tự, nên vị trí đang đọc vẫn đúng.

import type { Book } from '@/core/types';
import type { ScriptConverter } from '@/modules/convert/ScriptConverter';

/** Lấy một ít chữ đầu truyện để đoán Giản/Phồn. */
function sampleText(book: Book): string {
  let s = book.title;
  for (const ch of book.chapters) {
    for (const p of ch.paragraphs) {
      s += p;
      if (s.length > 20000) return s;
    }
  }
  return s;
}

export async function isSimplifiedBook(book: Book, conv: ScriptConverter): Promise<boolean> {
  await conv.load();
  return conv.looksSimplified(sampleText(book));
}

export async function toTraditionalBook(book: Book, conv: ScriptConverter): Promise<Book> {
  await conv.load();
  const t = (s: string) => conv.toTraditional(s);
  return {
    ...book,
    title: t(book.title),
    author: t(book.author),
    chapters: book.chapters.map((c) => ({ ...c, title: t(c.title), paragraphs: c.paragraphs.map(t) })),
    toc: book.toc.map((i) => ({ ...i, title: t(i.title) })),
  };
}
