// services/MeaningService.ts — Ghép kết quả tra từ: từ điển offline (ngay lập tức) + nghĩa Việt từ AI.
// "Từ điển riêng" tự lớn dần: mỗi từ / cụm AI đã giải nghĩa được lưu vĩnh viễn trên máy (IndexedDB).
// Lần sau chạm lại từ đó (ở BẤT KỲ câu nào) thì hiện ngay, không gọi AI. Muốn nghĩa sát câu hơn: bật "Nâng cao".
//
// Khóa trong cache:
//   w|<mức>|<từ>     nghĩa của một từ đơn (không có cụm)
//   ph|<mức>|<cụm>   nghĩa của một cụm + các từ nhỏ trong cụm
//   syn|<từ>         3 từ đồng nghĩa của từ / cụm (trường synonyms)
//   <từ>|  pro|<từ>| khóa cũ (bản 2.7 trở về trước), vẫn đọc để không mất các từ đã tra
// <mức> = 'auto' (Dịch tự động) hoặc 'pro' (Dịch nâng cao). Dịch tự động dùng luôn kết quả Nâng cao nếu đã có.

import type { AiMode, DictEntry, PhrasePart, VietMeaning } from '@/core/types';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { extractJson, type AiProvider } from '@/modules/ai/AiProvider';
import { synonymsPrompt, vietMeaningPrompt } from '@/modules/ai/prompts';
import type { MeaningCache } from '@/modules/storage/Storage';
import { cleanPhrase, knownPhraseIn, validParts } from './phrase';

const tier = (m: AiMode) => (m === 'quality' ? 'pro' : 'auto');

export class MeaningService {
  /** Các cụm đã biết, theo mức (nạp một lần từ IndexedDB). */
  private phrases: Record<'auto' | 'pro', Set<string>> | null = null;
  private loading: Promise<void> | null = null;

  constructor(
    private dict: Dictionary,
    private ai: AiProvider,
    private cache: MeaningCache,
  ) {}

  /** Tra offline. Từ không có trong từ điển vẫn trả về entry rỗng để popup hiện được âm Hán Việt. */
  lookup(word: string): DictEntry {
    return this.dict.lookup(word) ?? { word, senses: [], hanviet: this.dict.hanviet(word) };
  }

  private async loadPhrases() {
    if (this.phrases) return;
    this.loading ??= (async () => {
      const [auto, pro] = await Promise.all([this.cache.keys('ph|auto|'), this.cache.keys('ph|pro|')]);
      this.phrases = {
        auto: new Set(auto.map((k) => k.slice('ph|auto|'.length))),
        pro: new Set(pro.map((k) => k.slice('ph|pro|'.length))),
      };
    })();
    await this.loading;
  }

  /** Các cụm đã có trong từ điển riêng mà câu này chứa (để hiện bong bóng cụm trong khung dịch câu). */
  async knownPhrasesIn(sentence: string): Promise<string[]> {
    await this.loadPhrases();
    return [...new Set([...this.phrases!.pro, ...this.phrases!.auto])].filter((p) => sentence.includes(p));
  }

  /** Tìm trong từ điển riêng: cụm đã biết có trong câu, rồi tới nghĩa từ đơn. Không có thì trả undefined. */
  private async fromMemory(word: string, sentence: string, mode: AiMode, exact: boolean): Promise<VietMeaning | undefined> {
    await this.loadPhrases();
    // Dịch tự động: dùng cả kết quả Nâng cao nếu có (tốt hơn). Nâng cao: chỉ dùng kết quả Nâng cao.
    const tiers: ('pro' | 'auto')[] = mode === 'quality' ? ['pro'] : ['pro', 'auto'];
    if (!exact) {
      // chính từ này là một cụm đã biết (vd bấm bong bóng cụm trong khung dịch câu)
      for (const t of tiers) {
        const hit = await this.cache.get(`ph|${t}|${word}`);
        if (hit) return { ...hit, phrase: undefined };
      }
      for (const t of tiers) {
        const p = knownPhraseIn(this.phrases![t], word, sentence);
        const hit = p ? await this.cache.get(`ph|${t}|${p}`) : undefined;
        if (hit) return hit;
      }
    }
    for (const t of tiers) {
      const hit = (await this.cache.get(`w|${t}|${word}`)) ?? (await this.cache.get(`${t === 'pro' ? 'pro|' : ''}${word}|`));
      if (hit) {
        const parts = validParts(hit.parts, word); // chỉ giữ từ nhỏ của chính từ này (cụm tra trực tiếp)
        return { ...hit, phrase: undefined, parts: parts.length ? parts : undefined };
      }
    }
    return undefined;
  }

  /**
   * Nghĩa tiếng Việt theo ngữ cảnh + nhận ra cụm (collocation) chứa từ trong câu.
   * Có trong từ điển riêng thì trả ngay; không có mới gọi AI rồi lưu lại.
   * exact = true: tra đúng từ này, không mở rộng thành cụm (khi người dùng bấm một từ nhỏ trong cụm).
   */
  async vietnamese(entry: DictEntry, sentence: string, mode: AiMode = 'save', signal?: AbortSignal, exact = false): Promise<VietMeaning> {
    const word = entry.word;
    const remembered = await this.fromMemory(word, sentence, mode, exact);
    if (remembered) return remembered;

    const hint = entry.senses[0]?.english.slice(0, 4).join('; ') ?? '';
    const text = await this.ai.complete(vietMeaningPrompt(word, sentence, hint, exact), { quality: mode === 'quality' ? 'best' : 'quick', signal });
    const parsed = extractJson<VietMeaning>(text);

    // AI có thể trả cụm sai (không có trong câu / dính phó từ): làm gọn, sai hẳn thì coi như không có cụm
    const phrase = exact ? '' : cleanPhrase(String(parsed.phrase ?? ''), word, sentence);
    // không mở rộng thành cụm nhưng bản thân từ gồm nhiều từ nhỏ (vd bấm bong bóng cụm): vẫn giữ các từ nhỏ
    const parts = phrase ? validParts(parsed.parts, phrase) : exact ? [] : validParts(parsed.parts, word);
    const pinyin = String(parsed.pinyin ?? '').trim();
    const value: VietMeaning = {
      meaning: String(parsed.meaning ?? '').trim(),
      partOfSpeech: String(parsed.partOfSpeech ?? '').trim(),
      hanviet: parsed.hanviet ? String(parsed.hanviet).trim().toLowerCase() : undefined,
      phrase: phrase || undefined,
      pinyin: pinyin || undefined,
      parts: parts.length ? parts : undefined,
    };
    const t = tier(mode);
    if (phrase) {
      // cụm đã làm gọn mà AI không chia được từ nhỏ khớp: Hán Việt/pinyin có thể lệch, bỏ đi cho chắc
      if (phrase !== String(parsed.phrase ?? '').trim()) { value.hanviet = undefined; value.pinyin = undefined; }
      await this.cache.set(`ph|${t}|${phrase}`, value);
      this.phrases?.[t].add(phrase);
      // nghĩa riêng của từ vừa chạm (lấy từ phần "parts") cũng vào từ điển riêng
      const own = parts.find((x) => x.text === word);
      if (own?.meaning) await this.cache.set(`w|${t}|${word}`, { meaning: own.meaning, partOfSpeech: own.pos ?? '' });
    } else if (parts.length) {
      // bản thân từ là một cụm (bấm bong bóng cụm): lưu như cụm để lần sau chạm từ nhỏ trong cụm cũng nhận ra
      await this.cache.set(`ph|${t}|${word}`, value);
      this.phrases?.[t].add(word);
    } else {
      await this.cache.set(`w|${t}|${word}`, value);
    }
    return value;
  }

  /** 3 từ đồng nghĩa / gần nghĩa. Đã hỏi AI một lần thì lưu lại, lần sau hiện ngay. */
  async synonyms(word: string, meaning: string, sentence: string, signal?: AbortSignal): Promise<PhrasePart[]> {
    const key = `syn|${word}`;
    const hit = await this.cache.get(key);
    if (hit?.synonyms) return hit.synonyms;
    const text = await this.ai.complete(synonymsPrompt(word, meaning, sentence), { quality: 'quick', signal });
    const raw = extractJson<unknown>(text);
    const list = (Array.isArray(raw) ? raw : []) as Partial<PhrasePart>[];
    const seen = new Set([word]);
    const out: PhrasePart[] = [];
    for (const x of list) {
      const t = String(x.text ?? '').trim();
      if (!t || seen.has(t) || !/\p{Script=Han}/u.test(t)) continue;
      seen.add(t);
      out.push({ text: t, pos: String(x.pos ?? '').trim() || undefined, meaning: String(x.meaning ?? '').trim() });
      if (out.length === 3) break;
    }
    if (out.length) await this.cache.set(key, { meaning: '', partOfSpeech: '', synonyms: out });
    return out;
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
