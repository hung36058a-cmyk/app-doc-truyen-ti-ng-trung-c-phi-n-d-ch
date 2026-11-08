// modules/storage/DexieStorage.ts — Lưu trữ bằng IndexedDB (qua thư viện Dexie) ngay trên điện thoại.
// Cài đặt nhỏ lưu ở localStorage. Dữ liệu chỉ nằm trong trình duyệt này.

import Dexie, { type Table } from 'dexie';
import type { AiKey, AppSettings, Book, ReadingProgress, SavedWord, VietMeaning } from '@/core/types';
import type { Storage } from './Storage';

import { DEFAULT_SETTINGS } from '@/core/defaults';
const SETTINGS_KEY = 'doc-truyen:settings';
const LOOKUPS_KEY = 'doc-truyen:looked-up';
/** Giữ tối đa bấy nhiêu từ đã tra gần nhất (đủ cho vài cuốn truyện, vẫn nhẹ). */
const MAX_LOOKUPS = 5000;

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

/** Cài đặt cũ (trước 8/11/2026) có 1 ô key Gemini và 1 ô key Claude: chuyển sang danh sách ưu tiên. */
interface LegacySettings { geminiApiKey?: string; anthropicApiKey?: string }
function migrateKeys(old: LegacySettings): AiKey[] {
  const keys: AiKey[] = [];
  if (old.anthropicApiKey?.trim()) keys.push({ id: 'k-claude', provider: 'claude', label: 'Claude', key: old.anthropicApiKey.trim() });
  if (old.geminiApiKey?.trim()) keys.push({ id: 'k-gemini', provider: 'gemini', label: 'Gemini', key: old.geminiApiKey.trim() });
  return keys;
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
    lookups: {
      list() {
        try {
          return new Set(JSON.parse(localStorage.getItem(LOOKUPS_KEY) ?? '[]') as string[]);
        } catch {
          return new Set();
        }
      },
      add(word) {
        try {
          const list = (JSON.parse(localStorage.getItem(LOOKUPS_KEY) ?? '[]') as string[]).filter((w) => w !== word);
          list.push(word);
          localStorage.setItem(LOOKUPS_KEY, JSON.stringify(list.slice(-MAX_LOOKUPS)));
        } catch {
          /* trình duyệt chặn lưu: chỉ nhớ trong phiên này */
        }
      },
    },
    settings: {
      load() {
        try {
          const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<AppSettings> & LegacySettings;
          // gộp từng tầng để cài đặt mới thêm sau vẫn có giá trị mặc định
          const merged = { ...DEFAULT_SETTINGS, ...saved, reader: { ...DEFAULT_SETTINGS.reader, ...saved.reader } };
          if (!saved.aiKeys) merged.aiKeys = migrateKeys(saved);
          delete (merged as LegacySettings).geminiApiKey;
          delete (merged as LegacySettings).anthropicApiKey;
          return merged;
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
