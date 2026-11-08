// ui/components/ReaderStatus.tsx — Thanh trạng thái sát mép dưới trang đọc (giống Moon Reader):
// trái = pin + giờ, giữa = "Chương X (trang a/b)", phải = % đã đọc cả cuốn.

import { useEffect, useState } from 'preact/hooks';

interface Props {
  chapterNo: number; // số thứ tự chương, từ 1
  page: number;
  pages: number;
  percent: number;
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

export function ReaderStatus({ chapterNo, page, pages, percent }: Props) {
  const now = useClock();
  const battery = useBattery();
  return (
    <footer class="reader-status" aria-label="Tiến độ đọc">
      <span class="status-left">
        {battery !== null && <span class="status-battery">{battery}</span>}
        {now}
      </span>
      <span class="status-mid">Chương {chapterNo} ({page}/{pages})</span>
      <span class="status-right">{percent.toFixed(1)}%</span>
    </footer>
  );
}
