// modules/segmenter/MaxMatchSegmenter.ts — Tách từ "khớp dài nhất từ trái sang" dựa trên từ điển.
// Ưu điểm: mọi từ tách ra đều tra được trong từ điển. Nhược: đôi khi gộp sai ở ranh giới từ.
// Muốn đổi thuật toán: viết class khác implements Segmenter rồi đổi trong services/container.ts.

import type { Token } from '@/core/types';
import type { Dictionary } from '@/modules/dictionary/Dictionary';
import { HAN, type Segmenter } from './Segmenter';

export class MaxMatchSegmenter implements Segmenter {
  constructor(private dict: Pick<Dictionary, 'has' | 'maxWordLength'>) {}

  segment(text: string): Token[] {
    const chars = [...text];
    const tokens: Token[] = [];
    let i = 0;
    while (i < chars.length) {
      if (!HAN.test(chars[i])) {
        // gom các ký tự không phải chữ Hán liền nhau thành một token
        let j = i;
        while (j < chars.length && !HAN.test(chars[j])) j++;
        tokens.push({ text: chars.slice(i, j).join(''), isWord: false });
        i = j;
        continue;
      }
      let len = Math.min(this.dict.maxWordLength, chars.length - i);
      for (; len > 1; len--) {
        const slice = chars.slice(i, i + len);
        if (slice.every((c) => HAN.test(c)) && this.dict.has(slice.join(''))) break;
      }
      tokens.push({ text: chars.slice(i, i + len).join(''), isWord: true });
      i += len;
    }
    return tokens;
  }
}
