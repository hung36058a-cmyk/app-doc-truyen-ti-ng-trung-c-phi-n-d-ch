// ui/components/TranslationSheet.tsx — Khung dịch (mở khi bấm giữ một đoạn).
// Bước 1: chọn câu muốn dịch (câu dưới ngón tay được chọn sẵn), hoặc dịch cả đoạn.
// Bước 2: chữ dịch hiện dần trong lúc AI trả lời; bản dịch được lưu cache nên mở lại là có ngay.
// Đoạn chỉ có 1 câu thì bỏ qua bước 1.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MeaningLang } from '@/core/types';
import { splitSentences } from '@/services/sentence';
import { useServices } from '../context';

interface Props {
  paragraph: string;
  previous: string; // đoạn ngay trước, làm ngữ cảnh cho AI
  initialOffset: number | null; // vị trí ký tự nơi bấm giữ
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  onClose: () => void;
}

type Result = { status: 'loading'; partial: string } | { status: 'done'; text: string } | { status: 'error'; message: string };

export function TranslationSheet({ paragraph, previous, initialOffset, lang, onLang, onClose }: Props) {
  const { translations } = useServices();
  const sentences = useMemo(() => splitSentences(paragraph), [paragraph]);
  const single = sentences.length <= 1;

  const [picked, setPicked] = useState<Set<number>>(() => {
    const i = initialOffset === null ? -1 : sentences.findIndex((s) => initialOffset >= s.start && initialOffset < s.end);
    return new Set(i >= 0 ? [i] : []);
  });
  // phần đang dịch: null = đang ở bước chọn câu
  const [target, setTarget] = useState<{ text: string; context: string } | null>(() =>
    single ? { text: paragraph, context: previous } : null,
  );
  const [result, setResult] = useState<Result>({ status: 'loading', partial: '' });
  const run = useRef(0);

  useEffect(() => {
    if (!target) return;
    const id = ++run.current; // bỏ kết quả của lần dịch cũ khi đã đổi ngôn ngữ hoặc đổi câu
    setResult({ status: 'loading', partial: '' });
    translations
      .translate(target.text, lang, target.context, (t) => id === run.current && setResult({ status: 'loading', partial: t }))
      .then((text) => id === run.current && setResult({ status: 'done', text }))
      .catch((e: Error) => id === run.current && setResult({ status: 'error', message: e.message }));
  }, [target, lang]);

  useEffect(() => () => { run.current = -1; }, []);

  const toggle = (i: number) => {
    const next = new Set(picked);
    next.has(i) ? next.delete(i) : next.add(i);
    setPicked(next);
  };

  const translatePicked = () => {
    const idx = [...picked].sort((a, b) => a - b);
    const text = idx.map((i) => sentences[i].text).join('');
    // ngữ cảnh: phần đứng trước câu đầu tiên được chọn trong đoạn; nếu chọn câu đầu thì dùng đoạn trước
    const before = [...paragraph].slice(0, sentences[idx[0]].start).join('');
    setTarget({ text, context: before || previous });
  };

  return (
    <>
      <button class="backdrop" aria-label="Đóng khung dịch" onClick={onClose} />
      <section class="sheet" role="dialog" aria-label="Dịch">
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <h2 class="sheet-heading">{target ? 'Bản dịch' : 'Chọn câu để dịch'}</h2>
          <div class="seg" role="group" aria-label="Ngôn ngữ bản dịch">
            <button aria-pressed={lang === 'vi'} onClick={() => onLang('vi')}>VI</button>
            <button aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
        </div>

        {!target ? (
          <>
            <p class="meta">Chạm để chọn hoặc bỏ chọn câu. Có thể chọn nhiều câu.</p>
            <div class="sentence-list" lang="zh-Hant">
              {sentences.map((s, i) => (
                <button key={i} class="sentence-chip" aria-pressed={picked.has(i)} onClick={() => toggle(i)}>
                  {s.text}
                </button>
              ))}
            </div>
            <div class="row trans-actions">
              <button class="btn" onClick={() => setTarget({ text: paragraph, context: previous })}>Dịch cả đoạn</button>
              <button class="btn btn-primary" disabled={picked.size === 0} onClick={translatePicked}>
                {picked.size ? `Dịch ${picked.size} câu` : 'Chọn câu'}
              </button>
            </div>
          </>
        ) : (
          <>
            <blockquote class="trans-source" lang="zh-Hant">{target.text}</blockquote>
            <div class="trans-text" aria-live="polite">
              {result.status === 'done' && result.text}
              {result.status === 'loading' &&
                (result.partial ? (
                  <>{result.partial}<span class="caret" aria-hidden="true" /></>
                ) : (
                  <>
                    <div class="skeleton" />
                    <div class="skeleton" style={{ width: '50%', marginTop: '8px' }} />
                  </>
                ))}
              {result.status === 'error' && <span class="meta">{result.message}</span>}
            </div>
            <div class="row trans-actions">
              {!single && <button class="btn" onClick={() => setTarget(null)}>Chọn câu khác</button>}
              {result.status === 'done' && <span class="meta trans-note">Bản dịch do AI tạo, đã lưu trên máy.</span>}
            </div>
          </>
        )}
      </section>
    </>
  );
}
