// modules/dictionary/CedictDictionary.ts — Từ điển offline: CC-CEDICT (pinyin + nghĩa Anh),
// CVDICT (nghĩa Việt, cột 4) và âm Hán Việt THEO PINYIN (gói hanviet-pinyin-words, MIT).
// Dữ liệu là file TSV do scripts/build-data.py, scripts/build-cvdict.py, scripts/build-hanviet.py tạo ra.
// Hán Việt chọn theo pinyin của từ: 行 trong 銀行 (háng) = "hàng", trong 行走 (xíng) = "hành".

import type { DictEntry, DictSense } from '@/core/types';
import type { Dictionary } from './Dictionary';
import { numberedToMarked } from './pinyin';

export interface CedictSources {
  cedictUrl: string;
  hanvietUrl: string;
}

export class CedictDictionary implements Dictionary {
  private words = new Map<string, DictSense[]>();
  /** pinyin dạng số của từng nghĩa, cùng thứ tự với words (để chọn âm Hán Việt đúng cách đọc) */
  private rawPinyin = new Map<string, string[]>();
  /** chữ -> (pinyin số viết thường | "*") -> âm Hán Việt, âm đầu là âm chính */
  private hv = new Map<string, Map<string, string[]>>();
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
      list.push({ pinyin: numberedToMarked(pinyin), english: en ? en.split(' / ') : [], vietnamese: vi ? vi.split(' / ') : [] });
      this.words.set(word, list);
      const raws = this.rawPinyin.get(word) ?? [];
      raws.push(pinyin);
      this.rawPinyin.set(word, raws);
      const len = [...word].length;
      if (len > this._max && len <= 12) this._max = len;
    }
    for (const line of hanviet.split('\n')) {
      const [ch, data] = line.split('\t');
      if (!ch || !data) continue;
      const byPinyin = new Map<string, string[]>();
      for (const part of data.split(';')) {
        // tách ở dấu ":" CUỐI: pinyin có thể chứa ":" (nu:3 = nǚ)
        const k = part.lastIndexOf(':');
        const py = part.slice(0, k);
        const readings = part.slice(k + 1);
        if (k > 0 && readings) byPinyin.set(py, readings.split(','));
      }
      if (byPinyin.size) this.hv.set(ch, byPinyin);
    }
  }

  has(word: string): boolean {
    return this.words.has(word);
  }

  lookup(word: string): DictEntry | null {
    const senses = this.words.get(word);
    if (!senses) return null;
    const ordered = orderSenses(senses);
    // Hán Việt theo cách đọc đứng đầu (cách đọc đang hiện trên popup)
    const raw = this.rawPinyin.get(word)?.[senses.indexOf(ordered[0])];
    return { word, senses: ordered, hanviet: this.hanvietWithPinyin(word, raw) };
  }

  /** Hán Việt theo đúng cách đọc đã chọn (pinyin có dấu, vd "háng"); không khớp cách đọc nào thì như lookup. */
  hanvietForPinyin(word: string, markedPinyin: string): string {
    const senses = this.words.get(word);
    const i = senses ? senses.findIndex((s) => s.pinyin === markedPinyin) : -1;
    const raw = i >= 0 ? this.rawPinyin.get(word)?.[i] : undefined;
    return raw ? this.hanvietWithPinyin(word, raw) : (this.lookup(word)?.hanviet ?? this.hanviet(word));
  }

  /** Hán Việt của một chuỗi bất kỳ: tách thành các từ có trong từ điển để biết pinyin từng chữ, rồi chọn âm. */
  hanviet(text: string): string {
    const chars = [...text];
    const out: string[] = [];
    let i = 0;
    while (i < chars.length) {
      let len = Math.min(this._max, chars.length - i);
      for (; len > 1; len--) if (this.words.has(chars.slice(i, i + len).join(''))) break;
      const piece = chars.slice(i, i + len).join('');
      out.push(this.hanvietWithPinyin(piece, this.topRawPinyin(piece)));
      i += len;
    }
    return out.join(' ');
  }

  /** pinyin dạng số của cách đọc thông dụng nhất (theo orderSenses). */
  private topRawPinyin(word: string): string | undefined {
    const senses = this.words.get(word);
    if (!senses) return undefined;
    return this.rawPinyin.get(word)?.[senses.indexOf(orderSenses(senses)[0])];
  }

  /** Ghép âm Hán Việt từng chữ; pinyinRaw = "yin2 hang2" (có thể thiếu). */
  private hanvietWithPinyin(word: string, pinyinRaw?: string): string {
    const chars = [...word];
    const syl = pinyinRaw ? pinyinRaw.toLowerCase().split(' ') : [];
    const aligned = syl.length === chars.length;
    return chars
      .map((ch, i) => this.charHanviet(ch, aligned ? syl[i] : this.topRawPinyin(ch)?.toLowerCase()))
      .join(' ');
  }

  /** Âm Hán Việt của một chữ theo pinyin. Không có dữ liệu -> "?". */
  private charHanviet(ch: string, py?: string): string {
    const m = this.hv.get(ch);
    if (!m) return '?';
    const pick = (k: string) => m.get(k)?.[0];
    if (py) {
      const exact = pick(py);
      if (exact) return exact;
      // thanh nhẹ (5) hoặc biến điệu: thử cùng âm tiết với thanh khác
      const base = py.replace(/[1-5]$/, '');
      for (const t of ['1', '2', '3', '4', '5']) {
        const r = pick(base + t);
        if (r) return r;
      }
    }
    return pick('*') ?? m.values().next().value?.[0] ?? '?';
  }
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
