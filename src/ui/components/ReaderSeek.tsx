// ui/components/ReaderSeek.tsx — Thanh kéo nhanh DỌC ở mép phải trang đọc (kiểu "fast scroll"):
// đặt ngón tay lên nút rồi kéo lên/xuống để chạy ngay tới chỗ muốn đọc trong chương, không cần vuốt từng màn hình.
// Trên = đầu chương, dưới = cuối chương. Khi kéo có hiện "trang a/b" cạnh nút.

import { useRef, useState } from 'preact/hooks';

interface Props {
  page: number;
  pages: number;
  fraction: number; // đã đọc bao nhiêu phần của chương, 0..1 (vị trí nút)
  onSeek: (fraction: number) => void;
  onSeeking: (active: boolean) => void;
}

const THUMB = 56; // chiều cao nút (px)

export function ReaderSeek({ page, pages, fraction, onSeek, onSeeking }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null); // khi kéo, nút bám sát ngón tay

  const move = (clientY: number) => {
    const r = track.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientY - r.top - THUMB / 2) / Math.max(1, r.height - THUMB)));
    setDragFraction(f);
    onSeek(f);
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDragFraction(null);
    onSeeking(false);
  };

  const shown = dragFraction ?? fraction;
  return (
    <div
      class={`vseek${dragFraction !== null ? ' is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Kéo lên xuống để chuyển nhanh trong chương"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-valuetext={`Trang ${page} trên ${pages}`}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onSeeking(true);
        move(e.clientY);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -0.05 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 0.05 : 0;
        if (!step) return;
        e.preventDefault();
        onSeek(Math.min(1, Math.max(0, fraction + step)));
      }}
    >
      <div class="vseek-track" ref={track}>
        <span class="vseek-thumb" style={{ top: `calc((100% - ${THUMB}px) * ${shown})`, height: `${THUMB}px` }}>
          {dragFraction !== null && <span class="vseek-tip">{page}/{pages}</span>}
        </span>
      </div>
    </div>
  );
}
