// ui/components/Cover.tsx — Bìa truyện. Có ảnh bìa trong file EPUB thì dùng ảnh đó;
// không có thì tự vẽ: ĐỦ TÊN TRUYỆN viết dọc, chữ vàng trên nền tối, viền mảnh, màu nền riêng theo từng truyện.
// Muốn thêm màu bìa: thêm token --cover-N trong styles.css rồi thêm vào COLORS.

const COLORS = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)', 'var(--cover-4)', 'var(--cover-5)', 'var(--cover-6)'];
/** Số chữ tối đa trên một cột; tên dài hơn thì chia nhiều cột, quá MAX_CHARS thì cắt bớt. */
const PER_COLUMN = 6;
const MAX_CHARS = 18;

/** Bỏ khoảng trắng và ngoặc trang trí để lấy đúng tên truyện. */
const cleanTitle = (title: string) => title.replace(/[\s《》「」『』【】()（）\[\]]/g, '');

/** Cùng một tên truyện luôn ra cùng một màu. */
export function coverColor(title: string): string {
  const hash = [...cleanTitle(title)].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);
  return COLORS[hash % COLORS.length];
}

export function Cover({ title, image, class: cls = '' }: { title: string; image?: string; class?: string }) {
  if (image) {
    return (
      <div class={`cover cover-photo ${cls}`} aria-hidden="true">
        <img src={image} alt="" loading="lazy" />
      </div>
    );
  }
  const all = [...cleanTitle(title)];
  const chars = all.length > MAX_CHARS ? [...all.slice(0, MAX_CHARS - 1), '…'] : all;
  const columns = Math.max(1, Math.ceil(chars.length / PER_COLUMN));
  const rows = Math.max(2, Math.ceil(chars.length / columns)); // số chữ trên cột dài nhất -> cỡ chữ
  return (
    <div class={`cover ${cls}`} style={{ background: coverColor(title), '--rows': rows, '--cols': columns }} aria-hidden="true">
      <span class="cover-name">{chars.join('') || '書'}</span>
    </div>
  );
}
