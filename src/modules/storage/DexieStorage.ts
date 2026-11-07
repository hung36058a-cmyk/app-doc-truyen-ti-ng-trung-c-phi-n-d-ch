// modules/storage/DexieStorage.ts — Lưu trữ bằng IndexedDB (qua thư viện Dexie) ngay trên điện thoại.
// Cài đặt nhỏ lưu ở localStorage. Dữ liệu chỉ nằm trong trình duyệt này.

import Dexie, { type Table } from 'dexie';
import type { AppSettings, Book, ReadingProgress, SavedWord, VietMeaning } from '@/core/types';
import type { Storage } from './Storage';

import { DEFAULT_SETTINGS } from '@/core/defaults';
const SETTINGS_KEY = 'doc-truyen:settings';

class Db extends Dexie {
  books!: Table<Book & { chapterCount: number }, string>;
  progress!: Table<ReadingProgress, string>;
  words!: Table<SavedWord, string>;
  meanings!: Table<{ key: string; value: VietMeaning }, string>;
  translations!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('doc-truyen');
    // Đổi cấu trúc bảng: tăng số version và thêm .version(n).stores(...) mới bên dưới
    this.version(1).stores({
      books: 'id, addedAt',
      progress: 'bookId',
      words: 'word, savedAt, exported, bookId',
      meanings: 'key',
    });
    this.version(2).stores({ translations: 'key' }); // Giai đoạn 2: cache dịch đoạn
  }
}

export function createDexieStorage(): Storage {
  const db = new Db();
  // Xin trình duyệt đừng tự xóa dữ liệu khi máy thiếu dung lượng
  navigator.storage?.persist?.().catch(() => undefined);

  return {
    books: {
      async list() {
        // Không đọc nội dung chương để màn Thư viện mở nhanh
        const rows: Book[] = [];
        await db.books.orderBy('addedAt').reverse().each((b) => rows.push(b));
        return rows.map(({ id, title, author, chapters, addedAt }) => ({
          id, title, author, chapterCount: chapters.length, addedAt,
        }));
      },
      get: (id) => db.books.get(id),
      save: async (book) => { await db.books.put({ ...book, chapterCount: book.chapters.length }); },
      remove: async (id) => {
        await db.books.delete(id);
        await db.progress.delete(id);
      },
    },
    progress: {
      get: (bookId) => db.progress.get(bookId),
      all: () => db.progress.toArray(),
      save: async (p) => { await db.progress.put(p); },
    },
    words: {
      list: () => db.words.orderBy('savedAt').reverse().toArray(),
      get: (word) => db.words.get(word),
      save: async (w) => { await db.words.put(w); },
      remove: (word) => db.words.delete(word),
    },
    meanings: {
      get: async (key) => (await db.meanings.get(key))?.value,
      set: async (key, value) => { await db.meanings.put({ key, value }); },
    },
    translations: {
      get: async (key) => (await db.translations.get(key))?.value,
      set: async (key, value) => { await db.translations.put({ key, value }); },
    },
    settings: {
      load() {
        try {
          const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<AppSettings>;
          // gộp từng tầng để cài đặt mới thêm sau vẫn có giá trị mặc định
          return { ...DEFAULT_SETTINGS, ...saved, reader: { ...DEFAULT_SETTINGS.reader, ...saved.reader } };
        } catch {
          return { ...DEFAULT_SETTINGS, reader: { ...DEFAULT_SETTINGS.reader } };
        }
      },
      save(s) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        } catch {
          /* trình duyệt chặn lưu: cài đặt chỉ giữ trong phiên này */
        }
      },
    },
  };
}
