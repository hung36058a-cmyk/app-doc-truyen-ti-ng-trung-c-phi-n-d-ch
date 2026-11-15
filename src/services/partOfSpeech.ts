// services/partOfSpeech.ts — Chuẩn hoá loại từ để hiện gọn trong bong bóng tra từ.
// Từ đơn: viết tắt tiếng Anh cơ bản (N, V, ADJ…). Cụm: ghi tiếng Việt (cụm danh từ, cụm động từ…).
// AI (hoặc nghĩa cũ đã lưu trong từ điển riêng) có thể trả "danh từ", "noun", "N"… -> đều quy về một nhãn.
// Muốn thêm/bớt loại từ: chỉ sửa hai bảng dưới.

/** Loại từ của TỪ ĐƠN: nhãn hiện ra -> các cách viết AI hay trả về (viết thường). */
const WORD_POS: [string, string[]][] = [
  ['N', ['n', 'noun', 'danh từ', 'danh tu']],
  ['V', ['v', 'verb', 'động từ', 'dong tu']],
  ['ADJ', ['adj', 'adjective', 'tính từ', 'tinh tu']],
  ['ADV', ['adv', 'adverb', 'phó từ', 'trạng từ', 'pho tu', 'trang tu']],
  ['PRON', ['pron', 'pronoun', 'đại từ', 'dai tu']],
  ['NUM', ['num', 'numeral', 'number', 'số từ', 'so tu']],
  ['MW', ['mw', 'cl', 'classifier', 'measure word', 'lượng từ', 'luong tu']],
  ['PREP', ['prep', 'preposition', 'giới từ', 'gioi tu']],
  ['CONJ', ['conj', 'conjunction', 'liên từ', 'lien tu']],
  ['PART', ['part', 'particle', 'trợ từ', 'tro tu']],
  ['INTJ', ['intj', 'interj', 'interjection', 'thán từ', 'than tu']],
];

/** Loại của CỤM. */
const PHRASE_POS: [string, string[]][] = [
  ['cụm danh từ', ['cụm danh từ', 'np', 'noun phrase']],
  ['cụm động từ', ['cụm động từ', 'vp', 'verb phrase']],
  ['cụm tính từ', ['cụm tính từ', 'adjp', 'adjective phrase']],
  ['thành ngữ', ['thành ngữ', 'idiom', 'chengyu']],
];

/** Mã cho AI chọn (dùng trong prompt). */
export const POS_CODES_WORD = WORD_POS.map(([label]) => label).join(', ');
export const POS_CODES_PHRASE = PHRASE_POS.map(([label]) => label).join(', ');

function match(table: [string, string[]][], s: string): string {
  for (const [label, names] of table) if (names.includes(s)) return label;
  return '';
}

/**
 * Nhãn loại từ để hiện. isPhrase = đang hiện cả cụm (nhiều từ).
 * Không nhận ra thì trả '' (không hiện gì, tránh nhãn lạ hoặc dài dòng).
 */
export function posLabel(raw: string | undefined, isPhrase: boolean): string {
  // AI đôi khi trả "động từ, danh từ" -> lấy loại đầu tiên
  const s = String(raw ?? '').trim().toLowerCase().split(/[,;/、|]/)[0].replace(/[.()]/g, '').trim();
  if (!s) return '';
  if (isPhrase) {
    const p = match(PHRASE_POS, s);
    if (p) return p;
    // cụm mà AI ghi loại của từ đơn: danh từ -> cụm danh từ…
    const w = match(WORD_POS, s);
    return w === 'N' ? 'cụm danh từ' : w === 'V' ? 'cụm động từ' : w === 'ADJ' ? 'cụm tính từ' : '';
  }
  const w = match(WORD_POS, s);
  if (w) return w;
  return s === 'thành ngữ' || s === 'idiom' || s === 'chengyu' ? 'thành ngữ' : '';
}
