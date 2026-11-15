// ui/components/PhraseParts.tsx — Các từ nhỏ trong một cụm (collocation), mỗi từ kèm nghĩa ngắn.
// Ví dụ cụm 汗毛直立 -> "汗毛 lông tơ" và "直立 dựng đứng". Có onPick thì mỗi từ bấm được để tra riêng từ đó.

import type { PhrasePart } from '@/core/types';
import { PosTag } from './PosTag';

interface Props {
  parts: PhrasePart[];
  onPick?: (text: string, index: number) => void;
  current?: number; // vị trí từ đang xem (được đánh dấu)
}

export function PhraseParts({ parts, onPick, current }: Props) {
  if (parts.length === 0) return null;
  return (
    <div class="phrase-parts" aria-label="Các từ trong cụm">
      {parts.map((p, i) => {
        const inner = (
          <>
            <span class="phrase-part-text" lang="zh-Hant">{p.text}</span>
            <span class="phrase-part-meaning"><PosTag raw={p.pos} />{p.meaning}</span>
          </>
        );
        return onPick ? (
          <button key={i} class="phrase-part" aria-current={i === current} onClick={() => onPick(p.text, i)}>{inner}</button>
        ) : (
          <span key={i} class="phrase-part">{inner}</span>
        );
      })}
    </div>
  );
}
