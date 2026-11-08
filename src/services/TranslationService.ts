// services/TranslationService.ts — Dịch nguyên đoạn bằng AI. Mỗi đoạn chỉ dịch một lần cho mỗi ngôn ngữ (có cache).

import type { MeaningLang } from '@/core/types';
import type { AiProvider } from '@/modules/ai/AiProvider';
import { parseSentenceReply, translateParagraphPrompt, translateSentencePrompt } from '@/modules/ai/prompts';
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

  /** Dịch một câu kèm âm Hán Việt cả câu do AI viết. onText nhận kết quả đang viết dở (đã tách 2 phần). */
  async translateSentence(
    sentence: string,
    target: MeaningLang,
    context: string,
    onText?: (partial: { hanviet: string; translation: string }) => void,
  ): Promise<{ hanviet: string; translation: string }> {
    const key = `${target}|hv|${sentence}`;
    const hit = await this.cache.get(key);
    if (hit) return parseSentenceReply(hit);
    const raw = (
      await this.ai.complete(translateSentencePrompt(sentence, target, context.slice(-300)), {
        quality: 'best',
        onText: onText ? (t) => onText(parseSentenceReply(t)) : undefined,
      })
    ).trim();
    const parsed = parseSentenceReply(raw);
    if (parsed.translation) await this.cache.set(key, raw);
    return parsed;
  }
}
