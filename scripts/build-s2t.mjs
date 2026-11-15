// scripts/build-s2t.mjs — Tạo public/data/s2t.tsv: bảng chuyển Giản thể → Phồn thể (chuẩn chữ Đài Loan)
// từ dữ liệu OpenCC (gói opencc-js, chỉ cần lúc build). Mỗi dòng: "giản<TAB>phồn".
// Có cả cụm từ (头发→頭髮, 皇后 giữ 后) để chọn đúng chữ khi một chữ giản ứng với nhiều chữ phồn.
// Chạy lại khi muốn cập nhật dữ liệu:  node scripts/build-s2t.mjs
// App chỉ tải file này khi người dùng bấm chuyển (xem modules/convert/OpenccTableConverter.ts).

import { writeFileSync } from 'node:fs';
import * as OpenCC from 'opencc-js/cn2t';

const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });
const keys = new Set();
for (const group of OpenCC.Locale.from.cn) {
  for (const dict of Array.isArray(group) ? group : [group]) {
    const entries = typeof dict === 'string' ? dict.split('|').map((e) => e.split(' ')) : dict;
    for (const [src] of entries) if (src) keys.add(src);
  }
}

const lines = [];
for (const k of [...keys].sort()) {
  const v = convert(k);
  if ([...v].length !== [...k].length) continue; // chỉ nhận chuyển 1 chữ ↔ 1 chữ để vị trí không lệch
  // chữ lẻ giống nhau thì bỏ cho nhẹ; cụm từ giống nhau vẫn giữ để chặn chuyển sai (皇后 không thành 皇後)
  if (v !== k || [...k].length > 1) lines.push(`${k}\t${v}`);
}
writeFileSync('public/data/s2t.tsv', lines.join('\n') + '\n');
console.log(`public/data/s2t.tsv: ${lines.length} dòng`);
