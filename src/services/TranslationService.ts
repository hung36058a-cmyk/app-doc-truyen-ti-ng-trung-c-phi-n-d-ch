// services/TranslationService.ts — Dịch câu / đoạn bằng AI. Hai mức: "Dịch tự động" (model nhanh) và
// "Dịch nâng cao" (model mạnh). Mỗi đoạn chỉ dịch một lần cho mỗi ngôn ngữ và mỗi mức (có cache riêng).

import type { AiMode, MeaningLang } from '@/core/types';
import type { AiProvider } from '@/modules/ai/AiProvider';
import { parseSentenceReply, translateParagraphPrompt, translateSentencePrompt } from '@/modules/ai/prompts';
import type { TranslationCache } from '@/modules/storage/Storage';

/** Khóa cache: giữ nguyên dạng cũ cho Dịch tự động để không mất bản dịch đã có. */
const tier = (mode: AiMode) => (mode === 'quality' ? 'pro|' : '');
const quality = (mode: AiMode) => (mode === 'quality' ? ('best' as const) : ('quick' as const));

export class TranslationService {
  constructor(
    private ai: AiProvider,
    private cache: TranslationCache,
  ) {}

  /** Bản dịch đã có sẵn trong cache (không gọi AI). */
  cached(paragraph: string, target: MeaningLang, mode: AiMode = 'save'): Promise<string | undefined> {
    return this.cache.get(`${target}|${tier(mode)}${paragraph}`);
  }

  /** previous = đoạn ngay trước, giúp AI dịch đúng đại từ và xưng hô. */
  async translate(
    paragraph: string,
    target: MeaningLang,
    previous: string,
    mode: AiMode,
    onText?: (textSoFar: string) => void,
  ): Promise<string> {
    const key = `${target}|${tier(mode)}${paragraph}`;
    const hit = await this.cache.get(key);
    if (hit) return hit;
    const text = (
      await this.ai.complete(translateParagraphPrompt(paragraph, target, previous.slice(-300)), {
        quality: quality(mode),
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
    mode: AiMode,
    onText?: (partial: { hanviet: string; translation: string }) => void,
  ): Promise<{ hanviet: string; translation: string }> {
    const key = `${target}|hv|${tier(mode)}${sentence}`;
    const hit = await this.cache.get(key);
    if (hit) return parseSentenceReply(hit);
    const raw = (
      await this.ai.complete(translateSentencePrompt(sentence, target, context.slice(-300)), {
        quality: quality(mode),
        onText: onText ? (t) => onText(parseSentenceReply(t)) : undefined,
      })
    ).trim();
    const parsed = parseSentenceReply(raw);
    if (parsed.translation) await this.cache.set(key, raw);
    return parsed;
  }
}
