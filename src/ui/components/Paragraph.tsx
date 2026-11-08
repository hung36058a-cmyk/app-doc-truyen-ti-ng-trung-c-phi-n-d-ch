// ui/components/Paragraph.tsx — Một đoạn văn đã tách từ. Mỗi từ là một <span> chạm được.
// Dấu câu cũng nằm trong <span data-o> để bấm giữ ở đâu cũng biết vị trí, và để tô sáng đúng một câu.
// Chỉ tính lại khi đoạn văn, danh sách từ đã lưu, từ đang chọn hoặc vùng tô sáng thay đổi.

import { memo } from 'preact/compat';
import { useMemo } from 'preact/hooks';
import type { Segmenter } from '@/modules/segmenter/Segmenter';

interface Props {
  index: number;
  text: string;
  segmenter: Segmenter;
  saved: Set<string>;
  selectedToken: number | null; // chỉ số token đang chọn trong đoạn này
  hlStart?: number; // vùng đang tô sáng (vị trí ký tự), ví dụ câu đang dịch; -1 = không tô
  hlEnd?: number;
  onTap: (paraIndex: number, tokenIndex: number, word: string, charOffset: number) => void;
}

export const Paragraph = memo(function Paragraph({ index, text, segmenter, saved, selectedToken, hlStart = -1, hlEnd = -1, onTap }: Props) {
  const tokens = useMemo(() => segmenter.segment(text), [text, segmenter]);

  // vị trí bắt đầu (tính theo ký tự) của từng token, để cắt câu chứa từ
  const offsets = useMemo(() => {
    let o = 0;
    return tokens.map((t) => {
      const start = o;
      o += [...t.text].length;
      return start;
    });
  }, [tokens]);

  const handleClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-t]');
    if (!el) return;
    const ti = Number(el.dataset.t);
    onTap(index, ti, tokens[ti].text, offsets[ti]);
  };

  return (
    <p class="para" data-p={index} onClick={handleClick}>
      {tokens.map((t, i) => {
        const hl = offsets[i] >= hlStart && offsets[i] < hlEnd ? ' hl' : '';
        return t.isWord ? (
          <span
            key={i}
            data-t={i}
            data-o={offsets[i]}
            class={`tok${saved.has(t.text) ? ' saved' : ''}${selectedToken === i ? ' selected' : ''}${hl}`}
          >
            {t.text}
          </span>
        ) : (
          <span key={i} data-o={offsets[i]} class={hl.trim() || undefined}>
            {t.text}
          </span>
        );
      })}
    </p>
  );
});
