// ui/components/Cover.tsx — Bìa truyện tự tạo (EPUB thường không có ảnh bìa):
// chữ Hán đầu tiên của tên truyện thật lớn, tên truyện nhỏ ở chân bìa, màu nền riêng theo từng truyện.
// Muốn thêm màu bìa: thêm token --cover-N trong styles.css rồi thêm vào COLORS.

const COLORS = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)', 'var(--cover-4)', 'var(--cover-5)', 'var(--cover-6)'];

/** Bỏ khoảng trắng và ngoặc trang trí để lấy đúng chữ đầu tiên có nghĩa. */
const cleanTitle = (title: string) => title.replace(/[\s《》「」『』【】()（）\[\]]/g, '');

/** Cùng một tên truyện luôn ra cùng một màu. */
export function coverColor(title: string): string {
  const hash = [...cleanTitle(title)].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);
  return COLORS[hash % COLORS.length];
}

export function Cover({ title, class: cls = '', showTitle = true }: { title: string; class?: string; showTitle?: boolean }) {
  const first = [...cleanTitle(title)][0] ?? '書';
  return (
    <div class={`cover ${cls}`} style={{ background: coverColor(title) }} aria-hidden="true">
      <span class="cover-char">{first}</span>
      {showTitle && <span class="cover-title">{title}</span>}
    </div>
  );
}
