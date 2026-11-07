// services/TranslationService.ts — Dịch nguyên đoạn bằng AI. Mỗi đoạn chỉ dịch một lần cho mỗi ngôn ngữ (có cache).

import type { MeaningLang } from '@/core/types';
import type { AiProvider } from '@/modules/ai/AiProvider';
import { translateParagraphPrompt } from '@/modules/ai/prompts';
import type { TranslationCache } from '@/modules/storage/Storage';

export class TranslationService {
  constructor(
    private ai: AiProvider,
    private cache: TranslationCache,
  ) {}

  /** Bản dịch đã có sẵn trong cache (không gọi AI). */
  cached(paragraph: string, target: MeaningLang): Promise<string | undefined> {
    return this.cache.get(`${target}|${paragraph}`);
  }

  /** previous = đoạn ngay trước, giúp AI dịch đúng đại từ và xưng hô. */
  async translate(
    paragraph: string,
    target: MeaningLang,
    previous: string,
    onText?: (textSoFar: string) => void,
  ): Promise<string> {
    const key = `${target}|${paragraph}`;
    const hit = await this.cache.get(key);
    if (hit) return hit;
    const text = (
      await this.ai.complete(translateParagraphPrompt(paragraph, target, previous.slice(-300)), {
        quality: 'best',
        onText,
      })
    ).trim();
    if (text) await this.cache.set(key, text);
    return text;
  }
}
