// ui/hooks/useWordLookup.ts — Tra một từ: từ điển offline ngay lập tức, nghĩa Việt từ AI khi cần.
// Dùng chung cho popup nhỏ (WordPopover) và bảng đầy đủ (WordSheet), để hai nơi luôn hiện cùng một nội dung.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { AiMode, DictEntry, MeaningLang, VietMeaning } from '@/core/types';
import { mergeHanviet } from '@/services/MeaningService';
import { useServices } from '../context';

export type VietState =
  | { status: 'idle' | 'loading' }
  | { status: 'done'; value: VietMeaning }
  | { status: 'error'; message: string };

/** Chờ nghĩa Việt tối đa bấy nhiêu ms; quá thì báo lỗi (vẫn còn nghĩa Anh để xem). */
const VIET_TIMEOUT = 25_000;

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
export function useWordLookup(word: string, sentence: string, lang: MeaningLang, mode: AiMode): WordLookup {
  const { meanings } = useServices();
  const entry = meanings.lookup(word);
  const [viet, setViet] = useState<VietState>({ status: 'idle' });
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // chạy lại khi đổi ngôn ngữ hoặc đổi Tự động / Nâng cao (đã có trong cache thì trả về ngay)
  const lastRun = useRef('');
  useEffect(() => {
    const needHv = entry.hanviet.includes('?');
    if (lang !== 'vi' && !needHv) return;
    if (lastRun.current === mode) return; // đổi qua lại VI/EN không gọi lại AI
    lastRun.current = mode;
    setViet({ status: 'loading' });
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), VIET_TIMEOUT);
    const live = () => mounted.current && lastRun.current === mode;
    meanings
      .vietnamese(entry, sentence, mode, ctrl.signal)
      .then((value) => live() && setViet({ status: 'done', value }))
      .catch((e: Error) => {
        if (!live()) return;
        const message = ctrl.signal.aborted ? 'AI trả lời quá lâu, thử chạm lại từ này.' : e.message;
        setViet({ status: 'error', message });
      })
      .finally(() => window.clearTimeout(timer));
  }, [lang, mode]);

  const vietValue = viet.status === 'done' ? viet.value : null;
  return {
    entry,
    viet,
    vietValue,
    hanviet: mergeHanviet(entry.hanviet, vietValue?.hanviet),
    pinyins: [...new Set(entry.senses.map((s) => s.pinyin))].slice(0, 3),
  };
}
