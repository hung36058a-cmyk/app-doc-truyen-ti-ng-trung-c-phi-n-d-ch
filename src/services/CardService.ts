// services/CardService.ts — Tạo nội dung thẻ Anki bằng AI cho từ đã lưu, và xuất các từ ra file .apkg.

import type { CardContent, SavedWord } from '@/core/types';
import { extractJson, type AiProvider } from '@/modules/ai/AiProvider';
import { cardContentPrompt } from '@/modules/ai/prompts';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { buildApkg, type SqlStatic } from '@/modules/anki/ApkgWriter';
import { cardBackHtml, escapeHtml } from '@/modules/anki/cardHtml';
import { buildAnkiText } from '@/modules/anki/ankiText';
import { mergeHanviet } from './MeaningService';

const MAX_PARALLEL = 3; // số thẻ AI tạo cùng lúc (nhiều quá dễ bị giới hạn lượt gọi)

export class CardService {
  constructor(
    private ai: AiProvider,
    private dict: Dictionary,
    private loadSql: () => Promise<SqlStatic>,
  ) {}

  /** AI tạo nội dung thẻ cho một từ. Pinyin ưu tiên lấy từ từ điển; Hán Việt từ điển thiếu chữ nào thì lấy của AI. */
  async generate(w: SavedWord): Promise<CardContent> {
    const entry = this.dict.lookup(w.word);
    const dictPinyin = w.pinyin || entry?.senses[0]?.pinyin || '';
    const dictHv = w.hanviet || this.dict.hanviet(w.word);
    const text = await this.ai.complete(
      cardContentPrompt({ word: w.word, sentence: w.sentence, pinyin: dictPinyin, english: w.english, hanviet: dictHv }),
      { quality: 'best' },
    );
    const r = extractJson<Partial<Record<keyof CardContent, unknown>>>(text);
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const examples = Array.isArray(r.examples)
      ? r.examples
          .map((e) => ({ zh: typeof e === 'string' ? e.trim() : str((e as { zh?: unknown }).zh), vi: '' }))
          .filter((e) => e.zh)
          .slice(0, 3)
      : [];
    const comparison = Array.isArray(r.comparison) ? r.comparison.map(str).filter(Boolean).join('\n') : str(r.comparison);
    return {
      pinyin: dictPinyin || str(r.pinyin),
      hanviet: mergeHanviet(dictHv, str(r.hanviet).toLowerCase() || undefined),
      vietnamese: str(r.vietnamese) || w.vietnamese,
      english: str(r.english) || w.english,
      partOfSpeech: str(r.partOfSpeech),
      sentenceVi: '',
      examples,
      patterns: Array.isArray(r.patterns) ? r.patterns.map(str).filter(Boolean).slice(0, 3) : [],
      comparison,
      generatedAt: Date.now(),
    };
  }

  /** Tạo thẻ cho nhiều từ, tối đa MAX_PARALLEL cùng lúc. onDone/onError được gọi ngay khi từng từ xong. */
  async generateMany(
    words: SavedWord[],
    onDone: (w: SavedWord, card: CardContent) => void | Promise<void>,
    onError: (w: SavedWord, message: string) => void,
  ): Promise<void> {
    const queue = [...words];
    const worker = async () => {
      for (let w = queue.shift(); w; w = queue.shift()) {
        try {
          await onDone(w, await this.generate(w));
        } catch (e) {
          onError(w, (e as Error).message || 'AI tạo thẻ thất bại.');
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, words.length) }, worker));
  }

  /** File .txt import vào Anki (note type Basic có sẵn của người dùng). */
  exportTxt(words: SavedWord[], deckName: string): Blob {
    const notes = words
      .filter((w) => w.card)
      .map((w) => ({ front: escapeHtml(w.word), back: cardBackHtml(w.word, w.sentence, w.card!) }));
    const text = buildAnkiText(notes, { deckName, tags: ['doc-truyen'] });
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  /** Gói các từ đã có nội dung thẻ thành file .apkg. */
  exportApkg(words: SavedWord[], deckName: string): Promise<Blob> {
    const notes = words
      .filter((w) => w.card)
      .map((w) => ({
        key: w.word,
        front: escapeHtml(w.word),
        back: cardBackHtml(w.word, w.sentence, w.card!),
        tags: ['doc-truyen'],
      }));
    return buildApkg(notes, { deckName }, this.loadSql);
  }
}
