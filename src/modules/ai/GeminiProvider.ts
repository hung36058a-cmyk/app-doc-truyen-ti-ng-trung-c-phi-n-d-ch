// modules/ai/GeminiProvider.ts — Gọi Google Gemini API bằng MỘT API key (lấy key ở aistudio.google.com).
// Dùng khi app chạy ngoài claude.ai. Mỗi key là một instance; thứ tự ưu tiên giữa các key do ProviderChain lo.
// Mỗi mức chất lượng có danh sách model dự phòng: model không dùng được (bị gỡ, không có quyền) thì thử model sau.
// Google đổi tên model thì chỉ cần sửa bảng MODELS.

import { AiKeyError, type AiProvider, type CompleteOptions } from './AiProvider';

const MODELS: Record<'quick' | 'best', string[]> = {
  // quick: model rẻ (tra từ; chế độ Tiết kiệm dùng cho mọi việc) · best: chế độ Chất lượng cao
  quick: ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'],
  best: ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'],
};
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements AiProvider {
  /** Model gọi thành công gần nhất cho từng mức, để lần sau gọi thẳng. */
  private working: Partial<Record<'quick' | 'best', string>> = {};

  constructor(
    private key: string,
    readonly label = 'Gemini',
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.key.trim().length > 20;
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const quality = opts.quality ?? 'quick';
    const list = [...new Set([this.working[quality], ...MODELS[quality]].filter((m): m is string => !!m))];
    let lastError = 'Gemini không trả lời.';
    for (const model of list) {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        signal: opts.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.key.trim() },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      });
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        if (!text) throw new Error('Gemini trả về rỗng (có thể bị bộ lọc nội dung chặn).');
        this.working[quality] = model;
        opts.onText?.(text);
        return text;
      }
      const body = await res.text().catch(() => '');
      if (res.status === 402) throw new AiKeyError('hết tiền nạp trước (402)', 30 * 60_000);
      if (res.status === 429) throw new AiKeyError('hết lượt (429)');
      if (/API_KEY_INVALID|API key not valid/i.test(body)) throw new AiKeyError('key không đúng', 24 * 3600_000);
      if (res.status === 403 && !/not found|not supported|permission/i.test(body)) throw new AiKeyError('Google từ chối key (403)');
      lastError = `Gemini báo lỗi ${res.status}.`;
      // 404 (model không còn) hoặc lỗi quyền theo model: thử model kế tiếp
    }
    throw new Error(lastError);
  }
}
