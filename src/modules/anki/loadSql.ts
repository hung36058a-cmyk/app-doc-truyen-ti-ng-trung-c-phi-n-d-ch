// modules/anki/loadSql.ts — Tải sql.js (SQLite chạy bằng JavaScript) chỉ khi người dùng bấm Xuất.
// Dùng bản asm.js (không cần WebAssembly) từ CDN jsDelivr, chạy được cả trên claude.ai lẫn khi tự host.

import type { SqlStatic } from './ApkgWriter';

const SQLJS_URL = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-asm.js';

declare global {
  interface Window {
    initSqlJs?: (config?: object) => Promise<SqlStatic>;
  }
}

let pending: Promise<SqlStatic> | null = null;

export function loadSqlJs(): Promise<SqlStatic> {
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      if (window.initSqlJs) return resolve();
      const s = document.createElement('script');
      s.src = SQLJS_URL;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Không tải được bộ tạo file Anki. Kiểm tra mạng rồi thử lại.'));
      document.head.appendChild(s);
    })
      .then(() => window.initSqlJs!())
      .catch((e) => {
        pending = null; // cho phép thử lại
        throw e;
      });
  }
  return pending;
}
