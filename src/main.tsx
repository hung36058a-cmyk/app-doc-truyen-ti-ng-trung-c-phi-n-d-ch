// main.tsx — Điểm khởi động: gắn App vào trang; khi chạy như app riêng (không phải trong claude.ai)
// thì đăng ký service worker để cài được lên màn hình chính và dùng offline.

import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';

render(<App />, document.getElementById('app')!);

const standaloneSite = window.top === window && location.protocol !== 'file:';
if (standaloneSite && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* không đăng ký được thì app vẫn chạy bình thường, chỉ không có offline */
    });
  });
}
