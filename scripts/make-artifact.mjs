// scripts/make-artifact.mjs — Sau khi vite build: gộp JS + CSS vào một trang duy nhất (artifact/index.html)
// đúng chuẩn trang artifact claude.ai (không có thẻ doctype/html/head/body; JS, CSS nằm ngay trong trang),
// và chép dữ liệu từ điển sang artifact/data/.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const out = 'artifact';
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const jsPath = /<script[^>]+src="\.\/(assets\/[^"]+\.js)"/.exec(html)?.[1];
const cssPath = /<link[^>]+href="\.\/(assets\/[^"]+\.css)"/.exec(html)?.[1];
if (!jsPath || !cssPath) throw new Error('Không tìm thấy file JS/CSS trong dist/index.html');

const js = readFileSync(join(dist, jsPath), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(dist, cssPath), 'utf8');

const page = `<title>Đọc Truyện</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@500;700&display=swap">
<style>${css}</style>
<div id="app"></div>
<script type="module">${js}</script>
`;

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'data'), { recursive: true });
writeFileSync(join(out, 'index.html'), page);
for (const f of readdirSync(join(dist, 'data'))) copyFileSync(join(dist, 'data', f), join(out, 'data', f));
console.log(`artifact/index.html: ${(page.length / 1024).toFixed(0)} KB`);
