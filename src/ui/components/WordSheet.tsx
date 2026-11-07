// ui/components/WordSheet.tsx — Popup tra từ (trượt lên từ đáy màn hình):
// từ, pinyin, âm Hán Việt, nghĩa Việt (AI) / Anh (CC-CEDICT), nút Lưu, nút nghe, tra từng chữ.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { DictEntry, MeaningLang, VietMeaning } from '@/core/types';
import { mergeHanviet } from '@/services/MeaningService';
import { canSpeak, speak } from '@/modules/speech/speak';
import { useServices } from '../context';
import { IconSpeaker, IconStar } from '../icons';

interface Props {
  word: string;
  sentence: string;
  isSaved: boolean;
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  onSave: (entry: DictEntry, viet: VietMeaning | null) => void;
  onUnsave: () => void;
  onPick: (word: string) => void;
  onClose: () => void;
}

type VietState = { status: 'idle' | 'loading' } | { status: 'done'; value: VietMeaning } | { status: 'error'; message: string };

export function WordSheet(p: Props) {
  const { meanings } = useServices();
  const entry = meanings.lookup(p.word);
  const [viet, setViet] = useState<VietState>({ status: 'idle' });

  // Lấy nghĩa Việt khi đang xem tab VI, hoặc khi cần bù âm Hán Việt còn thiếu.
  // Component được gắn key theo từ + câu ở màn đọc, nên đổi từ là state tự làm mới.
  useEffect(() => {
    const needHv = entry.hanviet.includes('?');
    if (viet.status !== 'idle' || (p.lang !== 'vi' && !needHv)) return;
    setViet({ status: 'loading' });
    meanings
      .vietnamese(entry, p.sentence)
      .then((value) => mounted.current && setViet({ status: 'done', value }))
      .catch((e: Error) => mounted.current && setViet({ status: 'error', message: e.message }));
  }, [p.lang]);

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const vietValue = viet.status === 'done' ? viet.value : null;
  const hanviet = mergeHanviet(entry.hanviet, vietValue?.hanviet);
  const pinyins = [...new Set(entry.senses.map((s) => s.pinyin))].slice(0, 3);
  const chars = [...p.word];

  return (
    <>
      <button class="backdrop" aria-label="Đóng popup" onClick={p.onClose} />
      <section class="sheet" role="dialog" aria-label={`Nghĩa của ${p.word}`}>
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <div>
            <div class="sheet-word">{p.word}</div>
            <div class="sheet-reading">
              {pinyins.join(' / ') || '—'} · [{hanviet}]
            </div>
          </div>
          <div class="seg" role="group" aria-label="Ngôn ngữ nghĩa">
            <button aria-pressed={p.lang === 'vi'} onClick={() => p.onLang('vi')}>VI</button>
            <button aria-pressed={p.lang === 'en'} onClick={() => p.onLang('en')}>EN</button>
          </div>
        </div>

        <div class="sheet-meaning" aria-live="polite">
          {p.lang === 'vi' ? <VietBlock state={viet} /> : <EnglishBlock entry={entry} />}
        </div>

        {chars.length > 1 && (
          <div class="char-chips" aria-label="Tra từng chữ">
            {chars.map((c, i) => (
              <button key={i} class="chip" onClick={() => p.onPick(c)}>{c}</button>
            ))}
          </div>
        )}

        <div class="sheet-actions">
          {p.isSaved ? (
            <button class="btn" style={{ flex: 1, height: '48px' }} onClick={p.onUnsave}>
              <IconStar filled /> Đã lưu · Bỏ lưu
            </button>
          ) : (
            <button class="btn btn-primary" onClick={() => p.onSave({ ...entry, hanviet }, vietValue)}>
              <IconStar /> Lưu từ
            </button>
          )}
          {canSpeak() && (
            <button class="icon-btn" aria-label="Nghe phát âm" onClick={() => speak(p.word)}>
              <IconSpeaker />
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function VietBlock({ state }: { state: VietState }) {
  if (state.status === 'done') {
    return (
      <>
        <div>{state.value.meaning}</div>
        {state.value.partOfSpeech && <div class="meta" style={{ marginTop: '4px' }}>{state.value.partOfSpeech}</div>}
      </>
    );
  }
  if (state.status === 'error') return <div class="meta">{state.message} Chuyển sang EN để xem nghĩa tiếng Anh.</div>;
  return <div class="skeleton" aria-label="Đang lấy nghĩa tiếng Việt" />;
}

function EnglishBlock({ entry }: { entry: DictEntry }) {
  if (entry.senses.length === 0) return <div class="meta">Không có trong từ điển CC-CEDICT.</div>;
  return (
    <ol>
      {entry.senses.slice(0, 3).map((s, i) => (
        <li key={i}>
          {entry.senses.length > 1 && <span class="pin">{s.pinyin} · </span>}
          {s.english.slice(0, 5).join('; ')}
        </li>
      ))}
    </ol>
  );
}
