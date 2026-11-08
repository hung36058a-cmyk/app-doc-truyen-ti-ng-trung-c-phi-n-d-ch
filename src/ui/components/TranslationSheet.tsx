// ui/components/TranslationSheet.tsx — Khung dịch, mở khi BẤM GIỮ một chữ trong truyện.
// Chế độ "câu": câu chứa chữ đó được tô sáng; khung hiện từng từ của câu (chạm để tra), pinyin và Hán Việt
//   cả câu, và bản dịch câu (tự dịch ngay). Nút ‹ › chuyển sang câu trước / sau trong cùng đoạn.
// Chế độ "đoạn": bấm "Dịch cả đoạn" -> chỉ hiện bản dịch cả đoạn, không tách từ.
// Hàng "Dịch tự động / Dịch nâng cao" đổi model ngay trong khung (nhớ cho lần sau): tự động = Gemini Flash,
// nâng cao = Gemini Pro. Bản dịch được lưu cache riêng cho từng mức nên mở lại là có ngay.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AiMode, MeaningLang } from '@/core/types';
import type { SentenceSpan } from '@/services/sentence';
import { useServices } from '../context';
import { AiTierToggle } from './AiTierToggle';

export type TransMode = 'sentence' | 'paragraph';

interface Props {
  paragraph: string;
  previous: string; // đoạn ngay trước, làm ngữ cảnh cho AI
  sentence: SentenceSpan;
  sentenceIndex: number;
  sentenceCount: number;
  mode: TransMode;
  onMode: (m: TransMode) => void;
  onMove: (delta: -1 | 1) => void;
  onPickWord: (word: string, offsetInParagraph: number) => void;
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  aiMode: AiMode; // 'save' = Dịch tự động, 'quality' = Dịch nâng cao
  onAiMode: (m: AiMode) => void;
  onClose: () => void;
}

type Result = { status: 'loading'; partial: string } | { status: 'done'; text: string } | { status: 'error'; message: string };

export function TranslationSheet(p: Props) {
  const { translations, segmenter, dictionary } = useServices();
  const [result, setResult] = useState<Result>({ status: 'loading', partial: '' });
  const [aiHanviet, setAiHanviet] = useState(''); // Hán Việt cả câu do AI viết (chính xác hơn bảng chữ)
  const run = useRef(0);

  // từ trong câu, kèm vị trí trong đoạn (để chạm từ là tra đúng chỗ)
  const words = useMemo(() => {
    let o = p.sentence.start;
    return segmenter.segment(p.sentence.text).map((t) => {
      const at = o;
      o += [...t.text].length;
      return { ...t, at };
    });
  }, [p.sentence, segmenter]);

  const pinyin = words
    .filter((t) => t.isWord)
    .map((t) => dictionary.lookup(t.text)?.senses[0]?.pinyin.replace(/\s+/g, '') ?? t.text)
    .join(' ');
  const dictHanviet = words
    .filter((t) => t.isWord)
    .map((t) => dictionary.hanviet(t.text))
    .join(' ');

  const target =
    p.mode === 'paragraph'
      ? { text: p.paragraph, context: p.previous }
      : { text: p.sentence.text, context: [...p.paragraph].slice(0, p.sentence.start).join('') || p.previous };

  useEffect(() => {
    const id = ++run.current; // bỏ kết quả cũ khi đã đổi câu, đổi chế độ hoặc đổi ngôn ngữ
    const live = () => id === run.current;
    setResult({ status: 'loading', partial: '' });
    setAiHanviet('');
    const fail = (e: Error) => live() && setResult({ status: 'error', message: e.message });
    if (p.mode === 'paragraph') {
      translations
        .translate(target.text, p.lang, target.context, p.aiMode, (t) => live() && setResult({ status: 'loading', partial: t }))
        .then((text) => live() && setResult({ status: 'done', text }))
        .catch(fail);
    } else {
      translations
        .translateSentence(target.text, p.lang, target.context, p.aiMode, (r) => {
          if (!live()) return;
          if (r.hanviet) setAiHanviet(r.hanviet);
          setResult({ status: 'loading', partial: r.translation });
        })
        .then((r) => {
          if (!live()) return;
          setAiHanviet(r.hanviet);
          setResult({ status: 'done', text: r.translation });
        })
        .catch(fail);
    }
  }, [target.text, p.lang, p.mode, p.aiMode]);

  useEffect(() => () => { run.current = -1; }, []);

  return (
    <>
      <button class="backdrop" aria-label="Đóng khung dịch" onClick={p.onClose} />
      <section class="sheet trans-sheet" role="dialog" aria-label={p.mode === 'paragraph' ? 'Dịch cả đoạn' : 'Dịch câu'}>
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <h2 class="sheet-heading">{p.mode === 'paragraph' ? 'Dịch cả đoạn' : `Câu ${p.sentenceIndex + 1} / ${p.sentenceCount}`}</h2>
          <div class="seg" role="group" aria-label="Ngôn ngữ bản dịch">
            <button aria-pressed={p.lang === 'vi'} onClick={() => p.onLang('vi')}>VI</button>
            <button aria-pressed={p.lang === 'en'} onClick={() => p.onLang('en')}>EN</button>
          </div>
        </div>

        <AiTierToggle value={p.aiMode} onChange={p.onAiMode} />

        {p.mode === 'sentence' ? (
          <>
            <div class="word-chips" lang="zh-Hant" aria-label="Chạm một từ để tra">
              {words.filter((t) => t.isWord).map((t, i) => (
                <button key={i} class="chip" onClick={() => p.onPickWord(t.text, t.at)}>{t.text}</button>
              ))}
            </div>
            <div class="sentence-reading">
              <div class="han" lang="zh-Hant">{p.sentence.text}</div>
              <div class="meta">[{pinyin}]</div>
              <div class={`meta${aiHanviet ? '' : ' hv-draft'}`} title={aiHanviet ? 'Hán Việt do AI viết' : 'Hán Việt tạm theo bảng chữ, đang chờ AI'}>
                [{aiHanviet || dictHanviet}]
              </div>
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
          <span class="trans-model">{p.aiMode === 'quality' ? 'Nâng cao · Gemini Pro' : 'Tự động · Gemini Flash'}</span>
        </div>

        {p.mode === 'sentence' ? (
          <div class="trans-actions">
            <button class="icon-btn nav-btn" aria-label="Câu trước" disabled={p.sentenceIndex === 0} onClick={() => p.onMove(-1)}>‹</button>
            <button class="btn" onClick={() => p.onMode('paragraph')}>Dịch cả đoạn</button>
            <button class="icon-btn nav-btn" aria-label="Câu sau" disabled={p.sentenceIndex >= p.sentenceCount - 1} onClick={() => p.onMove(1)}>›</button>
          </div>
        ) : (
          <div class="trans-actions">
            <button class="btn" onClick={() => p.onMode('sentence')}>Quay lại dịch câu</button>
          </div>
        )}
      </section>
    </>
  );
}
