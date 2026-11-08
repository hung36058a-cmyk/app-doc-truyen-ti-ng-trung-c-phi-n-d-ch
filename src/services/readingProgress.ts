// services/readingProgress.ts — Tính vị trí đọc kiểu Moon Reader: trang thứ mấy trong chương (1 trang = 1 màn hình)
// và phần trăm đã đọc của cả cuốn (theo số chữ của các chương).

import type { Chapter } from '@/core/types';

export interface ScrollBox {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ChapterPosition {
  page: number; // trang hiện tại trong chương, từ 1
  pages: number; // tổng số trang của chương
  fraction: number; // đã đọc bao nhiêu phần của chương, 0..1
}

/** Vị trí trong chương từ thanh cuộn. `extraBottom` = phần đệm thêm ở cuối (khi khung tra từ mở), không tính vào chương. */
export function chapterPosition(box: ScrollBox, extraBottom = 0): ChapterPosition {
  const view = Math.max(1, box.clientHeight);
  const height = Math.max(view, box.scrollHeight - extraBottom);
  const maxScroll = height - view;
  const top = Math.min(Math.max(0, box.scrollTop), maxScroll);
  const pages = Math.max(1, Math.ceil(height / view - 0.05)); // bỏ qua phần lẻ rất nhỏ ở cuối
  const fraction = maxScroll <= 0 ? 1 : top / maxScroll;
  const page = maxScroll <= 0 ? 1 : Math.min(pages, fraction >= 0.999 ? pages : Math.floor(top / view) + 1);
  return { page, pages, fraction };
}

/** Độ dài (số chữ) của từng chương, dùng làm "trọng số" khi tính phần trăm cả cuốn. */
export function chapterLengths(chapters: Chapter[]): number[] {
  return chapters.map((c) => Math.max(1, c.paragraphs.reduce((n, p) => n + p.length, 0)));
}

/** Phần trăm đã đọc của cả cuốn (0..100). */
export function bookPercent(lengths: number[], chapter: number, fraction: number): number {
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const before = lengths.slice(0, chapter).reduce((a, b) => a + b, 0);
  return ((before + fraction * (lengths[chapter] ?? 0)) / total) * 100;
}
