// modules/dictionary/Dictionary.ts — Giao diện (interface) cho mọi bộ từ điển offline.
// Module khác chỉ dùng interface này, không biết dữ liệu đến từ CC-CEDICT hay nguồn nào khác.

import type { DictEntry } from '@/core/types';

export interface Dictionary {
  /** Tải dữ liệu (gọi một lần lúc khởi động). */
  load(): Promise<void>;
  /** Từ có trong từ điển không (bộ tách từ dùng hàm này). */
  has(word: string): boolean;
  /** Độ dài từ dài nhất trong từ điển (số ký tự). */
  readonly maxWordLength: number;
  /** Tra một từ; trả null nếu không có. */
  lookup(word: string): DictEntry | null;
  /** Âm Hán Việt của một chuỗi chữ ("?" cho chữ thiếu dữ liệu). */
  hanviet(text: string): string;
}
