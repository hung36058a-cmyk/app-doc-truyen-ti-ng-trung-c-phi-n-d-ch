// ui/components/TranslationSheet.tsx — Khung dịch, mở khi người dùng TỰ TÔ CHỌN chữ trong truyện
// (bấm giữ → kéo 2 con trỏ → bấm nút "Dịch" ở đáy màn hình).
// Chế độ "chọn": hiện phần chữ đã chọn, bong bóng từng từ (chạm để tra), pinyin, và CHỈ bản dịch (tiếng Việt thuần).
// Chế độ "đoạn": bấm "Dịch cả đoạn" -> bản dịch cả đoạn chứa phần đã chọn.
// Bản 3.5: luôn dùng model nhanh nhất, không còn Hán Việt / cụm / công tắc Nâng cao trong khung này.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MeaningLang } from '@/core/types';
import { useServices } from '../context';

export type TransMode = 'selection' | 'paragraph';

export interface TransSource {
  para: number; // đoạn chứa điểm đầu phần chọn
  start: number; // vị trí ký tự trong đoạn (-1 nếu phần chọn trải qua nhiều đoạn)
  text: string; // chữ đã chọn
}

interface Props {
  source: TransSource;
  paragraph: string; // đoạn chứa phần chọn
  previous: string; // phần chữ ngay trước, làm ngữ cảnh cho AI
  previousParagraph: string; // đoạn ngay trước, làm ngữ cảnh khi dịch cả đoạn
  mode: TransMode;
  onMode: (m: TransMode) => void;
  onPickWord: (word: string, offsetInParagraph: number) => void;
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  onClose: () => void;
}

type Result = { status: 'loading'; partial: string } | { status: 'done'; text: string } | { status: 'error'; message: string };

export function TranslationSheet(p: Props) {
  const { translations, segmenter, dictionary } = useServices();
  const [result, setResult] = useState<Result>({ status: 'loading', partial: '' });
  const run = useRef(0);

  // từ trong phần chọn, kèm vị trí trong đoạn (để chạm từ là tra đúng chỗ)
  const words = useMemo(() => {
    let o = p.source.start;
    return segmenter.segment(p.source.text).map((t) => {
      const at = o;
      o += [...t.text].length;
      return { ...t, at };
    });
  }, [p.source, segmenter]);

  const pinyin = words
    .filter((t) => t.isWord)
    .map((t) => dictionary.lookup(t.text)?.senses[0]?.pinyin.replace(/\s+/g, '') ?? t.text)
    .join(' ');

  const target = p.mode === 'paragraph' ? { text: p.paragraph, context: p.previousParagraph } : { text: p.source.text, context: p.previous };

  useEffect(() => {
    const id = ++run.current; // bỏ kết quả cũ khi đã đổi phần chọn, đổi chế độ hoặc đổi ngôn ngữ
    const live = () => id === run.current;
    setResult({ status: 'loading', partial: '' });
    translations
      .translate(target.text, p.lang, target.context, (t) => live() && setResult({ status: 'loading', partial: t }))
      .then((text) => live() && setResult({ status: 'done', text }))
      .catch((e: Error) => live() && setResult({ status: 'error', message: e.message }));
  }, [target.text, p.lang, p.mode]);

  useEffect(() => () => { run.current = -1; }, []);

  return (
    <>
      <button class="backdrop" aria-label="Đóng khung dịch" onClick={p.onClose} />
      <section class="sheet trans-sheet" role="dialog" aria-label={p.mode === 'paragraph' ? 'Dịch cả đoạn' : 'Dịch phần đã chọn'}>
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <h2 class="sheet-heading">{p.mode === 'paragraph' ? 'Dịch cả đoạn' : 'Dịch phần đã chọn'}</h2>
          <div class="sheet-top-right">
            <div class="seg" role="group" aria-label="Ngôn ngữ bản dịch">
              <button aria-pressed={p.lang === 'vi'} onClick={() => p.onLang('vi')}>VI</button>
              <button aria-pressed={p.lang === 'en'} onClick={() => p.onLang('en')}>EN</button>
            </div>
          </div>
        </div>

        {p.mode === 'selection' ? (
          <>
            {p.source.start >= 0 && (
              <div class="word-chips" lang="zh-Hant" aria-label="Chạm một từ để tra">
                {words.filter((t) => t.isWord).map((t, i) => (
                  <button key={i} class="chip" onClick={() => p.onPickWord(t.text, t.at)}>{t.text}</button>
                ))}
              </div>
            )}
            <div class="sentence-reading">
              <div class="han" lang="zh-Hant">{p.source.text}</div>
              <div class="meta">[{pinyin}]</div>
            </div>
          </>
        ) : (
          <blockquote class="trans-source" lang="zh-Hant">{p.paragraph}</blockquote>
        )}

        <div class="trans-box" aria-live="polite">
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

        <div class="trans-actions">
          {p.mode === 'selection' ? (
            <button class="btn" onClick={() => p.onMode('paragraph')}>Dịch cả đoạn</button>
          ) : (
            <button class="btn" onClick={() => p.onMode('selection')}>Quay lại phần đã chọn</button>
          )}
        </div>
      </section>
    </>
  );
}
