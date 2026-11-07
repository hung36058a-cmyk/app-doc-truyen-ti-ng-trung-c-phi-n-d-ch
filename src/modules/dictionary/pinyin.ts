// modules/dictionary/pinyin.ts — Đổi pinyin dạng số ("cheng1 hu5") sang dạng dấu thanh ("chēng hu").

const TONES: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

function syllable(raw: string): string {
  const m = /^([a-zü:]+)([1-5])$/i.exec(raw);
  if (!m) return raw.replace(/u:/g, 'ü');
  let s = m[1].replace(/u:/gi, 'ü');
  const tone = Number(m[2]);
  if (tone === 5) return s;
  const lower = s.toLowerCase();
  // Quy tắc đặt dấu: a/e trước, rồi "ou", rồi nguyên âm cuối cùng
  let idx = lower.search(/[ae]/);
  if (idx === -1) idx = lower.indexOf('ou');
  if (idx === -1) {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iouü'.includes(lower[i])) { idx = i; break; }
    }
  }
  if (idx === -1) return s;
  const v = lower[idx];
  let marked = TONES[v][tone - 1];
  if (s[idx] !== v) marked = marked.toUpperCase();
  return s.slice(0, idx) + marked + s.slice(idx + 1);
}

export function numberedToMarked(pinyin: string): string {
  return pinyin.split(' ').map(syllable).join(' ');
}
