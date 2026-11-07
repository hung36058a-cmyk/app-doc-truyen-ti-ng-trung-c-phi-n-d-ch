// modules/ai/AnthropicApiProvider.ts — Gọi thẳng Claude API bằng API key của người dùng.
// Dùng khi app chạy ngoài claude.ai (tự host, ví dụ GitHub Pages).
// Lưu ý: trang artifact trên claude.ai chặn kết nối ra ngoài, nên ở đó adapter này không chạy được.

import type { AiProvider, CompleteOptions } from './AiProvider';

const MODELS = { quick: 'claude-haiku-5-5', best: 'claude-sonnet-5-5' } as const;

export class AnthropicApiProvider implements AiProvider {
  readonly label = 'Claude API (API key riêng)';

  constructor(private getKey: () => string) {}

  async isAvailable(): Promise<boolean> {
    return this.getKey().trim().startsWith('sk-ant-');
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.getKey().trim(),
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
      if (res.status === 401) throw new Error('API key không đúng.');
      throw new Error(`Claude API báo lỗi ${res.status}.`);
    }
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.map((c) => c.text ?? '').join('');
  }
}
