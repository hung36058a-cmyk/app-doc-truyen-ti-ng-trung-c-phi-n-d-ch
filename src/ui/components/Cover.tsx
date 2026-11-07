// ui/components/Cover.tsx — Bìa truyện tự tạo từ 2 chữ đầu tên truyện (EPUB không cần ảnh bìa).

const COLORS = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)'];

export function Cover({ title, class: cls = '' }: { title: string; class?: string }) {
  const chars = [...title.replace(/[\s《》「」]/g, '')];
  const hash = chars.reduce((h, c) => h + c.codePointAt(0)!, 0);
  return (
    <div class={`cover ${cls}`} style={{ background: COLORS[hash % COLORS.length] }} aria-hidden="true">
      {chars.slice(0, 2).join('')}
    </div>
  );
}
