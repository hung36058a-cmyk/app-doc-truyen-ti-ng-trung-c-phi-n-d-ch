// ui/components/ChapterEnd.tsx — Thẻ tổng kết ở cuối mỗi chương: "Hết chương X / N",
// các từ đã lưu trong chương này (chạm để tra lại), nút lớn sang chương sau.

interface Props {
  chapter: number; // chỉ số chương, từ 0
  count: number; // tổng số chương
  savedHere: string[]; // các từ đã lưu trong chương này
  onGo: (index: number) => void;
  onWord: (word: string) => void;
}

/** Số từ hiện tối đa trên thẻ; nhiều hơn thì ghi "+N". */
const MAX_CHIPS = 12;

export function ChapterEnd({ chapter, count, savedHere, onGo, onWord }: Props) {
  const last = chapter >= count - 1;
  return (
    <section class="chapter-end" aria-label="Hết chương">
      <div class="chapter-end-kicker">{last ? 'Hết truyện' : `Hết chương ${chapter + 1} / ${count}`}</div>
      <div class="chapter-end-title">
        {savedHere.length > 0 ? `Chương này bạn lưu ${savedHere.length} từ` : 'Chương này chưa lưu từ nào'}
      </div>
      {savedHere.length > 0 && (
        <div class="chapter-end-words" lang="zh-Hant">
          {savedHere.slice(0, MAX_CHIPS).map((w) => (
            <button key={w} class="chip" onClick={() => onWord(w)}>{w}</button>
          ))}
          {savedHere.length > MAX_CHIPS && <span class="meta">+{savedHere.length - MAX_CHIPS}</span>}
        </div>
      )}
      <div class="chapter-end-actions">
        {!last && (
          <button class="btn btn-primary chapter-end-next" onClick={() => onGo(chapter + 1)}>
            Chương sau ›
          </button>
        )}
        {chapter > 0 && (
          <button class="btn btn-ghost" onClick={() => onGo(chapter - 1)}>‹ Chương trước</button>
        )}
      </div>
    </section>
  );
}
