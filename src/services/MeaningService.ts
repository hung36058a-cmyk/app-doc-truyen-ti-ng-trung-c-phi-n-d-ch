// services/MeaningService.ts — Ghép kết quả tra từ: từ điển offline (ngay lập tức) + nghĩa Việt từ AI (có cache).

import type { AiMode, DictEntry, VietMeaning } from '@/core/types';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { extractJson, type AiProvider } from '@/modules/ai/AiProvider';
import { vietMeaningPrompt } from '@/modules/ai/prompts';
import type { MeaningCache } from '@/modules/storage/Storage';

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
   * Nghĩa tiếng Việt theo ngữ cảnh. Mỗi cặp (từ, câu) chỉ gọi AI một lần cho mỗi mức.
   * mode 'save' = Dịch tự động (Gemini Flash), 'quality' = Dịch nâng cao (Gemini Pro); cache riêng từng mức.
   */
  async vietnamese(entry: DictEntry, sentence: string, mode: AiMode = 'save', signal?: AbortSignal): Promise<VietMeaning> {
    const pro = mode === 'quality' ? 'pro|' : ''; // khóa cũ giữ nguyên cho Dịch tự động
    const key = `${pro}${entry.word}|${sentence}`;
    const cached = (await this.cache.get(key)) ?? (await this.cache.get(`${pro}${entry.word}|`));
    if (cached) return cached;

    const hint = entry.senses[0]?.english.slice(0, 4).join('; ') ?? '';
    const text = await this.ai.complete(vietMeaningPrompt(entry.word, sentence, hint), { quality: mode === 'quality' ? 'best' : 'quick', signal });
    const parsed = extractJson<VietMeaning>(text);
    const value: VietMeaning = {
      meaning: String(parsed.meaning ?? '').trim(),
      partOfSpeech: String(parsed.partOfSpeech ?? '').trim(),
      hanviet: parsed.hanviet ? String(parsed.hanviet).trim().toLowerCase() : undefined,
    };
    await this.cache.set(key, value);
    await this.cache.set(`${pro}${entry.word}|`, value); // bản dự phòng không phụ thuộc câu
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
