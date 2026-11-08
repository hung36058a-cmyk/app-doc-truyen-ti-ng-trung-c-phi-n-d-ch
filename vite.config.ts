// vite.config.ts — Cấu hình build. Output vào dist/, sau đó scripts/make-artifact.mjs
// gộp JS + CSS vào một trang để đăng lên claude.ai.
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [preact()],
  base: './',
  // thời điểm build (giờ Đài Loan), hiện trong Cài đặt để biết điện thoại đã nhận bản mới chưa
  define: {
    __BUILD__: JSON.stringify(new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')),
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
