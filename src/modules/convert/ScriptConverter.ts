// modules/convert/ScriptConverter.ts — Giao diện cho bộ chuyển chữ Giản thể → Phồn thể.
// Module khác chỉ dùng interface này, không biết dữ liệu đến từ OpenCC hay nguồn nào khác.

export interface ScriptConverter {
  /** Tải dữ liệu (chỉ tải lần đầu cần dùng, các lần sau dùng lại). */
  load(): Promise<void>;
  /** Chuyển một đoạn chữ sang Phồn thể. Giữ nguyên số ký tự, nên vị trí đọc và vị trí câu không bị lệch. */
  toTraditional(text: string): string;
  /** Đoán đoạn chữ có phải Giản thể không (dựa trên tỉ lệ chữ chỉ có ở Giản thể). */
  looksSimplified(text: string): boolean;
}
