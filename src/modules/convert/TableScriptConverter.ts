// modules/convert/TableScriptConverter.ts — Chuyển Giản → Phồn bằng bảng tra s2t.tsv (tạo từ OpenCC bằng
// scripts/build-s2t.mjs). Cách chuyển: ở mỗi vị trí, lấy cụm dài nhất có trong bảng (头发 → 頭髮, 皇后 giữ 后);
// không có thì để nguyên chữ đó. Bảng chỉ được tải khi cần, không làm app mở chậm hơn.

import type { ScriptConverter } from './ScriptConverter';

/** Tỉ lệ chữ Giản thể (trên tổng chữ Hán) từ mức này trở lên thì coi là truyện Giản thể. */
const SIMPLIFIED_RATIO = 0.02;
/** Chỉ xét chừng này chữ Hán đầu tiên khi đoán, cho nhanh. */
const SAMPLE_HAN = 5000;
const HAN = /\p{Script=Han}/u;

export class TableScriptConverter implements ScriptConverter {
  private table = new Map<string, string>();
  private maxLen = 1;
  /** Chữ chắc chắn là Giản thể: có trong bảng nhưng không phải chữ Phồn thể (后, 里, 干 vẫn là chữ Phồn nên không tính). */
  private simplifiedOnly = new Set<string>();
  private loading: Promise<void> | null = null;

  constructor(private url: string) {}

  load(): Promise<void> {
    this.loading ??= (async () => {
      const res = await fetch(this.url);
      if (!res.ok) throw new Error(`Không tải được bảng chuyển chữ (${res.status})`);
      for (const line of (await res.text()).split('\n')) {
        const tab = line.indexOf('\t');
        if (tab <= 0) continue;
        const src = line.slice(0, tab);
        this.table.set(src, line.slice(tab + 1));
        this.maxLen = Math.max(this.maxLen, src.length);
      }
      const tradChars = new Set<string>();
      for (const v of this.table.values()) for (const ch of v) tradChars.add(ch);
      for (const [src, v] of this.table) if ([...src].length === 1 && v !== src && !tradChars.has(src)) this.simplifiedOnly.add(src);
    })().catch((e) => {
      this.loading = null; // cho phép thử lại lần sau
      throw e;
    });
    return this.loading;
  }

  toTraditional(text: string): string {
    if (this.table.size === 0) throw new Error('Chưa tải bảng chuyển chữ: gọi load() trước');
    let out = '';
    for (let i = 0; i < text.length; ) {
      let hit = '';
      let len = 0;
      for (let l = Math.min(this.maxLen, text.length - i); l >= 1; l--) {
        const v = this.table.get(text.substr(i, l));
        if (v !== undefined) { hit = v; len = l; break; }
      }
      if (len) { out += hit; i += len; }
      else {
        const cp = text.codePointAt(i)!;
        const n = cp > 0xffff ? 2 : 1;
        out += text.substr(i, n);
        i += n;
      }
    }
    return out;
  }

  looksSimplified(text: string): boolean {
    let han = 0;
    let simp = 0;
    for (const ch of text) {
      if (!HAN.test(ch)) continue;
      han++;
      if (this.simplifiedOnly.has(ch)) simp++;
      if (han >= SAMPLE_HAN) break;
    }
    return han > 0 && simp / han >= SIMPLIFIED_RATIO;
  }
}
