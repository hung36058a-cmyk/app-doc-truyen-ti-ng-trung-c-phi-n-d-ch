// ui/components/ChapterNav.tsx — Hai nút "Chương trước / Chương sau", đặt ở đầu và cuối mỗi chương.

interface Props {
  chapter: number;
  count: number;
  onGo: (index: number) => void;
  place: 'top' | 'bottom';
}

export function ChapterNav({ chapter, count, onGo, place }: Props) {
  return (
    <nav class={`chapter-nav chapter-nav-${place}`} aria-label="Chuyển chương">
      <button class="btn" disabled={chapter === 0} onClick={() => onGo(chapter - 1)}>‹ Chương trước</button>
      <button class="btn btn-primary" disabled={chapter >= count - 1} onClick={() => onGo(chapter + 1)}>
        Chương sau ›
      </button>
    </nav>
  );
}
