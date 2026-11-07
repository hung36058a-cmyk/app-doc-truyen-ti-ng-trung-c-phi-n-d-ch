// ui/components/TranslationSheet.tsx — Khung dịch nguyên đoạn (mở khi bấm giữ một đoạn).
// Chữ dịch hiện dần trong lúc AI đang trả lời; bản dịch được lưu cache nên mở lại là có ngay.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { MeaningLang } from '@/core/types';
import { useServices } from '../context';

interface Props {
  paragraph: string;
  previous: string; // đoạn ngay trước, làm ngữ cảnh cho AI
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  onClose: () => void;
}

type State = { status: 'loading'; partial: string } | { status: 'done'; text: string } | { status: 'error'; message: string };

export function TranslationSheet({ paragraph, previous, lang, onLang, onClose }: Props) {
  const { translations } = useServices();
  const [state, setState] = useState<State>({ status: 'loading', partial: '' });
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current; // bỏ kết quả của lần dịch cũ khi đã đổi ngôn ngữ
    setState({ status: 'loading', partial: '' });
    translations
      .translate(paragraph, lang, previous, (t) => id === run.current && setState({ status: 'loading', partial: t }))
      .then((text) => id === run.current && setState({ status: 'done', text }))
      .catch((e: Error) => id === run.current && setState({ status: 'error', message: e.message }));
  }, [paragraph, lang]);

  useEffect(() => () => { run.current = -1; }, []);

  return (
    <>
      <button class="backdrop" aria-label="Đóng bản dịch" onClick={onClose} />
      <section class="sheet" role="dialog" aria-label="Dịch nguyên đoạn">
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <h2 class="sheet-heading">Dịch đoạn</h2>
          <div class="seg" role="group" aria-label="Ngôn ngữ bản dịch">
            <button aria-pressed={lang === 'vi'} onClick={() => onLang('vi')}>VI</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
        </div>
        <blockquote class="trans-source" lang="zh-Hant">{paragraph}</blockquote>
        <div class="trans-text" aria-live="polite">
          {state.status === 'done' && state.text}
          {state.status === 'loading' &&
            (state.partial ? (
              <>{state.partial}<span class="caret" aria-hidden="true" /></>
            ) : (
              <>
                <div class="skeleton" />
                <div class="skeleton" style={{ width: '50%', marginTop: '8px' }} />
              </>
            ))}
          {state.status === 'error' && <span class="meta">{state.message}</span>}
        </div>
        {state.status === 'done' && <p class="meta">Bản dịch do AI tạo, đã lưu trên máy.</p>}
      </section>
    </>
  );
}
