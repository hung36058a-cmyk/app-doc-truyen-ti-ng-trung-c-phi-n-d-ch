// ui/hooks/useSynonyms.ts — Lấy 3 từ đồng nghĩa của từ / cụm đang xem (gọi AI một lần, sau đó lấy từ cache).
// Chỉ chạy khi đã có nghĩa theo câu (để AI chọn từ đồng nghĩa đúng nghĩa đang dùng).

import { useEffect, useState } from 'preact/hooks';
import type { PhrasePart } from '@/core/types';
import { useServices } from '../context';

export type SynonymState =
  | { status: 'idle' | 'loading' }
  | { status: 'done'; list: PhrasePart[] }
  | { status: 'error' };

const memo = new Map<string, PhrasePart[]>();

/** enabled = false thì không gọi (vd đang xem EN, hoặc nghĩa chưa có). */
export function useSynonyms(word: string, meaning: string, sentence: string, enabled: boolean): SynonymState {
  const { meanings } = useServices();
  const [state, setState] = useState<SynonymState>(() => {
    const hit = memo.get(word);
    return hit ? { status: 'done', list: hit } : { status: 'idle' };
  });

  useEffect(() => {
    if (!enabled) return;
    const hit = memo.get(word);
    if (hit) { setState({ status: 'done', list: hit }); return; }
    let live = true;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 25_000);
    setState({ status: 'loading' });
    meanings
      .synonyms(word, meaning, sentence, ctrl.signal)
      .then((list) => { memo.set(word, list); if (live) setState({ status: 'done', list }); })
      .catch(() => { if (live) setState({ status: 'error' }); })
      .finally(() => window.clearTimeout(timer));
    return () => { live = false; ctrl.abort(); };
  }, [word, enabled]);

  return state;
}
