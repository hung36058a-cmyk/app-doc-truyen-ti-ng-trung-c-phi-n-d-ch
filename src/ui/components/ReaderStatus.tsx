// ui/components/ReaderStatus.tsx — Thanh trạng thái sát mép dưới trang đọc (giống Moon Reader):
// trái = pin + giờ, giữa = "Chương X (trang a/b)", phải = % đã đọc cả cuốn.
// Phía trên là THANH KÉO NHANH: đặt ngón tay lên nút tròn rồi kéo sang trái/phải để chạy ngay tới chỗ muốn đọc
// trong chương (trái = đầu chương, phải = cuối chương), không cần vuốt từng màn hình.

import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  chapterNo: number; // số thứ tự chương, từ 1
  page: number;
  pages: number;
  percent: number;
  fraction: number; // đã đọc bao nhiêu phần của chương, 0..1 (vị trí nút kéo)
  onSeek: (fraction: number) => void; // kéo tới vị trí này trong chương
  onSeeking: (active: boolean) => void; // báo đang kéo / thả tay
}

const clock = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

interface BatteryLike {
  level: number;
  addEventListener: (type: 'levelchange', fn: () => void) => void;
  removeEventListener: (type: 'levelchange', fn: () => void) => void;
}

/** Giờ hiện tại, tự cập nhật mỗi 20 giây. */
function useClock() {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const id = window.setInterval(() => setNow(clock()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Mức pin (0..100), null nếu trình duyệt không cho biết. */
function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    let battery: BatteryLike | null = null;
    const update = () => battery && setLevel(Math.round(battery.level * 100));
    nav.getBattery?.().then((b) => { battery = b; update(); b.addEventListener('levelchange', update); }, () => {});
    return () => battery?.removeEventListener('levelchange', update);
  }, []);
  return level;
}

/** Thanh kéo nhanh vị trí trong chương. */
function SeekBar({ page, pages, fraction, onSeek, onSeeking }: Pick<Props, 'page' | 'pages' | 'fraction' | 'onSeek' | 'onSeeking'>) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null); // khi đang kéo, nút bám sát ngón tay

  const fractionAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)));
  };
  const move = (clientX: number) => {
    const f = fractionAt(clientX);
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
      class={`seek${dragFraction !== null ? ' is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Kéo để chuyển nhanh trong chương"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-valuetext={`Trang ${page} trên ${pages}`}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onSeeking(true);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={(e) => {
        const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -0.05 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 0.05 : 0;
        if (!step) return;
        e.preventDefault();
        onSeek(Math.min(1, Math.max(0, fraction + step)));
      }}
    >
      <div class="seek-track" ref={track}>
        <span class="seek-fill" style={{ width: `${shown * 100}%` }} />
        <span class="seek-knob" style={{ left: `${shown * 100}%` }}>
          {dragFraction !== null && <span class="seek-tip">{page}/{pages}</span>}
        </span>
      </div>
    </div>
  );
}

export function ReaderStatus({ chapterNo, page, pages, percent, fraction, onSeek, onSeeking }: Props) {
  const now = useClock();
  const battery = useBattery();
  return (
    <footer class="reader-status" aria-label="Tiến độ đọc">
      <SeekBar page={page} pages={pages} fraction={fraction} onSeek={onSeek} onSeeking={onSeeking} />
      <div class="status-row">
        <span class="status-left">
          {battery !== null && <span class="status-battery">{battery}</span>}
          {now}
        </span>
        <span class="status-mid">Chương {chapterNo} ({page}/{pages})</span>
        <span class="status-right">{percent.toFixed(1)}%</span>
      </div>
    </footer>
  );
}
