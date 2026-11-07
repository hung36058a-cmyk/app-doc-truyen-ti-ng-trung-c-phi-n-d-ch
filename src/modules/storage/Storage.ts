// modules/storage/Storage.ts — Giao diện lưu trữ. Giao diện người dùng và logic chỉ dùng các interface này;
// cách lưu thật (IndexedDB, server...) nằm trong file implementation riêng.

import type { AppSettings, Book, BookSummary, ReadingProgress, SavedWord, VietMeaning } from '@/core/types';

export interface BookRepo {
  list(): Promise<BookSummary[]>;
  get(id: string): Promise<Book | undefined>;
  save(book: Book): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ProgressRepo {
  get(bookId: string): Promise<ReadingProgress | undefined>;
  all(): Promise<ReadingProgress[]>;
  save(p: ReadingProgress): Promise<void>;
}

export interface WordRepo {
  list(): Promise<SavedWord[]>;
  get(word: string): Promise<SavedWord | undefined>;
  save(w: SavedWord): Promise<void>;
  remove(word: string): Promise<void>;
}

/** Cache câu trả lời của AI, khóa = từ + ngữ cảnh. */
export interface MeaningCache {
  get(key: string): Promise<VietMeaning | undefined>;
  set(key: string, value: VietMeaning): Promise<void>;
}

/** Cache bản dịch đoạn văn, khóa = ngôn ngữ đích + nội dung đoạn. */
export interface TranslationCache {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface SettingsRepo {
  load(): AppSettings;
  save(s: AppSettings): void;
}

export interface Storage {
  books: BookRepo;
  progress: ProgressRepo;
  words: WordRepo;
  meanings: MeaningCache;
  translations: TranslationCache;
  settings: SettingsRepo;
}
