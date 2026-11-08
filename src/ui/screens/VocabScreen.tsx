// ui/screens/VocabScreen.tsx — Sổ từ vựng: hai nhóm Chưa xuất / Đã xuất.
// Khi mở sổ, AI tạo nội dung thẻ cho mọi từ chưa có (chạy song song). Xem, sửa, tạo lại từng thẻ; xuất .apkg.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppSettings, CardContent, SavedWord } from '@/core/types';
import { compactPinyin } from '@/modules/anki/cardHtml';
import { isClaudeHosted, saveFile, SaveCancelled } from '@/modules/download/saveFile';
import { useServices } from '../context';
import { CardEditor } from '../components/CardEditor';
import { IconTrash } from '../icons';

type Group = 'pending' | 'exported';
type ExportFormat = 'txt' | 'apkg';
type GenState = { status: 'loading' } | { status: 'error'; message: string };
type ExportState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; count: number; filename: string; format: ExportFormat; zipped: boolean }
  | { status: 'error'; message: string };

export function VocabScreen({ settings }: { settings: AppSettings }) {
  const { storage, cards } = useServices();
  const [words, setWords] = useState<SavedWord[] | null>(null);
  const [group, setGroup] = useState<Group>('pending');
  const [gen, setGen] = useState<Record<string, GenState>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [exp, setExp] = useState<ExportState>({ status: 'idle' });
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const alive = useRef(true);
  const batch = useRef({ total: 0, done: 0 });

  const refresh = async () => {
    const list = await storage.words.list();
    if (alive.current) setWords(list);
    return list;
  };

  /** AI tạo thẻ cho các từ truyền vào; cập nhật danh sách ngay khi từng thẻ xong. */
  const generate = (targets: SavedWord[]) => {
    if (!targets.length) return;
    // một "đợt" tạo thẻ: nếu đợt trước đã xong thì đếm lại từ đầu, chưa xong thì cộng dồn
    const running = batch.current.done < batch.current.total;
    batch.current = running
      ? { total: batch.current.total + targets.length, done: batch.current.done }
      : { total: targets.length, done: 0 };
    setGen((g) => ({ ...g, ...Object.fromEntries(targets.map((w) => [w.word, { status: 'loading' } as GenState])) }));
    cards.generateMany(
      targets,
      async (w, card) => {
        const latest = await storage.words.get(w.word);
        if (latest) await storage.words.save({ ...latest, card });
        batch.current.done++;
        if (!alive.current) return;
        setGen((g) => { const { [w.word]: _, ...rest } = g; return rest; });
        setWords((list) => list?.map((x) => (x.word === w.word ? { ...x, card } : x)) ?? list);
      },
      (w, message) => {
        batch.current.done++;
        if (alive.current) setGen((g) => ({ ...g, [w.word]: { status: 'error', message } }));
      },
    );
  };

  useEffect(() => {
    alive.current = true;
    refresh().then((list) => generate(list.filter((w) => !w.exported && !w.card)));
    return () => { alive.current = false; };
  }, []);

  const saveCard = async (w: SavedWord, card: CardContent) => {
    await storage.words.save({ ...w, card });
    setEditing(null);
    refresh();
  };

  const remove = async (word: string) => {
    await storage.words.remove(word);
    setConfirmRemove(null);
    setOpen(null);
    refresh();
  };

  const moveBack = async (w: SavedWord) => {
    await storage.words.save({ ...w, exported: false });
    setOpen(null);
    refresh();
  };

  const pending = words?.filter((w) => !w.exported) ?? [];
  const exported = words?.filter((w) => w.exported) ?? [];
  const ready = pending.filter((w) => w.card);
  const loadingCount = Object.values(gen).filter((g) => g.status === 'loading').length;
  const failed = pending.filter((w) => gen[w.word]?.status === 'error');
  const shown = group === 'pending' ? pending : exported;

  /** txt (mặc định): import vào note type Basic có sẵn · apkg: gói thẻ kèm note type riêng */
  const doExport = async (format: ExportFormat) => {
    setExp({ status: 'working' });
    try {
      const deck = settings.ankiDeck.trim() || 'zhongwenB1';
      const blob = format === 'txt' ? cards.exportTxt(ready, deck) : await cards.exportApkg(ready, deck);
      const zipped = format === 'apkg' && (await isClaudeHosted());
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const filename = `${deck}-${stamp}.${format}${zipped ? '.zip' : ''}`;
      await saveFile(filename, blob);
      const now = Date.now();
      for (const w of ready) await storage.words.save({ ...w, exported: true, exportedAt: now });
      await refresh();
      setExp({ status: 'done', count: ready.length, filename, format, zipped });
    } catch (e) {
      if (e instanceof SaveCancelled) setExp({ status: 'idle' });
      else setExp({ status: 'error', message: (e as Error).message || 'Xuất file thất bại.' });
    }
  };

  return (
    <main class="screen vocab-screen">
      <header class="screen-head">
        <h1>Sổ từ vựng</h1>
      </header>

      <div class="tabs" role="tablist" aria-label="Nhóm từ">
        <button role="tab" aria-selected={group === 'pending'} onClick={() => setGroup('pending')}>Chưa xuất · {pending.length}</button>
        <button role="tab" aria-selected={group === 'exported'} onClick={() => setGroup('exported')}>Đã xuất · {exported.length}</button>
      </div>

      {group === 'pending' && loadingCount > 0 && (
        <p class="notice" aria-live="polite">
          AI đang tạo nội dung thẻ: {batch.current.total - loadingCount} / {batch.current.total} xong
        </p>
      )}
      {group === 'pending' && failed.length > 0 && loadingCount === 0 && (
        <div class="notice notice-error row-notice">
          <span>{failed.length} thẻ chưa tạo được: {(gen[failed[0].word] as { message: string }).message}</span>
          <button class="btn" onClick={() => generate(failed)}>Thử lại</button>
        </div>
      )}
      {exp.status === 'done' && group === 'pending' && (
        <div class="notice export-done" role="status">
          <strong>Đã xuất {exp.count} thẻ</strong> vào file {exp.filename}.
          {exp.format === 'txt'
            ? ' Mở AnkiDroid → menu ⋮ → Nhập (Import) → chọn file này. Thẻ vào note type Basic, deck và cột đã được điền sẵn.'
            : exp.zipped
              ? ' Vào ứng dụng Files, đổi tên file bỏ đuôi ".zip" cho còn ".apkg", rồi mở file bằng AnkiDroid để import.'
              : ' Mở file bằng AnkiDroid để import.'}
        </div>
      )}
      {exp.status === 'error' && <p class="notice notice-error" role="alert">{exp.message}</p>}

      {words === null ? (
        <p class="loading">Đang tải…</p>
      ) : shown.length === 0 ? (
        <div class="empty">
          {group === 'pending' ? (
            <>
              <strong>Không có từ mới</strong>
              <span>Mở một truyện, chạm vào từ rồi bấm "Lưu từ". Từ đã xuất nằm ở nhóm Đã xuất.</span>
            </>
          ) : (
            <strong>Chưa xuất thẻ nào</strong>
          )}
        </div>
      ) : (
        <div class="word-list">
          {shown.map((w) => {
            const g = gen[w.word];
            const isOpen = open === w.word;
            return (
              <article class={`word-card${isOpen ? ' is-open' : ''}`} key={w.word}>
                <button class="word-card-summary" aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : w.word); setEditing(null); setConfirmRemove(null); }}>
                  <span class="word-card-word" lang="zh-Hant">{w.word}</span>
                  <span class="word-card-gist">
                    ({compactPinyin(w.card?.pinyin ?? w.pinyin) || '—'}) [{w.card?.hanviet ?? w.hanviet}]: {w.card?.vietnamese || w.vietnamese || w.english}
                  </span>
                  <StatusChip word={w} gen={g} />
                </button>

                {isOpen && (
                  <div class="word-card-detail">
                    {editing === w.word && w.card ? (
                      <CardEditor word={w.word} card={w.card} onSave={(c) => saveCard(w, c)} onCancel={() => setEditing(null)} />
                    ) : (
                      <>
                        {w.card ? <CardPreview w={w} /> : <p class="meta">{g?.status === 'error' ? g.message : 'AI đang tạo nội dung thẻ…'}</p>}
                        <p class="word-card-src">Từ truyện <span class="han">{w.bookTitle}</span> · Chương {w.chapterIndex + 1}</p>
                        {confirmRemove === w.word ? (
                          <div class="confirm-box">
                            <span>Bỏ lưu {w.word}? Nội dung thẻ cũng bị xóa.</span>
                            <div class="row">
                              <button class="btn" onClick={() => setConfirmRemove(null)}>Giữ lại</button>
                              <button class="btn btn-danger" onClick={() => remove(w.word)}>Bỏ lưu</button>
                            </div>
                          </div>
                        ) : (
                          <div class="card-actions">
                            <button class="btn" disabled={!w.card} onClick={() => setEditing(w.word)}>Sửa</button>
                            <button class="btn" disabled={g?.status === 'loading'} onClick={() => generate([w])}>
                              {w.card ? 'Tạo lại' : 'Tạo thẻ'}
                            </button>
                            {w.exported && <button class="btn" onClick={() => moveBack(w)}>Xuất lại</button>}
                            <button class="icon-btn" aria-label={`Bỏ lưu ${w.word}`} onClick={() => setConfirmRemove(w.word)}><IconTrash /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {group === 'pending' && pending.length > 0 && (
        <div class="export-bar">
          <button class="btn btn-primary export-btn" disabled={ready.length === 0 || exp.status === 'working'} onClick={() => doExport('txt')}>
            {exp.status === 'working' ? 'Đang tạo file…' : `Xuất ${ready.length} thẻ (.txt)`}
          </button>
          <button class="btn btn-ghost export-alt" disabled={ready.length === 0 || exp.status === 'working'} onClick={() => doExport('apkg')}>
            Xuất dạng .apkg
          </button>
          <p class="meta">
            Deck: {settings.ankiDeck || 'zhongwenB1'}
            {ready.length < pending.length && ` · ${pending.length - ready.length} từ chưa có thẻ sẽ chờ lần sau`}
          </p>
        </div>
      )}
    </main>
  );
}

function StatusChip({ word, gen }: { word: SavedWord; gen?: GenState }) {
  if (gen?.status === 'loading') return <span class="chip-status warn">Đang tạo…</span>;
  if (gen?.status === 'error') return <span class="chip-status err">Lỗi</span>;
  if (word.exported) return <span class="chip-status muted">Đã xuất</span>;
  if (word.card) return <span class="chip-status ok">{word.card.edited ? 'Đã sửa' : 'Sẵn sàng'}</span>;
  return <span class="chip-status muted">Chờ</span>;
}

/** Xem trước mặt sau thẻ theo đúng thứ tự sẽ xuất sang Anki. */
function CardPreview({ w }: { w: SavedWord }) {
  const c = w.card!;
  const bold = (s: string) => s.split(w.word).flatMap((part, i) => (i ? [<b key={i}>{w.word}</b>, part] : [part]));
  return (
    <div class="card-preview">
      <div><b class="accent">({compactPinyin(c.pinyin)}) [{c.hanviet}]</b>: {c.vietnamese}</div>
      <div class="meta">= {c.english}{c.partOfSpeech && `; (${c.partOfSpeech})`}</div>
      <div class="card-examples" lang="zh-Hant">
        {w.sentence && (
          <div>{bold(w.sentence)} <span class="tag-src">câu gốc</span>{c.sentenceVi && <div class="vi" lang="vi">{c.sentenceVi}</div>}</div>
        )}
        {c.examples.map((e, i) => (
          <div key={i}>{bold(e.zh)}{e.vi && <div class="vi" lang="vi">{e.vi}</div>}</div>
        ))}
      </div>
      {c.patterns.length > 0 && <div class="card-patterns">{c.patterns.map((p, i) => <div key={i}>{p}</div>)}</div>}
      {c.comparison && <div class="card-compare">{c.comparison}</div>}
    </div>
  );
}
