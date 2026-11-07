// modules/ai/ClaudeArtifactProvider.ts — Gọi Claude qua runtime của artifact trên claude.ai
// (window.claude.use("sample")). Không cần API key; dùng hạn mức tài khoản Claude của người xem.
// Chỉ chạy khi app được mở dưới dạng artifact trên claude.ai.

import type { AiProvider, CompleteOptions } from './AiProvider';

type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) | null;

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

export class ClaudeArtifactProvider implements AiProvider {
  readonly label = 'Claude (tài khoản claude.ai)';
  private sample: Promise<SampleFn> | null = null;

  private get(): Promise<SampleFn> {
    if (!this.sample) {
      this.sample = window.claude?.use
        ? (window.claude.use('sample') as Promise<SampleFn>).catch(() => null)
        : Promise.resolve(null);
    }
    return this.sample;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.get()) !== null;
  }

  async complete(prompt: string, opts: CompleteOptions = {}): Promise<string> {
    const sample = await this.get();
    if (!sample) throw new Error('Claude không khả dụng ở đây.');
    try {
      const res = await sample(prompt, {
        modelTier: opts.quality === 'best' ? 'default' : 'quick',
        signal: opts.signal,
        onText: opts.onText ? (u: { text: string }) => opts.onText!(u.text) : undefined,
      });
      return res.text;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'not_granted') throw new Error('Bạn chưa cho phép app dùng Claude.');
      if (err.code === 'rate_limited') throw new Error('Claude đang giới hạn lượt gọi, thử lại sau ít phút.');
      throw new Error(err.message ?? 'Gọi Claude thất bại.');
    }
  }
}
