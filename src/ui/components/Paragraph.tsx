// ui/components/Paragraph.tsx — Một đoạn văn đã tách từ. Mỗi từ là một <span> chạm được.
// Dấu câu cũng nằm trong <span data-o> để bấm giữ ở đâu cũng biết vị trí, và để tô sáng đúng một câu.
// Từ/cụm đang chọn: nền xanh (cả cụm khi AI nhận ra collocation) · Từ đã lưu: nền vàng · từ đã tra nhưng chưa lưu: gạch chân chấm.
// Chỉ tính lại khi đoạn văn, danh sách từ đã lưu/đã tra, từ đang chọn hoặc vùng tô sáng thay đổi.

import { memo } from 'preact/compat';
import { useMemo } from 'preact/hooks';
import type { Segmenter } from '@/modules/segmenter/Segmenter';

interface Props {
  index: number;
  text: string;
  segmenter: Segmenter;
  saved: Set<string>;
  looked: Set<string>; // từ đã từng tra
  selStart?: number; // khoảng ký tự đang chọn trong đoạn này (từ vừa chạm, hoặc cả cụm); -1 = không chọn
  selEnd?: number;
  hlStart?: number; // vùng đang tô sáng (vị trí ký tự), ví dụ câu đang dịch; -1 = không tô
  hlEnd?: number;
  onTap: (paraIndex: number, tokenIndex: number, word: string, charOffset: number) => void;
}

export const Paragraph = memo(function Paragraph({ index, text, segmenter, saved, looked, selStart = -1, selEnd = -1, hlStart = -1, hlEnd = -1, onTap }: Props) {
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
        // tô sáng mọi từ chạm vào vùng [hlStart, hlEnd), kể cả từ chỉ bị chọn một phần
        const hl = offsets[i] < hlEnd && offsets[i] + [...t.text].length > hlStart ? ' hl' : '';
        return t.isWord ? (
          <span
            key={i}
            data-t={i}
            data-o={offsets[i]}
            class={`tok${saved.has(t.text) ? ' saved' : looked.has(t.text) ? ' looked' : ''}${offsets[i] >= selStart && offsets[i] < selEnd ? ' selected' : ''}${hl}`}
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
