// services/tocTitles.ts — Tên chương để HIỂN THỊ. Nhiều EPUB đặt tên chương chỉ là số ("2", "3") nằm dưới
// một phần ("第一部 1"); hiển thị trần thì không biết số đó thuộc phần nào. Hàm này ghép tên phần vào:
// "第一部 1", "2" -> "第一部 1", "第一部 2". Không sửa dữ liệu đã lưu, chỉ đổi cách hiện.

const PART = /^(第[\d一二三四五六七八九十百零〇两兩]+[部卷篇集章回])\s*/;
const BARE_NUMBER = /^[\d一二三四五六七八九十百零〇两兩]+\.?$/;
const TOC_PAGE = /^(目\s*錄|目\s*录|contents?|table of contents|mục lục)$/i;

export function displayTitles(titles: string[]): string[] {
  let part = '';
  return titles.map((raw) => {
    const t = raw.trim();
    const m = PART.exec(t);
    if (m) {
      part = m[1];
      return t;
    }
    return part && BARE_NUMBER.test(t) ? `${part} ${t}` : t;
  });
}

/** Chương này là trang mục lục có sẵn trong file EPUB (chữ trần, không bấm được). */
export function isTocPage(title: string): boolean {
  return TOC_PAGE.test(title.trim());
}
