// modules/dictionary/CedictDictionary.ts — Từ điển offline: CC-CEDICT (pinyin + nghĩa Anh),
// CVDICT (nghĩa Việt, cột 4) và hanviet-pinyin-wordlist (âm Hán Việt theo từng cách đọc pinyin,
// tổng hợp từ Thiều Chửu, Trần Văn Chánh…). Xem scripts/build-hanviet.py.
// Dữ liệu là file TSV do scripts/build-data.py rồi scripts/build-cvdict.py tạo ra.

import type { DictEntry, DictSense } from '@/core/types';
import type { Dictionary } from './Dictionary';
import { numberedToMarked } from './pinyin';

export interface CedictSources {
  cedictUrl: string;
  hanvietUrl: string;
}

export class CedictDictionary implements Dictionary {
  private words = new Map<string, DictSense[]>();
  /** chữ -> các cách đọc: pinyin số (vd "zhong4", "*" = mọi cách đọc) và âm Hán Việt tương ứng */
  private hv = new Map<string, { py: string; hv: string }[]>();
  /** pinyin số gốc của từng nghĩa, để chọn đúng âm Hán Việt (樂 le4 = lạc, yue4 = nhạc) */
  private rawPinyin = new WeakMap<DictSense, string>();
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
      const [word, pinyin, en = '', vi = ''] = line.split('\t');
      if (!word || (!en && !vi)) continue;
      const list = this.words.get(word) ?? [];
      const sense: DictSense = { pinyin: numberedToMarked(pinyin), english: en ? en.split(' / ') : [], vietnamese: vi ? vi.split(' / ') : [] };
      this.rawPinyin.set(sense, pinyin);
      list.push(sense);
      this.words.set(word, list);
      const len = [...word].length;
      if (len > this._max && len <= 12) this._max = len;
    }
    for (const line of hanviet.split('\n')) {
      const [ch, py, readings] = line.split('\t');
      if (!ch || !readings) continue;
      const list = this.hv.get(ch) ?? [];
      list.push({ py: py.toLowerCase(), hv: readings.split(',')[0] });
      this.hv.set(ch, list);
    }
  }

  has(word: string): boolean {
    return this.words.has(word);
  }

  lookup(word: string): DictEntry | null {
    const senses = this.words.get(word);
    if (!senses) return null;
    const ordered = orderSenses(senses);
    return { word, senses: ordered, hanviet: this.hanviet(word, this.rawPinyin.get(ordered[0])) };
  }

  hanviet(text: string, pinyin?: string): string {
    const chars = [...text];
    const syl = pinyin ? pinyin.toLowerCase().split(/\s+/) : [];
    const useSyl = syl.length === chars.length;
    // không có pinyin của cả cụm (cụm AI ghép, tên riêng…) → dùng cách đọc thông dụng nhất của từng chữ
    return chars.map((ch, i) => pickReading(this.hv.get(ch), useSyl ? syl[i] : this.commonPinyin(ch))).join(' ');
  }

  private commonPinyin(ch: string): string | undefined {
    const senses = this.words.get(ch);
    return senses ? this.rawPinyin.get(orderSenses(senses)[0])?.toLowerCase() : undefined;
  }
}

/** Chọn âm Hán Việt khớp pinyin: đúng cả thanh điệu → đúng vần (bỏ thanh) → dòng "*" → âm đầu tiên. */
function pickReading(list: { py: string; hv: string }[] | undefined, syl?: string): string {
  if (!list?.length) return '?';
  if (syl) {
    const exact = list.find((r) => r.py === syl);
    if (exact) return exact.hv;
    const base = syl.replace(/\d$/, '');
    const loose = list.find((r) => r.py.replace(/\d$/, '') === base);
    if (loose) return loose.hv;
  }
  return (list.find((r) => r.py === '*') ?? list[0]).hv;
}

/** Đưa cách đọc thông dụng lên trước: cách đọc viết thường (không phải tên riêng), nhiều nghĩa hơn. */
function orderSenses(senses: DictSense[]): DictSense[] {
  const score = (s: DictSense) =>
    (/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/.test(s.pinyin) ? 100 : 0) +
    (s.english.some((e) => /^(variant of|old variant|surname)/i.test(e)) ? -50 : 0) +
    (s.english.length === 0 ? -20 : 0) +
    Math.max(s.english.length, s.vietnamese.length);
  return [...senses].sort((a, b) => score(b) - score(a));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được dữ liệu từ điển (${res.status}).`);
  return res.text();
}
