// ui/screens/ReaderScreen.tsx — Trang đọc toàn màn hình: chạm từ -> bong bóng nghĩa nhỏ ngay cạnh từ
// ("Chi tiết" mở bảng đầy đủ), bấm giữ để TỰ TÔ CHỌN chữ bằng 2 con trỏ của app (hooks/useTextPick) rồi bấm
// nút "Dịch phần đã chọn" ở đáy màn hình, nhớ vị trí đọc, mục lục.
// Nút / cử chỉ Quay lại của điện thoại lùi từng bước: đóng lớp đang mở -> trang đọc -> thư viện (hooks/useBack).
// Thanh tiêu đề: cuộn xuống tự ẩn; chạm giữa trang (cả khi chạm vào chữ) hoặc cuộn ngược lên là hiện lại.
// Chạm mép trái/phải: lật lên/xuống
// một trang (tắt được trong Aa). Nút Aa mở thanh chỉnh hiển thị. Cuối chương có thẻ tổng kết từ đã lưu.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppSettings, Book, DictEntry, ReaderDisplay, SavedWord, VietMeaning } from '@/core/types';
import { sentenceAt } from '@/services/sentence';
import { highlightRange } from '@/services/phrase';
import { useServices } from '../context';
import { Paragraph } from '../components/Paragraph';
import { WordSheet, type PhraseBack, type WordNav } from '../components/WordSheet';
import { WordPopover } from '../components/WordPopover';
import { ChapterEnd } from '../components/ChapterEnd';
import { TocSheet } from '../components/TocSheet';
import { displayTitles, isTocPage } from '@/services/tocTitles';
import { TranslationSheet, type TransMode, type TransSource } from '../components/TranslationSheet';
import { DisplayBar } from '../components/DisplayBar';
import { useLongPress } from '../hooks/useLongPress';
import { useBack } from '../hooks/useBack';
import { HIGHLIGHT_OK, pickText, useTextPick, type Pick } from '../hooks/useTextPick';
import { ChapterNav } from '../components/ChapterNav';
import { ReaderStatus } from '../components/ReaderStatus';
import { bookPercent, chapterLengths, chapterPosition, type ChapterPosition } from '@/services/readingProgress';
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
  start: number; // vị trí ký tự của từ vừa chạm trong đoạn (-1 = không gắn với trang, vd mở từ đã lưu)
  end: number;
  word: string; // từ đang xem trong popup (có thể là từ nhỏ / 1 chữ khi tra riêng)
  exact: boolean; // true = tra đúng từ này, không nhận cụm
  phrase?: string; // cụm AI nhận ra chứa từ vừa chạm (để tô sáng cả cụm)
  sentence: string;
  expanded: boolean; // false = bong bóng nhỏ cạnh từ, true = bảng đầy đủ ở đáy màn hình
  back?: PhraseBack; // đang xem một từ nhỏ của cụm này (hiện bong bóng quay lại cụm)
  nav?: WordNav; // các từ nhỏ / chữ anh em, để nút ‹ › chuyển qua lại
}

const NO_WORDS: Set<string> = new Set();

/** Phần chữ đã tô chọn. end = vị trí ký tự kết thúc trong đoạn (-1 nếu phần chọn trải qua nhiều đoạn). */
type Picked = TransSource & { end: number };

/** Chạm trong phần này (tính từ mỗi mép, theo bề ngang) thì lật trang thay vì hiện/ẩn thanh tiêu đề. */
const EDGE_ZONE = 0.3;
/** Khi lật trang, giữ lại bấy nhiêu px của trang trước để không mất dòng. */
const PAGE_OVERLAP = 48;

export function ReaderScreen({ bookId, dictState, settings, onSettings, onClose }: Props) {
  const { storage, segmenter } = useServices();
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState(0);
  const [savedList, setSavedList] = useState<SavedWord[]>([]);
  const saved = useMemo(() => new Set(savedList.map((w) => w.word)), [savedList]);
  const [looked, setLooked] = useState<Set<string>>(() => storage.lookups.list());
  const [chrome, setChrome] = useState(true); // thanh tiêu đề đang hiện
  const lastTop = useRef(0);
  const chromeSettle = useRef(0); // trước thời điểm này không đổi thanh theo cuộn
  const showChrome = (v: boolean) => {
    setChrome((cur) => {
      if (cur !== v) chromeSettle.current = Date.now() + 300;
      return v;
    });
  };
  const [sel, setSel] = useState<Selection | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  // khung dịch đang mở (phần chữ đã chọn để dịch)
  const [trans, setTrans] = useState<(Picked & { mode: TransMode; span: Pick }) | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<number | null>(null);
  const [pos, setPos] = useState<ChapterPosition>({ page: 1, pages: 1, fraction: 0 });

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
      setSavedList(words);
      const ch = Math.min(p?.chapterIndex ?? 0, b.chapters.length - 1);
      setChapter(ch);
      restoreTo.current = p?.paragraphIndex ?? 0;
    })();
  }, [bookId]);

  // cuộn tới đoạn đang đọc dở sau khi chương hiện ra
  useLayoutEffect(() => {
    if (!book || dictState !== 'ready' || restoreTo.current === null || !body.current) return;
    const target = body.current.querySelector<HTMLElement>(`[data-p="${restoreTo.current}"]`);
    // đoạn đầu chương: cuộn hẳn lên đỉnh để thấy nút chương trước/sau và tiêu đề
    body.current.scrollTop = target && restoreTo.current > 0 ? target.offsetTop - 16 : 0;
    restoreTo.current = null;
  }, [book, chapter, dictState]);

  // thanh tiến độ: tính lại trang/phần trăm khi cuộn, đổi chương, đổi cỡ chữ hay xoay màn hình
  const posFrame = useRef<number>();
  const updatePos = () => {
    window.cancelAnimationFrame(posFrame.current!);
    posFrame.current = window.requestAnimationFrame(() => {
      const el = body.current;
      if (!el) return;
      // khi khung tra từ/dịch mở, chương được đệm thêm ở cuối: không tính phần đệm đó
      const extra = el.classList.contains('sheet-open') ? Math.max(0, parseFloat(getComputedStyle(el).paddingBottom) - 40) : 0;
      setPos(chapterPosition(el, extra));
    });
  };
  useEffect(() => {
    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [book, chapter, dictState, settings.reader]);
  const lengths = useMemo(() => (book ? chapterLengths(book.chapters) : []), [book]);

  // lưu vị trí: đoạn đầu tiên còn thấy trên màn hình
  const saveTimer = useRef<number>();
  const onScroll = () => {
    updatePos();
    const el = body.current;
    if (el) {
      // cuộn thì đóng bong bóng nhỏ (nó gắn với vị trí của từ); cuộn xuống thì ẩn thanh tiêu đề
      if (sel && !sel.expanded) setSel(null);
      const delta = el.scrollTop - lastTop.current;
      // cuộn ngược lên một chút là hiện lại thanh (không phải kéo lên tận đầu chương).
      // Thanh ẩn/hiện làm khung đọc đổi chiều cao -> trình duyệt tự dịch scrollTop: bỏ qua các lần cuộn
      // ngay sau đó và lúc đang chạm đáy chương, nếu không thanh sẽ nhấp nháy.
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
      if (Date.now() > chromeSettle.current && !atBottom) {
        if (el.scrollTop < 8 || delta < -10) showChrome(true);
        else if (delta > 12) showChrome(false);
      }
      lastTop.current = el.scrollTop;
    }
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
    setTrans(null);
    picker.clear();
    setChapter(next);
    setChrome(true);
    restoreTo.current = 0;
    storage.progress.save({ bookId, chapterIndex: next, paragraphIndex: 0, updatedAt: Date.now() });
  };

  const onTap = useCallback(
    (para: number, token: number, word: string, offset: number) => {
      if (!book) return;
      const text = book.chapters[chapter].paragraphs[para];
      setSel({ para, token, start: offset, end: offset + [...word].length, word, exact: false, sentence: sentenceAt(text, offset), expanded: false });
      setChrome(true); // chạm vào chữ giữa trang cũng hiện thanh tiêu đề (có nút Aa)
      storage.lookups.add(word);
      setLooked((prev) => (prev.has(word) ? prev : new Set(prev).add(word)));
    },
    [book, chapter],
  );

  const saveWord = async (entry: DictEntry, viet: VietMeaning | null) => {
    if (!book || !sel) return;
    const first = entry.senses[0];
    const w: SavedWord = {
      word: entry.word, // nếu AI nhận ra cụm thì đây là cả cụm
      pinyin: first?.pinyin ?? viet?.pinyin ?? '',
      hanviet: entry.hanviet,
      english: first ? first.english.slice(0, 4).join('; ') : '',
      vietnamese: viet?.meaning || first?.vietnamese.slice(0, 3).join('; ') || '',
      sentence: sel.sentence,
      bookId: book.id,
      bookTitle: book.title,
      chapterIndex: chapter,
      savedAt: Date.now(),
      exported: false,
    };
    await storage.words.save(w);
    setSavedList((list) => [w, ...list.filter((x) => x.word !== w.word)]);
  };

  const unsaveWord = async (word: string) => {
    await storage.words.remove(word);
    setSavedList((list) => list.filter((x) => x.word !== word));
  };

  // bấm giữ một chữ -> chọn từ đó và hiện 2 con trỏ của app để kéo chọn phần muốn dịch
  const picker = useTextPick(body, `${chapter}|${dictState}|${JSON.stringify(settings.reader)}|${book?.id ?? ''}`);
  const longPress = useLongPress<{ para: number; at: number; length: number }>(
    (target) => {
      const p = target.closest<HTMLElement>('[data-p]');
      const span = target.closest<HTMLElement>('[data-o]');
      return p && span ? { para: Number(p.dataset.p), at: Number(span.dataset.o), length: [...(span.textContent ?? '')].length } : null;
    },
    ({ para, at, length }) => {
      setSel(null);
      setShowDisplay(false);
      picker.start(para, at, length);
    },
  );

  const openPicked = () => {
    const pk = picker.pick;
    if (!pk || !book) return;
    const text = pickText(book.chapters[chapter].paragraphs, pk);
    picker.clear();
    if (!text) return;
    const single = pk.a.para === pk.b.para;
    setSel(null);
    setShowDisplay(false);
    setTrans({ para: pk.a.para, start: single ? pk.a.at : -1, end: single ? pk.b.at : -1, text, mode: 'selection', span: pk });
  };

  // Quay lại của điện thoại: mỗi lần lùi một bước. Lớp MỞ SAU được đóng TRƯỚC.
  useBack(true, onClose); // trang đọc -> thư viện
  useBack(showToc, () => setShowToc(false));
  useBack(showDisplay, () => setShowDisplay(false));
  useBack(picker.pick !== null, picker.clear);
  useBack(trans !== null, () => setTrans(null));
  useBack(sel !== null, () => setSel(null));

  // chạm vào chỗ không phải từ (khoảng trống, dấu câu, lề):
  // đang mở bong bóng -> đóng · mép trái/phải -> lật trang · giữa -> hiện/ẩn thanh tiêu đề
  const onBodyClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-t], button, a, .chapter-title, .chapter-end, .pick-handle')) return;
    if (sel) return setSel(null);
    const el = body.current;
    const x = e.clientX / document.documentElement.clientWidth;
    if (el && settings.reader.tapPaging && (x < EDGE_ZONE || x > 1 - EDGE_ZONE)) {
      const dir = x < EDGE_ZONE ? -1 : 1;
      el.scrollBy({ top: dir * (el.clientHeight - PAGE_OVERLAP), behavior: 'smooth' });
      return;
    }
    setChrome((v) => !v);
  };

  /** Từ đang chọn trên trang (để đặt bong bóng nghĩa cạnh nó). */
  const selAnchor = () =>
    sel && sel.para >= 0 ? body.current?.querySelector<HTMLElement>(`[data-p="${sel.para}"] [data-t="${sel.token}"]`) ?? null : null;

  /** Chạm một từ trên thẻ cuối chương: mở bảng đầy đủ với câu gốc đã lưu. */
  const openSavedWord = (word: string) => {
    const w = savedList.find((x) => x.word === word);
    setSel({ para: -1, token: -1, start: -1, end: -1, word, exact: true, sentence: w?.sentence ?? '', expanded: true });
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
  const sheetOpen = (sel !== null && sel.expanded) || trans !== null || showDisplay;
  const savedHere = book ? savedList.filter((w) => w.bookId === book.id && w.chapterIndex === chapter).map((w) => w.word) : [];
  const transText = trans && ch ? ch.paragraphs[trans.para] ?? '' : '';
  // máy không có CSS Highlight: tô vùng đang chọn theo từ
  const pickHl = (i: number): [number, number] => (HIGHLIGHT_OK ? [-1, -1] : picker.rangeIn(picker.pick, i));
  // khoảng ký tự tô sáng khi tra từ: cả cụm nếu AI nhận ra, không thì từ vừa chạm
  const selText = sel && sel.para >= 0 && book ? book.chapters[chapter].paragraphs[sel.para] ?? '' : '';
  const selRange = sel && sel.start >= 0 ? highlightRange(selText, sel.start, sel.end, sel.phrase) : [-1, -1];

  return (
    <div class="reader" data-paper={d.paper} data-font={d.font} style={displayVars}>
      <header class={`reader-head${chrome || sheetOpen ? '' : ' is-hidden'}`}>
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
        onClickCapture={(e) => {
          // cú "click" ngay sau khi bấm giữ: bỏ qua
          if (longPress.consumeClick()) return e.stopPropagation();
          // đang tô chọn: chạm ra ngoài con trỏ là bỏ chọn (không tra từ, không lật trang)
          if (picker.pick && !(e.target as HTMLElement).closest('.pick-handle')) {
            picker.clear();
            e.stopPropagation();
          }
        }}
        onClick={onBodyClick}
        {...longPress.handlers}
      >
        {picker.pick && picker.boxes && (['a', 'b'] as const).map((w) => (
          <span
            key={w}
            class={`pick-handle pick-handle-${w}`}
            style={{ left: `${picker.boxes![w].x}px`, top: `${picker.boxes![w].y}px`, height: `${picker.boxes![w].h}px` }}
            aria-hidden="true"
            {...picker.handle(w)}
          />
        ))}
        {!book || dictState === 'loading' ? (
          <p class="loading">{book ? 'Đang tải từ điển (lần đầu hơi lâu)…' : 'Đang mở truyện…'}</p>
        ) : dictState === 'error' ? (
          <p class="notice notice-error">Không tải được từ điển. Kiểm tra mạng rồi mở lại app.</p>
        ) : (
          ch && (
            <article lang="zh-Hant">
              <ChapterNav place="top" chapter={chapter} count={book.chapters.length} onGo={goChapter} />
              {/* tiêu đề cho phép bôi đen để chép */}
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
                  looked={d.showLooked ? looked : NO_WORDS}
                  selStart={sel?.para === i ? selRange[0] : -1}
                  selEnd={sel?.para === i ? selRange[1] : -1}
                  hlStart={trans ? (trans.mode === 'paragraph' ? (trans.para === i ? 0 : -1) : picker.rangeIn(trans.span, i)[0]) : pickHl(i)[0]}
                  hlEnd={trans ? (trans.mode === 'paragraph' ? (trans.para === i ? Infinity : -1) : picker.rangeIn(trans.span, i)[1]) : pickHl(i)[1]}
                  onTap={onTap}
                />
              ))}
              <ChapterEnd chapter={chapter} count={book.chapters.length} savedHere={savedHere} onGo={goChapter} onWord={openSavedWord} />
            </article>
          )
        )}
      </div>

      {book && ch && (
        <ReaderStatus
          chapterNo={chapter + 1}
          page={pos.page}
          pages={pos.pages}
          percent={bookPercent(lengths, chapter, pos.fraction)}
        />
      )}

      {picker.pick && !trans && (
        <div class="pick-bar">
          <button class="btn pick-cancel" onClick={picker.clear}>Bỏ chọn</button>
          <button class="btn btn-primary" onClick={openPicked}>Dịch phần đã chọn</button>
        </div>
      )}

      {trans !== null && ch && (
        <TranslationSheet
          source={trans}
          paragraph={transText}
          previous={trans.start > 0 ? [...transText].slice(0, trans.start).join('') : ch.paragraphs[trans.para - 1] ?? ''}
          previousParagraph={ch.paragraphs[trans.para - 1] ?? ''}
          mode={trans.mode}
          onMode={(mode) => setTrans({ ...trans, mode })}
          onPickWord={(word, at) => setSel({ para: trans.para, token: tokenAt(transText, at), start: at, end: at + [...word].length, word, exact: false, sentence: sentenceAt(transText, at), expanded: true })}
          lang={settings.meaningLang}
          onLang={(l) => onSettings({ meaningLang: l })}
          onClose={() => setTrans(null)}
        />
      )}

      {sel && !sel.expanded && (
        <WordPopover
          key={`${sel.para}|${sel.token}|${sel.word}|${sel.exact}`}
          word={sel.word}
          sentence={sel.sentence}
          anchor={selAnchor}
          exact={sel.exact}
          isSaved={(w) => saved.has(w)}
          lang={settings.meaningLang}
          onSave={saveWord}
          onUnsave={unsaveWord}
          onPhrase={(phrase) => setSel((s) => (s && s.phrase !== (phrase ?? undefined) ? { ...s, phrase: phrase ?? undefined } : s))}
          onExpand={() => setSel({ ...sel, expanded: true })}
          aiMode={settings.aiMode}
          onAiMode={(m) => onSettings({ aiMode: m })}
        />
      )}

      {sel && sel.expanded && (
        <WordSheet
          key={`${sel.word}|${sel.exact}|${sel.sentence}`}
          word={sel.word}
          sentence={sel.sentence}
          exact={sel.exact}
          isSaved={(w) => saved.has(w)}
          lang={settings.meaningLang}
          onLang={(l) => onSettings({ meaningLang: l })}
          onSave={saveWord}
          onUnsave={unsaveWord}
          onPick={(w, from, nav) => setSel({ ...sel, word: w, exact: true, back: sel.back ?? from ?? undefined, nav })}
          back={sel.back}
          onBack={() => sel.back && setSel({ ...sel, word: sel.back.word, exact: sel.back.exact, back: undefined, nav: undefined })}
          nav={sel.nav}
          onNav={(d) => {
            const n = sel.nav;
            const i = n ? n.index + d : -1;
            if (n && i >= 0 && i < n.items.length) setSel({ ...sel, word: n.items[i], exact: true, nav: { ...n, index: i } });
          }}
          aiMode={settings.aiMode}
          onAiMode={(m) => onSettings({ aiMode: m })}
          onClose={() => setSel(null)}
        />
      )}

      {showDisplay && (
        <DisplayBar
          value={d}
          onChange={setDisplay}
          lookedCount={looked.size}
          onClearLooked={() => { storage.lookups.clear(); setLooked(new Set()); }}
          onClose={() => setShowDisplay(false)}
        />
      )}

      {showToc && book && (
        <TocSheet toc={book.toc} current={chapter} onPick={goChapter} onClose={() => setShowToc(false)} />
      )}
    </div>
  );
}
