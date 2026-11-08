// ui/screens/LibraryScreen.tsx — Màn Thư viện: thẻ "Đọc tiếp" (kèm số từ đã lưu từ truyện đó), chip lọc
// Tất cả / Đang đọc / Chưa đọc / Xong, lưới bìa 3 cột, tải EPUB lên, bấm giữ một truyện để xóa.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { BookSummary, ReadingProgress } from '@/core/types';
import { parseEpub, EpubError } from '@/modules/epub/parseEpub';
import { sampleBook } from '@/services/sampleBook';
import { useServices } from '../context';
import { Cover } from '../components/Cover';
import { IconPlus } from '../icons';

const SEEDED_KEY = 'doc-truyen:sample-seeded';

type Filter = 'all' | 'reading' | 'unread' | 'done';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'reading', label: 'Đang đọc' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'done', label: 'Xong' },
];
/** Từ mức này trở lên coi như đã đọc xong. */
const DONE_PERCENT = 95;

function bookStatus(book: BookSummary, p?: ReadingProgress): Exclude<Filter, 'all'> {
  if (!p) return 'unread';
  return percentRead(book, p) >= DONE_PERCENT ? 'done' : 'reading';
}

/** % đã đọc, tính theo chương và đoạn đang đọc. */
export function percentRead(book: BookSummary, p?: ReadingProgress): number {
  if (!p || book.chapterCount === 0) return 0;
  return Math.min(100, Math.round(((p.chapterIndex + (p.paragraphIndex > 0 ? 0.5 : 0)) / book.chapterCount) * 100));
}

export function LibraryScreen({ onOpen }: { onOpen: (bookId: string) => void }) {
  const { storage } = useServices();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ReadingProgress>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [managing, setManaging] = useState<BookSummary | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [wordCount, setWordCount] = useState<Record<string, number>>({}); // số từ đã lưu theo truyện
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [list, all, words] = await Promise.all([storage.books.list(), storage.progress.all(), storage.words.list()]);
    setBooks(list);
    const counts: Record<string, number> = {};
    for (const w of words) counts[w.bookId] = (counts[w.bookId] ?? 0) + 1;
    setWordCount(counts);
    setProgress(Object.fromEntries(all.map((p) => [p.bookId, p])));
  };

  useEffect(() => {
    (async () => {
      let seeded = false;
      try { seeded = localStorage.getItem(SEEDED_KEY) === '1'; } catch { /* bỏ qua */ }
      if (!seeded) {
        await storage.books.save(sampleBook());
        try { localStorage.setItem(SEEDED_KEY, '1'); } catch { /* bỏ qua */ }
      }
      await refresh();
    })().catch(() => setError('Không đọc được dữ liệu đã lưu trên máy.'));
  }, []);

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    // Không lọc loại file ở bộ chọn (Android hay làm mờ file .epub vì không nhận ra loại), nên kiểm tra ở đây
    if (!/\.epub$/i.test(file.name) && file.type !== 'application/epub+zip') {
      setError(`"${file.name}" không phải file .epub.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const book = await parseEpub(file, file.name.replace(/\.epub$/i, ''));
      await storage.books.save(book);
      await refresh();
    } catch (err) {
      setError(
        err instanceof EpubError
          ? err.message
          : `Không mở được file này (${(err as Error)?.message || 'lỗi không rõ'}). Hãy thử một file .epub khác.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await storage.books.remove(id);
    setManaging(null);
    await refresh();
  };

  const recent = books
    ?.filter((b) => progress[b.id])
    .sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt)[0];

  return (
    <main class="screen">
      <header class="screen-head">
        <h1>Thư viện</h1>
        {/* label nối thẳng với ô chọn file: chạy được cả trong WebView, nơi click() bằng code hay bị chặn */}
        <label class={`btn btn-primary btn-pill${busy ? ' is-disabled' : ''}`} for="epub-input">
          <IconPlus />
          {busy ? 'Đang mở…' : 'Tải EPUB'}
        </label>
        <input ref={fileInput} type="file" class="sr-only" id="epub-input" onChange={onFile} disabled={busy} />
      </header>

      {error && <p class="notice notice-error" role="alert">{error}</p>}

      {recent && (
        <button class="continue-card" onClick={() => onOpen(recent.id)}>
          <Cover title={recent.title} showTitle={false} />
          <div class="continue-info">
            <span class="continue-kicker">Đọc tiếp</span>
            <div class="continue-title">{recent.title}</div>
            <div class="meta">
              Chương {progress[recent.id].chapterIndex + 1} / {recent.chapterCount}
              {wordCount[recent.id] ? ` · ${wordCount[recent.id]} từ đã lưu` : ''}
            </div>
            <div class="continue-bottom">
              <div class="progress"><span style={{ width: `${percentRead(recent, progress[recent.id])}%` }} /></div>
              <span class="continue-pct">{percentRead(recent, progress[recent.id])}%</span>
            </div>
          </div>
        </button>
      )}

      {books && books.length > 0 && (
        <div class="filter-chips" role="tablist" aria-label="Lọc truyện">
          {FILTERS.map((f) => {
            const n = f.id === 'all' ? books.length : books.filter((b) => bookStatus(b, progress[b.id]) === f.id).length;
            return (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} <span class="filter-count">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {books === null ? (
        <p class="loading">Đang tải thư viện…</p>
      ) : (
        <div class="book-grid">
          {books
            .filter((b) => filter === 'all' || bookStatus(b, progress[b.id]) === filter)
            .map((b) => {
              const pct = progress[b.id] ? percentRead(b, progress[b.id]) : 0;
              return (
                <button
                  key={b.id}
                  class="book-tile"
                  onClick={() => onOpen(b.id)}
                  onContextMenu={(e) => { e.preventDefault(); setManaging(b); }}
                >
                  <div class="book-tile-cover">
                    <Cover title={b.title} />
                    {pct > 0 && <span class="tile-progress" style={{ width: `${pct}%` }} />}
                  </div>
                  <span class="book-tile-title">{b.title}</span>
                  <span class="meta">
                    {!progress[b.id] ? 'Chưa đọc' : pct >= DONE_PERCENT ? 'Đã xong' : `${pct}%`}
                    {wordCount[b.id] ? ` · ${wordCount[b.id]} từ` : ''}
                  </span>
                </button>
              );
            })}
          {filter === 'all' && (
            <label class="add-tile" for="epub-input">
              <IconPlus size={22} />
              Thêm truyện .epub
            </label>
          )}
        </div>
      )}

      {books && books.length > 0 && (
        <p class="meta" style={{ marginTop: '20px' }}>Bấm giữ một truyện để xóa khỏi thư viện.</p>
      )}

      {managing && (
        <div class="confirm-box" style={{ marginTop: '16px' }} role="dialog" aria-label="Xóa truyện">
          <div>Xóa <span class="han">{managing.title}</span> khỏi thư viện? Từ đã lưu vẫn giữ nguyên.</div>
          <div class="row">
            <button class="btn" onClick={() => setManaging(null)}>Giữ lại</button>
            <button class="btn btn-danger" onClick={() => remove(managing.id)}>Xóa truyện</button>
          </div>
        </div>
      )}
    </main>
  );
}
