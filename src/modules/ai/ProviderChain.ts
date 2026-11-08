// modules/ai/ProviderChain.ts — Chọn nhà cung cấp AI đầu tiên dùng được trong danh sách.

import { AiUnavailableError, type AiProvider, type CompleteOptions } from './AiProvider';

export class ProviderChain implements AiProvider {
  constructor(private providers: AiProvider[]) {}

  get label() {
    return this.providers.map((p) => p.label).join(' / ');
  }

  async active(): Promise<AiProvider | null> {
    for (const p of this.providers) if (await p.isAvailable()) return p;
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.active()) !== null;
  }

  async complete(prompt: string, opts?: CompleteOptions): Promise<string> {
    const p = await this.active();
    if (!p) throw new AiUnavailableError('Chưa có AI: nhập Gemini hoặc Claude API key trong Cài đặt.');
    return p.complete(prompt, opts);
  }
}
