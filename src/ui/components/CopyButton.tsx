// ui/components/CopyButton.tsx — Nút chép chữ. Bấm xong icon đổi thành dấu ✓ khoảng 1,5 giây để biết đã chép.
// Dùng ở: thanh chọn chữ, khung dịch, bảng tra từ. Muốn thêm chỗ khác: <CopyButton text={...} />.

import { useEffect, useRef, useState } from 'preact/hooks';
import { copyText } from '@/modules/clipboard/copy';
import { IconCheck, IconCopy } from '../icons';

interface Props {
  text: string | (() => string); // hàm = lấy chữ lúc bấm (vd phần đang chọn)
  label?: string; // chữ đọc cho người khiếm thị, mặc định "Sao chép"
  size?: number;
  class?: string;
}

export function CopyButton(p: Props) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async (e: Event) => {
    e.stopPropagation();
    const text = typeof p.text === 'function' ? p.text() : p.text;
    const ok = await copyText(text);
    setState(ok ? 'ok' : 'fail');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1500);
  };

  const label = state === 'ok' ? 'Đã chép' : state === 'fail' ? 'Không chép được' : p.label ?? 'Sao chép';
  return (
    <button class={`icon-btn copy-btn${state === 'ok' ? ' is-done' : state === 'fail' ? ' is-fail' : ''} ${p.class ?? ''}`} aria-label={label} title={label} onClick={onClick}>
      {state === 'ok' ? <IconCheck size={p.size ?? 20} /> : <IconCopy size={p.size ?? 20} />}
    </button>
  );
}
