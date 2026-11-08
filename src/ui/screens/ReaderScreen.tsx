// ui/screens/ReaderScreen.tsx — Trang đọc: hiện chương, chạm từ để tra, lưu từ, nhớ vị trí đọc, mục lục,
// bấm giữ một chữ để dịch câu chứa nó (trong khung có nút dịch cả đoạn), chạm chỗ trống (hoặc nút Aa)
// để mở thanh chỉnh hiển thị.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppSettings, Book, DictEntry, ReaderDisplay, VietMeaning } from '@/core/types';
import { sentenceAt, splitSentences } from '@/services/sentence';
import { useServices } from '../context';
import { Paragraph } from '../components/Paragraph';
import { WordSheet } from '../components/WordSheet';
import { TocSheet } from '../components/TocSheet';
import { displayTitles, isTocPage } from '@/services/tocTitles';
import { TranslationSheet, type TransMode } from '../components/TranslationSheet';
import { DisplayBar } from '../components/DisplayBar';
import { useLongPress } from '../hooks/useLongPress';
import { IconBack, IconList } from '../icons';
import type { DictState } from '../App';

interface Props {
  bookId: string;
  dictState: DictState;
  settings: AppSettings;
  onSettings: (patch: Partial<AppSettings>) => void;
  onClose: () => void;
}

interface Selection {
  para: number;
  token: number;
  word: string; // từ đang xem trong popup (có thể là 1 chữ con khi tra từng chữ)
  sentence: string;
}

export function ReaderScreen({ bookId, dictState, settings, onSettings, onClose }: Props) {
  const { storage, segmenter } = useServices();
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Selection | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  // khung dịch đang mở: đoạn nào, câu thứ mấy, dịch câu hay cả đoạn
  const [trans, setTrans] = useState<{ para: number; sentence: number; mode: TransMode } | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<number | null>(null);

  // tải truyện, vị trí đọc và từ đã lưu
  useEffect(() => {
    (async () => {
      const [b, p, words] = await Promise.all([
        storage.books.get(bookId),
        storage.progress.get(bookId),
        storage.words.list(),
      ]);
      if (!b) return onClose();
      setBook(b);
      setSaved(new Set(words.map((w) => w.word)));
      const ch = Math.min(p?.chapterIndex ?? 0, b.chapters.length - 1);
      setChapter(ch);
      restoreTo.current = p?.paragraphIndex ?? 0;
    })();
  }, [bookId]);

  // cuộn tới đoạn đang đọc dở sau khi chương hiện ra
  useLayoutEffect(() => {
    if (!book || dictState !== 'ready' || restoreTo.current === null || !body.current) return;
    const target = body.current.querySelector<HTMLElement>(`[data-p="${restoreTo.current}"]`);
    body.current.scrollTop = target ? target.offsetTop - 16 : 0;
    restoreTo.current = null;
  }, [book, chapter, dictState]);

  // lưu vị trí: đoạn đầu tiên còn thấy trên màn hình
  const saveTimer = useRef<number>();
  const onScroll = () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const el = body.current;
      if (!el || !book) return;
      const paras = el.querySelectorAll<HTMLElement>('[data-p]');
      let idx = 0;
      for (const p of paras) {
        if (p.offsetTop + p.offsetHeight > el.scrollTop + 8) { idx = Number(p.dataset.p); break; }
      }
      storage.progress.save({ bookId, chapterIndex: chapter, paragraphIndex: idx, updatedAt: Date.now() });
    }, 400);
  };

  const goChapter = (i: number) => {
    if (!book) return;
    const next = Math.max(0, Math.min(book.chapters.length - 1, i));
    setSel(null);
    setShowToc(false);
    setChapter(next);
    restoreTo.current = 0;
    storage.progress.save({ bookId, chapterIndex: next, paragraphIndex: 0, updatedAt: Date.now() });
  };

  const onTap = useCallback(
    (para: number, token: number, word: string, offset: number) => {
      if (!book) return;
      const text = book.chapters[chapter].paragraphs[para];
      setSel({ para, token, word, sentence: sentenceAt(text, offset) });
    },
    [book, chapter],
  );

  const saveWord = async (entry: DictEntry, viet: VietMeaning | null) => {
    if (!book || !sel) return;
    const first = entry.senses[0];
    await storage.words.save({
      word: entry.word,
      pinyin: first?.pinyin ?? '',
      hanviet: entry.hanviet,
      english: first ? first.english.slice(0, 4).join('; ') : '',
      vietnamese: viet?.meaning ?? '',
      sentence: sel.sentence,
      bookId: book.id,
      bookTitle: book.title,
      chapterIndex: chapter,
      savedAt: Date.now(),
      exported: false,
    });
    setSaved(new Set([...saved, entry.word]));
  };

  const unsaveWord = async (word: string) => {
    await storage.words.remove(word);
    const next = new Set(saved);
    next.delete(word);
    setSaved(next);
  };

  // bấm giữ một chữ -> dịch câu chứa chữ đó
  const longPress = useLongPress<{ para: number; offset: number }>(
    (target) => {
      const p = target.closest<HTMLElement>('[data-p]');
      const at = target.closest<HTMLElement>('[data-o]');
      return p && at ? { para: Number(p.dataset.p), offset: Number(at.dataset.o) } : null;
    },
    ({ para, offset }) => {
      if (!book) return;
      const spans = splitSentences(book.chapters[chapter].paragraphs[para]);
      const idx = Math.max(0, spans.findIndex((x) => offset >= x.start && offset < x.end));
      setSel(null);
      setShowDisplay(false);
      setTrans({ para, sentence: idx, mode: 'sentence' });
    },
  );

  // chạm vào chỗ không phải từ (khoảng trống, dấu câu) -> bật/tắt thanh chỉnh hiển thị
  const onBodyClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-t], button, a')) return;
    setSel(null);
    setShowDisplay((v) => !v);
  };

  const setDisplay = (patch: Partial<ReaderDisplay>) => onSettings({ reader: { ...settings.reader, ...patch } });
  const d = settings.reader;
  const displayVars = {
    '--reader-size': `${d.fontSize}px`,
    '--reader-leading': String(d.lineHeight),
    '--para-gap': `${d.paraSpacing}em`,
    '--reader-margin': `${d.margin}px`,
  };

  /** Chỉ số token (trong đoạn) bắt đầu tại vị trí ký tự `at`, để tô đúng từ khi tra từ khung dịch câu. */
  const tokenAt = (text: string, at: number) => {
    let o = 0;
    return segmenter.segment(text).findIndex((t) => {
      const hit = o === at;
      o += [...t.text].length;
      return hit;
    });
  };

  const ch = book?.chapters[chapter];
  const titles = book ? displayTitles(book.chapters.map((c) => c.title)) : [];
  const chTitle = titles[chapter] ?? ch?.title ?? '';
  const sheetOpen = sel !== null || trans !== null || showDisplay;
  const transText = trans && ch ? ch.paragraphs[trans.para] : '';
  const transSpans = useMemo(() => splitSentences(transText), [transText]);

  return (
    <div class="reader" data-paper={d.paper} data-font={d.font} style={displayVars}>
      <header class="reader-head">
        <button class="icon-btn" aria-label="Về thư viện" onClick={onClose}><IconBack /></button>
        <button class="chapter-btn" onClick={() => setShowToc(true)} aria-label="Mở mục lục">
          {chTitle || book?.title || ''}
        </button>
        <button class="icon-btn" aria-label="Mục lục" onClick={() => setShowToc(true)}><IconList /></button>
        <button class="icon-btn aa-btn" aria-label="Chỉnh hiển thị" aria-pressed={showDisplay} onClick={() => { setSel(null); setShowDisplay((v) => !v); }}>
          Aa
        </button>
      </header>

      <div
        class={`reader-body${sheetOpen ? ' sheet-open' : ''}`}
        ref={body}
        onScroll={onScroll}
        onClickCapture={(e) => { if (longPress.consumeClick()) e.stopPropagation(); }}
        onClick={onBodyClick}
        {...longPress.handlers}
      >
        {!book || dictState === 'loading' ? (
          <p class="loading">{book ? 'Đang tải từ điển (lần đầu hơi lâu)…' : 'Đang mở truyện…'}</p>
        ) : dictState === 'error' ? (
          <p class="notice notice-error">Không tải được từ điển. Kiểm tra mạng rồi mở lại app.</p>
        ) : (
          ch && (
            <article lang="zh-Hant">
              <h2 class="chapter-title">{chTitle}</h2>
              {isTocPage(ch.title) ? (
                // trang mục lục của file EPUB: thay bằng mục lục bấm được
                <ul class="toc-list inline-toc">
                  {titles.map((t, i) =>
                    i === chapter ? null : (
                      <li key={i}>
                        <button onClick={() => goChapter(i)}>{t}</button>
                      </li>
                    ),
                  )}
                </ul>
              ) : ch.paragraphs.map((text, i) => (
                <Paragraph
                  key={`${chapter}-${i}`}
                  index={i}
                  text={text}
                  segmenter={segmenter}
                  saved={saved}
                  selectedToken={sel?.para === i ? sel.token : null}
                  hlStart={trans?.para === i ? (trans.mode === 'paragraph' ? 0 : transSpans[trans.sentence]?.start ?? -1) : -1}
                  hlEnd={trans?.para === i ? (trans.mode === 'paragraph' ? Infinity : transSpans[trans.sentence]?.end ?? -1) : -1}
                  onTap={onTap}
                />
              ))}
              <nav class="chapter-nav" aria-label="Chuyển chương">
                <button class="btn" disabled={chapter === 0} onClick={() => goChapter(chapter - 1)}>Chương trước</button>
                <button class="btn btn-primary" disabled={chapter >= book.chapters.length - 1} onClick={() => goChapter(chapter + 1)}>
                  Chương sau
                </button>
              </nav>
              <p class="meta" style={{ textAlign: 'center', marginTop: '14px' }}>
                Chương {chapter + 1} / {book.chapters.length}
              </p>
            </article>
          )
        )}
      </div>


      {trans !== null && ch && transSpans[trans.sentence] && (
        <TranslationSheet
          paragraph={transText}
          previous={ch.paragraphs[trans.para - 1] ?? ''}
          sentence={transSpans[trans.sentence]}
          sentenceIndex={trans.sentence}
          sentenceCount={transSpans.length}
          mode={trans.mode}
          onMode={(mode) => setTrans({ ...trans, mode })}
          onMove={(d) => setTrans({ ...trans, sentence: trans.sentence + d })}
          onPickWord={(word, at) => setSel({ para: trans.para, token: tokenAt(transText, at), word, sentence: transSpans[trans.sentence].text })}
          lang={settings.meaningLang}
          onLang={(l) => onSettings({ meaningLang: l })}
          onClose={() => setTrans(null)}
        />
      )}

      {sel && (
        <WordSheet
          key={`${sel.word}|${sel.sentence}`}
          word={sel.word}
          sentence={sel.sentence}
          isSaved={saved.has(sel.word)}
          lang={settings.meaningLang}
          onLang={(l) => onSettings({ meaningLang: l })}
          onSave={saveWord}
          onUnsave={() => unsaveWord(sel.word)}
          onPick={(w) => setSel({ ...sel, word: w })}
          onClose={() => setSel(null)}
        />
      )}

      {showDisplay && <DisplayBar value={d} onChange={setDisplay} onClose={() => setShowDisplay(false)} />}

      {showToc && book && (
        <TocSheet toc={book.toc} current={chapter} onPick={goChapter} onClose={() => setShowToc(false)} />
      )}
    </div>
  );
}
