// modules/dictionary/CedictDictionary.ts — Từ điển offline: CC-CEDICT (pinyin + nghĩa Anh)
// và Unihan kVietnamese (âm Hán Việt). Dữ liệu là file TSV do scripts/build-data.py tạo ra.

import type { DictEntry, DictSense } from '@/core/types';
import type { Dictionary } from './Dictionary';
import { numberedToMarked } from './pinyin';

export interface CedictSources {
  cedictUrl: string;
  hanvietUrl: string;
}

export class CedictDictionary implements Dictionary {
  private words = new Map<string, DictSense[]>();
  private hv = new Map<string, string>();
  private _max = 1;

  constructor(private sources: CedictSources) {}

  get maxWordLength() {
    return this._max;
  }

  async load(): Promise<void> {
    const [cedict, hanviet] = await Promise.all([
      fetchText(this.sources.cedictUrl),
      fetchText(this.sources.hanvietUrl),
    ]);
    for (const line of cedict.split('\n')) {
      const [word, pinyin, defs] = line.split('\t');
      if (!word || !defs) continue;
      const list = this.words.get(word) ?? [];
      list.push({ pinyin: numberedToMarked(pinyin), english: defs.split(' / ') });
      this.words.set(word, list);
      const len = [...word].length;
      if (len > this._max && len <= 12) this._max = len;
    }
    for (const line of hanviet.split('\n')) {
      const [ch, readings] = line.split('\t');
      if (ch && readings) this.hv.set(ch, readings.split(',')[0]);
    }
  }

  has(word: string): boolean {
    return this.words.has(word);
  }

  lookup(word: string): DictEntry | null {
    const senses = this.words.get(word);
    if (!senses) return null;
    return { word, senses: orderSenses(senses), hanviet: this.hanviet(word) };
  }

  hanviet(text: string): string {
    return [...text].map((ch) => this.hv.get(ch) ?? '?').join(' ');
  }
}

/** Đưa cách đọc thông dụng lên trước: cách đọc viết thường (không phải tên riêng), nhiều nghĩa hơn. */
function orderSenses(senses: DictSense[]): DictSense[] {
  const score = (s: DictSense) =>
    (/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(s.pinyin) ? 100 : 0) +
    (s.english.some((e) => /^(variant of|old variant|surname)/i.test(e)) ? -50 : 0) +
    s.english.length;
  return [...senses].sort((a, b) => score(b) - score(a));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được dữ liệu từ điển (${res.status}).`);
  return res.text();
}
