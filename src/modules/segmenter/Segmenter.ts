// modules/segmenter/Segmenter.ts — Giao diện bộ tách từ (tiếng Trung không có dấu cách giữa các từ).

import type { Token } from '@/core/types';

export interface Segmenter {
  segment(text: string): Token[];
}

/** Ký tự Hán (gồm cả mở rộng A và các khối ngoài BMP). */
export const HAN = /\p{Script=Han}/u;
