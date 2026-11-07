// ui/hooks/useLongPress.ts — Nhận biết "bấm giữ" trên một vùng (mặc định 500 ms, rê ngón > 10 px là hủy).
// Trả về các handler gắn vào phần tử, và hàm consumeClick() để bỏ qua cú "click" ngay sau khi bấm giữ.

import { useRef } from 'preact/hooks';

export function useLongPress<T>(
  pick: (target: HTMLElement) => T | null, // từ phần tử bị chạm, lấy ra thứ cần xử lý (null = bỏ qua)
  onLongPress: (value: T) => void,
  delay = 500,
) {
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };

  return {
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        fired.current = false;
        const value = pick(e.target as HTMLElement);
        if (value === null) return;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          fired.current = true;
          navigator.vibrate?.(15);
          onLongPress(value);
        }, delay);
      },
      onPointerMove: (e: PointerEvent) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onContextMenu: (e: Event) => e.preventDefault(), // chặn menu chép/chia sẻ của Android khi bấm giữ
    },
    /** Gọi trong onClick: trả true nếu click này là phần đuôi của một lần bấm giữ (nên bỏ qua). */
    consumeClick: () => {
      const was = fired.current;
      fired.current = false;
      return was;
    },
  };
}
