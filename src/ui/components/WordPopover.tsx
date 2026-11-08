// ui/components/WordPopover.tsx — Bong bóng tra từ nhỏ hiện ngay trên (hoặc dưới) từ vừa chạm:
// từ, pinyin · Hán Việt, nghĩa ngắn, nút Lưu / Nghe / Chi tiết. Không che trang như bảng đầy đủ,
// nên tra nhiều từ liên tiếp không mất mạch đọc. "Chi tiết" mở bảng đầy đủ (WordSheet).

import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { DictEntry, MeaningLang, VietMeaning } from '@/core/types';
import { canSpeak, speak } from '@/modules/speech/speak';
import { useWordLookup, type WordLookup } from '../hooks/useWordLookup';
import { IconSpeaker, IconStar } from '../icons';

interface Props {
  word: string;
  sentence: string;
  anchor: () => HTMLElement | null; // từ đang chọn trên trang, để đặt bong bóng cạnh nó
  isSaved: boolean;
  lang: MeaningLang;
  onSave: (entry: DictEntry, viet: VietMeaning | null) => void;
  onUnsave: () => void;
  onExpand: () => void;
}

/** Khoảng cách tối thiểu tới mép màn hình và tới từ được chạm. */
const EDGE = 12;
const GAP = 10;
/** Phần trên cùng bị thanh tiêu đề che (khi thanh đang hiện). */
const TOP_SAFE = 64;

interface Place { top: number; left: number; arrow: number; below: boolean }

export function WordPopover(p: Props) {
  const look = useWordLookup(p.word, p.sentence, p.lang);
  const box = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);

  // đo lại sau mỗi lần vẽ: nghĩa tải xong làm bong bóng cao lên
  useLayoutEffect(() => {
    const el = box.current;
    const a = p.anchor();
    if (!el || !a) return;
    const r = a.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const below = r.top - GAP - h < TOP_SAFE;
    const top = below ? r.bottom + GAP : r.top - GAP - h;
    const center = r.left + r.width / 2;
    const left = Math.max(EDGE, Math.min(vw - w - EDGE, center - w / 2));
    const arrow = Math.max(18, Math.min(w - 18, center - left));
    if (!place || place.top !== top || place.left !== left || place.arrow !== arrow || place.below !== below) {
      setPlace({ top, left, arrow, below });
    }
  });

  return (
    <div
      ref={box}
      class={`word-pop${place?.below ? ' is-below' : ''}`}
      role="dialog"
      aria-label={`Nghĩa của ${p.word}`}
      style={{
        top: `${place?.top ?? -9999}px`,
        left: `${place?.left ?? 0}px`,
        '--arrow-x': `${place?.arrow ?? 0}px`,
        visibility: place ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div class="word-pop-head">
        <span class="word-pop-word" lang="zh-Hant">{p.word}</span>
        <span class="word-pop-reading">
          {look.pinyins[0] || '—'} <span class="word-pop-hv">[{look.hanviet}]</span>
        </span>
        {canSpeak() && (
          <button class="icon-btn word-pop-icon" aria-label="Nghe phát âm" onClick={() => speak(p.word)}>
            <IconSpeaker size={18} />
          </button>
        )}
      </div>
      <div class="word-pop-meaning" aria-live="polite"><ShortMeaning look={look} lang={p.lang} /></div>
      <div class="word-pop-actions">
        {p.isSaved ? (
          <button class="btn word-pop-saved" onClick={p.onUnsave}><IconStar size={16} filled /> Đã lưu</button>
        ) : (
          <button class="btn btn-primary" onClick={() => p.onSave({ ...look.entry, hanviet: look.hanviet }, look.vietValue)}>
            <IconStar size={16} /> Lưu
          </button>
        )}
        <button class="btn" onClick={p.onExpand}>Chi tiết ›</button>
      </div>
    </div>
  );
}

/** Nghĩa ngắn một-hai dòng: nghĩa Việt của AI, hoặc nghĩa Anh đầu tiên của CC-CEDICT. */
function ShortMeaning({ look, lang }: { look: WordLookup; lang: MeaningLang }) {
  const english = look.entry.senses[0]?.english.slice(0, 3).join('; ');
  if (lang === 'en') return <>{english || <span class="meta">Không có trong từ điển.</span>}</>;
  if (look.viet.status === 'done') return <>{look.viet.value.meaning}</>;
  if (look.viet.status === 'error') return <>{english || <span class="meta">{look.viet.message}</span>}</>;
  return <div class="skeleton" aria-label="Đang lấy nghĩa tiếng Việt" />;
}
