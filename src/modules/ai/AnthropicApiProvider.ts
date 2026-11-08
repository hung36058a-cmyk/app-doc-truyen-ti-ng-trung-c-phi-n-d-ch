// modules/ai/AnthropicApiProvider.ts — Gọi thẳng Claude API bằng MỘT API key của người dùng.
// Dùng khi app chạy ngoài claude.ai (tự host, ví dụ GitHub Pages).
// Lưu ý: trang artifact trên claude.ai chặn kết nối ra ngoài, nên ở đó adapter này không chạy được.

import { AiKeyError, type AiProvider, type CompleteOptions } from './AiProvider';

const MODELS = { quick: 'claude-haiku-5-5', best: 'claude-sonnet-5-5' } as const;

export class AnthropicApiProvider implements AiProvider {
  constructor(
    private key: string,
    readonly label = 'Claude',
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.key.trim().startsWith('sk-ant-');
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.key.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODELS[opts.quality ?? 'quick'],
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 401) throw new AiKeyError('key không đúng', 24 * 3600_000);
      if (res.status === 429) throw new AiKeyError('hết lượt (429)');
      if (/credit balance/i.test(body)) throw new AiKeyError('hết tiền nạp', 30 * 60_000);
      throw new Error(`Claude API báo lỗi ${res.status}.`);
    }
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.map((c) => c.text ?? '').join('');
  }
}
