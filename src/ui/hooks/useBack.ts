// ui/hooks/useBack.ts — Nút / cử chỉ "Quay lại" của điện thoại chỉ lùi MỘT bước trong app:
// đóng lớp trên cùng (khung dịch, bảng tra từ, vùng đang tô chọn, trang đọc...) thay vì thoát app.
// Cách làm: khi còn ít nhất một lớp đang mở, app giữ sẵn MỘT mục "bẫy" trong lịch sử trình duyệt.
// Quay lại -> trình duyệt bỏ mục bẫy (không rời app) -> app đóng lớp trên cùng -> còn lớp thì đặt bẫy lại.

import { useEffect, useRef } from 'preact/hooks';

const layers: (() => void)[] = []; // lớp mở sau nằm cuối = đóng trước
let trapped = false; // đang có mục bẫy trong lịch sử
let ignore = 0; // số lần popstate do chính app gọi history.back() (không phải người dùng)
let timer: number | undefined;

function sync() {
  if (layers.length && !trapped) {
    history.pushState({ backTrap: true }, '');
    trapped = true;
  } else if (!layers.length && trapped) {
    // mọi lớp đã đóng bằng nút trong app: gỡ mục bẫy để lần Quay lại sau có tác dụng ngay
    trapped = false;
    ignore++;
    history.back();
  }
}

/** Gom nhiều thay đổi liền nhau (đóng lớp này, mở lớp khác) thành một lần chỉnh lịch sử. */
function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(sync, 60);
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore > 0) { ignore--; return; }
    if (!trapped) return; // điều hướng bình thường (đổi tab bằng hash)
    trapped = false;
    layers[layers.length - 1]?.();
    schedule();
  });
}

/** Khi active = true, một lần Quay lại sẽ gọi onBack (thường là đóng lớp đó) thay vì rời trang. */
export function useBack(active: boolean, onBack: () => void) {
  const latest = useRef(onBack);
  latest.current = onBack;
  useEffect(() => {
    if (!active) return;
    const handler = () => latest.current();
    layers.push(handler);
    schedule();
    return () => {
      const i = layers.indexOf(handler);
      if (i >= 0) layers.splice(i, 1);
      schedule();
    };
  }, [active]);
}
