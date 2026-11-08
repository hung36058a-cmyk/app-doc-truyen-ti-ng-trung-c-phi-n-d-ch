// ui/hooks/useWordLookup.ts — Tra một từ: từ điển offline ngay lập tức, nghĩa Việt từ AI khi cần.
// Dùng chung cho popup nhỏ (WordPopover) và bảng đầy đủ (WordSheet), để hai nơi luôn hiện cùng một nội dung.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { DictEntry, MeaningLang, VietMeaning } from '@/core/types';
import { mergeHanviet } from '@/services/MeaningService';
import { useServices } from '../context';

export type VietState =
  | { status: 'idle' | 'loading' }
  | { status: 'done'; value: VietMeaning }
  | { status: 'error'; message: string };

export interface WordLookup {
  entry: DictEntry;
  viet: VietState;
  vietValue: VietMeaning | null;
  hanviet: string;
  pinyins: string[];
}

/**
 * Lấy nghĩa Việt khi đang xem tiếng Việt, hoặc khi cần bù âm Hán Việt còn thiếu.
 * Component dùng hook này nên được gắn key theo từ + câu, để đổi từ là state tự làm mới.
 */
export function useWordLookup(word: string, sentence: string, lang: MeaningLang): WordLookup {
  const { meanings } = useServices();
  const entry = meanings.lookup(word);
  const [viet, setViet] = useState<VietState>({ status: 'idle' });
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  useEffect(() => {
    const needHv = entry.hanviet.includes('?');
    if (viet.status !== 'idle' || (lang !== 'vi' && !needHv)) return;
    setViet({ status: 'loading' });
    meanings
      .vietnamese(entry, sentence)
      .then((value) => mounted.current && setViet({ status: 'done', value }))
      .catch((e: Error) => mounted.current && setViet({ status: 'error', message: e.message }));
  }, [lang]);

  const vietValue = viet.status === 'done' ? viet.value : null;
  return {
    entry,
    viet,
    vietValue,
    hanviet: mergeHanviet(entry.hanviet, vietValue?.hanviet),
    pinyins: [...new Set(entry.senses.map((s) => s.pinyin))].slice(0, 3),
  };
}
