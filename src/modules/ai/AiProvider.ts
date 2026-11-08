// modules/ai/AiProvider.ts — Giao diện cho mọi nhà cung cấp AI.
// Muốn thêm nhà cung cấp mới (Gemini, OpenAI...): viết class implements AiProvider,
// rồi thêm vào danh sách trong services/container.ts. Không phải sửa chỗ nào khác.

export interface AiProvider {
  /** Tên hiển thị trong Cài đặt. */
  readonly label: string;
  /** Nhà cung cấp dùng được ở môi trường hiện tại không. */
  isAvailable(): Promise<boolean>;
  /** Gửi prompt, nhận lại văn bản. onText (nếu nhà cung cấp hỗ trợ) nhận toàn bộ chữ đã có tới lúc đó. */
  complete(prompt: string, opts?: CompleteOptions): Promise<string>;
}

export interface CompleteOptions {
  quality?: 'quick' | 'best';
  signal?: AbortSignal;
  onText?: (textSoFar: string) => void;
}

export class AiUnavailableError extends Error {}

/**
 * Lỗi do KEY (hết lượt miễn phí, hết tiền nạp, key sai) chứ không do yêu cầu.
 * ProviderChain gặp lỗi này thì thử key kế tiếp trong danh sách ưu tiên.
 */
export class AiKeyError extends Error {
  constructor(message: string, readonly cooldownMs = 10 * 60_000) {
    super(message);
  }
}

/** Lấy JSON từ câu trả lời của AI (AI đôi khi bọc JSON trong ```json). */
export function extractJson<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start === -1 || end < start) throw new Error('AI không trả về JSON.');
  return JSON.parse(text.slice(start, end + 1)) as T;
}
