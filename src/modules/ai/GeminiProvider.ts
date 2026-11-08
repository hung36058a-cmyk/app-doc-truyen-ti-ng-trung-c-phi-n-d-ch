// modules/ai/GeminiProvider.ts — Gọi Google Gemini API bằng API key của người dùng (có gói miễn phí,
// lấy key ở aistudio.google.com). Dùng khi app chạy ngoài claude.ai.
// Mỗi mức chất lượng có danh sách model dự phòng: model đầu không dùng được (bị gỡ, key không có quyền)
// thì tự thử model kế tiếp. Google đổi tên model thì chỉ cần sửa bảng MODELS.

import type { AiProvider, CompleteOptions } from './AiProvider';

const MODELS: Record<'quick' | 'best', string[]> = {
  quick: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-lite-latest'],
  best: ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'],
};
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements AiProvider {
  readonly label = 'Gemini (API key riêng)';
  /** Model đã gọi thành công gần nhất cho từng mức, để lần sau gọi thẳng. */
  private working: Partial<Record<'quick' | 'best', string>> = {};

  constructor(private getKey: () => string) {}

  async isAvailable(): Promise<boolean> {
    return this.getKey().trim().length > 20;
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const quality = opts.quality ?? 'quick';
    const list = this.working[quality] ? [this.working[quality]!, ...MODELS[quality]] : MODELS[quality];
    let lastError = 'Gemini không trả lời.';
    for (const model of [...new Set(list)]) {
      const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        signal: opts.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.getKey().trim() },
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
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        const body = await res.text();
        if (/API_KEY_INVALID|API key not valid/i.test(body)) throw new Error('Gemini API key không đúng.');
        if (res.status === 403 && !/not found|not supported|permission/i.test(body)) throw new Error('Gemini từ chối key này.');
      }
      if (res.status === 429) throw new Error('Đã hết lượt miễn phí của Gemini, thử lại sau ít phút hoặc ngày mai.');
      lastError = `Gemini báo lỗi ${res.status}.`;
      // 404 (model không còn) hoặc lỗi quyền theo model: thử model kế tiếp
    }
    throw new Error(lastError);
  }
}
