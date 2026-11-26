// services/hanvietMigration.ts — Sửa âm Hán Việt của các từ đã lưu trước bản 4.5.
// Bản cũ lấy "Hán Việt" từ Unihan kVietnamese (thật ra là âm Nôm: 你=nể, 鏡=kẻng) nên nhiều từ lưu sai.
// Chạy một lần sau khi từ điển tải xong; đánh dấu bằng localStorage để không chạy lại.

import type { Dictionary } from '@/modules/dictionary/Dictionary';
import type { WordRepo } from '@/modules/storage/Storage';
import { mergeHanviet } from './MeaningService';

const FLAG = 'hanviet-fix-v2';

export async function fixSavedHanviet(dict: Dictionary, words: WordRepo): Promise<number> {
  try {
    if (localStorage.getItem(FLAG)) return 0;
  } catch {
    return 0;
  }
  // dữ liệu chưa phải bản mới (vd service worker cũ trả file cũ) → để lần mở sau chạy lại
  if (dict.hanviet('你鏡') !== 'nễ kính') return 0;
  let changed = 0;
  for (const { word } of await words.list()) {
    const w = await words.get(word); // đọc lại ngay trước khi ghi, tránh đè thay đổi mới hơn
    if (!w) continue;
    const fresh = mergeHanviet(dict.lookup(w.word)?.hanviet ?? dict.hanviet(w.word), w.hanviet);
    if (fresh === w.hanviet) continue;
    // thẻ Anki: chỉ thay khi người dùng chưa tự sửa ô Hán Việt (còn giống giá trị cũ)
    const card = w.card && w.card.hanviet === w.hanviet ? { ...w.card, hanviet: fresh } : w.card;
    await words.save({ ...w, hanviet: fresh, card });
    changed++;
  }
  try {
    localStorage.setItem(FLAG, String(Date.now()));
  } catch {
    /* bỏ qua */
  }
  return changed;
}
