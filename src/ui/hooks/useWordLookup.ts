// ui/hooks/useWordLookup.ts — Tra một từ: từ điển offline ngay lập tức, nghĩa Việt từ AI khi cần.
// Dùng chung cho popup nhỏ (WordPopover) và bảng đầy đủ (WordSheet), để hai nơi luôn hiện cùng một nội dung.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { AiMode, DictEntry, MeaningLang, PhrasePart, VietMeaning } from '@/core/types';
import { mergeHanviet } from '@/services/MeaningService';
import { useServices } from '../context';

export type VietState =
  | { status: 'idle' | 'loading' }
  | { status: 'done'; value: VietMeaning }
  | { status: 'error'; message: string };

/** Chờ nghĩa Việt tối đa bấy nhiêu ms; quá thì báo lỗi (vẫn còn nghĩa Anh để xem). */
const VIET_TIMEOUT = 25_000;

/** Kết quả AI đã có trong phiên này: mở bong bóng -> bảng đầy đủ không phải chờ lại, cụm không nhấp nháy. */
const sessionMemo = new Map<string, VietMeaning>();

export interface WordLookup {
  phrase: string; // cụm chứa từ vừa chạm (nếu AI nhận ra), không thì chính từ đó
  parts: PhrasePart[]; // từ nhỏ trong cụm (hoặc trong chính từ, nếu từ đó là cụm), kèm nghĩa; rỗng nếu không có
  entry: DictEntry; // của cả cụm
  dictVi: string; // nghĩa Việt từ điển offline (CVDICT), có ngay không cần AI; '' nếu từ điển không có
  viet: VietState;
  vietValue: VietMeaning | null;
  hanviet: string;
  pinyins: string[];
}

/**
 * Lấy nghĩa Việt khi đang xem tiếng Việt, hoặc khi cần bù âm Hán Việt còn thiếu.
 * Component dùng hook này nên được gắn key theo từ + câu, để đổi từ là state tự làm mới.
 * exact = true: tra đúng từ này, không nhận cụm (dùng khi bấm một từ nhỏ trong cụm).
 * Chỉ khi xem tiếng Việt, AI mới nhận ra cụm; xem tiếng Anh vẫn tra đúng từ vừa chạm.
 */
export function useWordLookup(word: string, sentence: string, lang: MeaningLang, mode: AiMode, exact = false): WordLookup {
  const { meanings } = useServices();
  const base = meanings.lookup(word); // từ vừa chạm
  const memoKey = (m: AiMode) => `${m}|${exact ? 'x' : ''}|${word}|${sentence}`;
  const [viet, setViet] = useState<VietState>(() => {
    const hit = sessionMemo.get(memoKey(mode));
    return hit ? { status: 'done', value: hit } : { status: 'idle' };
  });
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // chạy lại khi đổi ngôn ngữ hoặc đổi Tự động / Nâng cao (đã có trong cache thì trả về ngay)
  const lastRun = useRef('');
  useEffect(() => {
    const needHv = base.hanviet.includes('?');
    if (lang !== 'vi' && !needHv) return;
    if (lastRun.current === mode) return; // đổi qua lại VI/EN không gọi lại AI
    lastRun.current = mode;
    if (!sessionMemo.has(memoKey(mode))) setViet({ status: 'loading' });
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), VIET_TIMEOUT);
    const live = () => mounted.current && lastRun.current === mode;
    meanings
      .vietnamese(base, sentence, mode, ctrl.signal, exact)
      .then((value) => {
        sessionMemo.set(memoKey(mode), value);
        if (live()) setViet({ status: 'done', value });
      })
      .catch((e: Error) => {
        if (!live()) return;
        const message = ctrl.signal.aborted ? 'AI trả lời quá lâu, thử chạm lại từ này.' : e.message;
        setViet({ status: 'error', message });
      })
      .finally(() => window.clearTimeout(timer));
  }, [lang, mode]);

  const vietValue = viet.status === 'done' ? viet.value : null;
  const phrase = vietValue?.phrase && vietValue.phrase !== word ? vietValue.phrase : word;
  const entry = phrase === word ? base : meanings.lookup(phrase);
  const dictPinyins = [...new Set(entry.senses.map((s) => s.pinyin))].slice(0, 3);
  return {
    phrase,
    parts: vietValue?.parts ?? [],
    entry,
    dictVi: entry.senses.find((s) => s.vietnamese.length)?.vietnamese.slice(0, 3).join('; ') ?? '',
    viet,
    vietValue,
    hanviet: mergeHanviet(entry.hanviet, vietValue?.hanviet),
    // cụm thường không có trong CC-CEDICT: dùng pinyin AI trả về
    pinyins: dictPinyins.length ? dictPinyins : vietValue?.pinyin ? [vietValue.pinyin] : [],
  };
}
