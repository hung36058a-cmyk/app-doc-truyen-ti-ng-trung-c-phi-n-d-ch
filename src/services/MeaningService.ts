// services/MeaningService.ts — Ghép kết quả tra từ: từ điển offline (ngay lập tức) + nghĩa Việt từ AI (có cache).

import type { AiMode, DictEntry, VietMeaning } from '@/core/types';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { extractJson, type AiProvider } from '@/modules/ai/AiProvider';
import { vietMeaningPrompt } from '@/modules/ai/prompts';
import type { MeaningCache } from '@/modules/storage/Storage';
import { isValidPhrase, validParts } from './phrase';

export class MeaningService {
  constructor(
    private dict: Dictionary,
    private ai: AiProvider,
    private cache: MeaningCache,
  ) {}

  /** Tra offline. Từ không có trong từ điển vẫn trả về entry rỗng để popup hiện được âm Hán Việt. */
  lookup(word: string): DictEntry {
    return this.dict.lookup(word) ?? { word, senses: [], hanviet: this.dict.hanviet(word) };
  }

  /**
   * Nghĩa tiếng Việt theo ngữ cảnh + nhận ra cụm (collocation) chứa từ trong câu.
   * Mỗi bộ (từ, câu) chỉ gọi AI một lần cho mỗi mức; cụm phụ thuộc câu nên cache theo cả câu.
   * mode 'save' = Dịch tự động (Gemini Flash), 'quality' = Dịch nâng cao (Gemini Pro); cache riêng từng mức.
   * exact = true: tra đúng từ này, không mở rộng thành cụm (khi người dùng bấm một từ nhỏ trong cụm).
   */
  async vietnamese(entry: DictEntry, sentence: string, mode: AiMode = 'save', signal?: AbortSignal, exact = false): Promise<VietMeaning> {
    const key = `p2|${mode === 'quality' ? 'pro|' : ''}${exact ? 'x|' : ''}${entry.word}|${sentence}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const hint = entry.senses[0]?.english.slice(0, 4).join('; ') ?? '';
    const text = await this.ai.complete(vietMeaningPrompt(entry.word, sentence, hint, exact), { quality: mode === 'quality' ? 'best' : 'quick', signal });
    const parsed = extractJson<VietMeaning>(text);

    // AI có thể trả cụm sai (không có trong câu / không chứa từ chạm): khi đó coi như không có cụm
    const rawPhrase = String(parsed.phrase ?? '').trim();
    const phrase = !exact && isValidPhrase(rawPhrase, entry.word, sentence) ? rawPhrase : undefined;
    const parts = phrase ? validParts(parsed.parts, phrase) : [];
    const pinyin = String(parsed.pinyin ?? '').trim();
    const value: VietMeaning = {
      meaning: String(parsed.meaning ?? '').trim(),
      partOfSpeech: String(parsed.partOfSpeech ?? '').trim(),
      hanviet: parsed.hanviet ? String(parsed.hanviet).trim().toLowerCase() : undefined,
      phrase,
      pinyin: pinyin || undefined,
      parts: parts.length ? parts : undefined,
    };
    await this.cache.set(key, value);
    return value;
  }
}

/** Hán Việt cuối cùng: dùng từ điển, chỗ nào từ điển thiếu ("?") thì lấy chữ tương ứng AI trả về. */
export function mergeHanviet(dictHv: string, aiHv?: string): string {
  if (!dictHv.includes('?') || !aiHv) return dictHv;
  const a = dictHv.split(' ');
  const b = aiHv.split(/\s+/);
  if (a.length !== b.length) return dictHv;
  return a.map((s, i) => (s === '?' ? b[i] : s)).join(' ');
}
