// ui/components/WordSheet.tsx — Popup tra từ (trượt lên từ đáy màn hình):
// từ, pinyin, âm Hán Việt, nghĩa Việt (AI) / Anh (CC-CEDICT), nút Lưu, nút nghe, tra từng chữ.
// v4.4: khung (nền + bảng cuộn) giữ nguyên khi đổi từ, chỉ phần nội dung làm mới -> không bị kéo lên đầu.

import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { AiMode, DictEntry, MeaningLang, PhrasePart, VietMeaning } from '@/core/types';
import { canSpeak, speak } from '@/modules/speech/speak';
import { useSynonyms } from '../hooks/useSynonyms';
import { useWordLookup, type VietState } from '../hooks/useWordLookup';
import { IconSpeaker, IconStar } from '../icons';
import { AiTierToggle } from './AiTierToggle';
import { CopyButton } from './CopyButton';
import { PhraseParts, SavedStar } from './PhraseParts';
import { PosTag } from './PosTag';

/** Cụm mà người dùng vừa đi từ đó xuống xem một từ nhỏ: để hiện bong bóng quay lại cụm. */
export interface PhraseBack {
  word: string; // từ đã chạm lúc đầu (mở lại đúng như cũ)
  exact: boolean;
  phrase: string;
  meaning: string;
  pos?: string;
  parts: PhrasePart[];
  chars?: boolean; // true = "cụm" này thực ra là một từ ghép được tách thành từng chữ (vd 熄滅 -> 熄, 滅)
  synonyms?: boolean; // true = "parts" là các từ đồng nghĩa của từ gốc (đang xem một từ đồng nghĩa)
}

/** Danh sách anh em (các từ nhỏ của cụm, hoặc các chữ của từ ghép) để chuyển qua lại bằng nút ‹ ›. */
export interface WordNav {
  items: string[];
  index: number; // vị trí của từ đang xem trong items
}

interface Props {
  word: string;
  sentence: string;
  exact: boolean; // true = tra đúng từ này, không nhận cụm
  isSaved: (word: string) => boolean; // hỏi theo từ HOẶC cụm đang hiện
  lang: MeaningLang;
  onLang: (l: MeaningLang) => void;
  onSave: (entry: DictEntry, viet: VietMeaning | null) => void;
  onUnsave: (word: string) => void;
  aiMode: AiMode; // 'save' = Dịch tự động, 'quality' = Dịch nâng cao
  onAiMode: (m: AiMode) => void;
  onPick: (word: string, from: PhraseBack | null, nav: WordNav) => void; // tra riêng một từ nhỏ / một chữ (không nhận cụm); from = cụm đang xem
  back?: PhraseBack; // đang xem một từ nhỏ của cụm này
  nav?: WordNav; // có thì hiện nút ‹ › để sang từ nhỏ / chữ trước, sau
  onNav: (delta: -1 | 1) => void;
  onBack: () => void; // quay lại xem cả cụm
  onClose: () => void;
}

/** Khung bảng: KHÔNG gắn key theo từ, để đổi từ (bấm từ nhỏ, ‹ ›, quay lại cụm) vẫn giữ chỗ đang cuộn. */
export function WordSheet(p: Props) {
  const key = `${p.word}|${p.exact}|${p.sentence}`;
  const { box, body, onScroll } = useKeepScroll(key);
  return (
    <>
      <button class="backdrop" aria-label="Đóng popup" onClick={p.onClose} />
      <section ref={box} class="sheet" role="dialog" aria-labelledby={TITLE_ID} onScroll={onScroll}>
        <div class="grip" aria-hidden="true" />
        {/* nội dung gắn key theo từ + câu: đổi từ là state tra từ tự làm mới (xem useWordLookup) */}
        <div ref={body} class="sheet-body">
          <WordSheetBody key={key} {...p} />
        </div>
      </section>
    </>
  );
}

const TITLE_ID = 'word-sheet-title';

/**
 * Giữ nguyên chỗ đang cuộn khi đổi từ. Từ mới lúc đầu còn đang tải nên nội dung NGẮN hơn -> trình duyệt
 * tự kéo lên. Cách chặn: thêm khoảng trống tạm ở cuối (vừa đủ phần đang nhìn), nội dung dài ra hoặc
 * người dùng cuộn lên thì khoảng trống tự bớt dần.
 */
function useKeepScroll(key: string) {
  const box = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const st = useRef({ top: 0, h: 0, hold: 0, pad: 0 });

  const fit = () => {
    const el = box.current;
    const b = body.current;
    if (!el || !b) return;
    const s = st.current;
    const h = b.offsetHeight - s.pad; // chiều cao nội dung thật (không tính khoảng trống)
    if (h >= s.hold) s.hold = 0;
    if (!s.hold) s.h = h;
    const room = Math.max(0, s.top + el.clientHeight - (b.offsetTop + h)); // phần trống đang lọt vào màn hình
    const pad = s.hold && s.top > 0 ? Math.min(s.hold - h, room) : 0; // đang ở đầu bảng: không cần giữ chỗ
    if (pad !== s.pad) {
      s.pad = pad;
      b.style.paddingBottom = pad ? `${pad}px` : '';
    }
  };

  // đổi từ: giữ chỗ bằng chiều cao nội dung cũ, rồi đặt lại đúng vị trí cuộn cũ
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    st.current.hold = st.current.h;
    fit();
    if (box.current) box.current.scrollTop = st.current.top;
  }, [key]);

  // nội dung dài ra / ngắn đi (AI trả lời xong, từ đồng nghĩa hiện ra): tính lại khoảng trống
  useEffect(() => {
    const b = body.current;
    if (!b || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    if (!box.current) return;
    st.current.top = box.current.scrollTop;
    if (st.current.hold) fit();
  };
  return { box, body, onScroll };
}

function WordSheetBody(p: Props) {
  const { phrase, parts, entry, viet, vietValue, hanviet, pinyins } = useWordLookup(p.word, p.sentence, p.lang, p.aiMode, p.exact);
  const chars = [...phrase];
  const isPhrase = phrase !== p.word || parts.length > 0;
  const here: PhraseBack | null = parts.length
    ? { word: p.word, exact: p.exact, phrase, meaning: vietValue?.meaning ?? '', pos: vietValue?.partOfSpeech, parts }
    : null;
  // từ ghép không có từ nhỏ: tách từng chữ, coi từ đó là "cụm" để có bong bóng quay lại
  const charsHere: PhraseBack = { word: p.word, exact: p.exact, phrase, meaning: vietValue?.meaning ?? '', pos: vietValue?.partOfSpeech, chars: true, parts: chars.map((c) => ({ text: c, meaning: '' })) };
  const pickPart = (list: PhrasePart[], from: PhraseBack | null) => (w: string, i: number) =>
    p.onPick(w, from, { items: list.map((x) => x.text), index: i });
  const nav = p.nav;
  // 3 từ đồng nghĩa: chỉ khi xem tiếng Việt và đã có nghĩa theo câu
  const syn = useSynonyms(phrase, vietValue?.meaning ?? '', p.sentence, p.lang === 'vi' && !!vietValue);
  const synList = syn.status === 'done' ? syn.list : [];
  const synHere: PhraseBack = { word: p.word, exact: p.exact, phrase, meaning: vietValue?.meaning ?? '', pos: vietValue?.partOfSpeech, synonyms: true, parts: synList };

  return (
    <>
      {/* v4.3: nút Nâng cao + VI/EN nằm hàng riêng ở trên, để chữ Hán + pinyin có cả bề ngang (không bị ép thành cột dọc) */}
      <div class="sheet-top word-sheet-top">
        <div class="sheet-top-right">
          <AiTierToggle value={p.aiMode} onChange={p.onAiMode} />
          <div class="seg" role="group" aria-label="Ngôn ngữ nghĩa">
            <button aria-pressed={p.lang === 'vi'} onClick={() => p.onLang('vi')}>VI</button>
            <button aria-pressed={p.lang === 'en'} onClick={() => p.onLang('en')}>EN</button>
          </div>
        </div>
        <div class="sheet-head">
          <div class="sheet-word-row">
            <div class="sheet-word" id={TITLE_ID} lang="zh-Hant">{phrase}</div>
            {p.isSaved(phrase) && <SavedStar size={16} />}
            <CopyButton class="word-copy" label={`Chép ${phrase}`} size={18} text={phrase} />
          </div>
          <div class="sheet-reading">
            {pinyins.join(' / ') || '—'} · [{hanviet}]
          </div>
        </div>
      </div>

      <div class="sheet-meaning" aria-live="polite">
        {p.lang === 'vi' ? <VietBlock state={viet} entry={entry} isPhrase={isPhrase} /> : <EnglishBlock entry={entry} />}
      </div>

      {p.lang === 'vi' && (syn.status === 'loading' || synList.length > 0) && (
        <div class="synonyms">
          <div class="dict-vi-label">Từ đồng nghĩa</div>
          {syn.status === 'loading' ? (
            <div class="skeleton" aria-label="AI đang tìm từ đồng nghĩa" />
          ) : (
            <PhraseParts parts={synList} isSaved={p.isSaved} onPick={pickPart(synList, synHere)} />
          )}
        </div>
      )}

      {p.back && (
        <div class="phrase-back" aria-label={p.back.synonyms ? 'Từ gốc' : p.back.chars ? 'Từ chứa chữ này' : 'Cụm chứa từ này'}>
          <button class="phrase-part is-phrase" onClick={p.onBack}>
            <span class="phrase-back-icon" aria-hidden="true">↩</span>
            <span class="phrase-part-text" lang="zh-Hant">{p.back.phrase}</span>
            <span class="phrase-part-meaning"><PosTag raw={p.back.pos} phrase={!p.back.chars && !p.back.synonyms} />{p.back.meaning}</span>
          </button>
          <PhraseParts parts={p.back.parts} isSaved={p.isSaved} current={nav && nav.items.join('|') === p.back.parts.map((x) => x.text).join('|') ? nav.index : -1} onPick={pickPart(p.back.parts, null)} />
        </div>
      )}

      <PhraseParts parts={parts} isSaved={p.isSaved} onPick={pickPart(parts, here)} />

      {chars.length > 1 && parts.length === 0 && (
        <div class="char-chips" aria-label="Tra từng chữ">
          {chars.map((c, i) => (
            <button key={i} class="chip" onClick={() => pickPart(charsHere.parts, charsHere)(c, i)}>{c}</button>
          ))}
        </div>
      )}

      <div class="sheet-actions">
        {nav && (
          <button class="icon-btn nav-btn" aria-label="Từ trước" disabled={nav.index === 0} onClick={() => p.onNav(-1)}>‹</button>
        )}
        {p.isSaved(phrase) ? (
          <button class="btn" style={{ flex: 1, height: '48px' }} onClick={() => p.onUnsave(phrase)}>
            <IconStar filled /> Đã lưu · Bỏ lưu
          </button>
        ) : (
          <button class="btn btn-primary" onClick={() => p.onSave({ ...entry, hanviet }, vietValue)}>
            <IconStar /> Lưu từ
          </button>
        )}
        {canSpeak() && (
          <button class="icon-btn" aria-label="Nghe phát âm" onClick={() => speak(phrase)}>
            <IconSpeaker />
          </button>
        )}
        {nav && (
          <button class="icon-btn nav-btn" aria-label="Từ sau" disabled={nav.index >= nav.items.length - 1} onClick={() => p.onNav(1)}>›</button>
        )}
      </div>
    </>
  );
}

/** Nghĩa Việt: dòng đầu là nghĩa theo ngữ cảnh (AI), bên dưới là các nghĩa của từ điển offline (có ngay). */
function VietBlock({ state, entry, isPhrase }: { state: VietState; entry: DictEntry; isPhrase: boolean }) {
  const dict = entry.senses.filter((s) => s.vietnamese.length).slice(0, 3);
  return (
    <>
      {state.status === 'done' && (
        <>
          <div><PosTag raw={state.value.partOfSpeech} phrase={isPhrase} />{state.value.meaning}</div>
        </>
      )}
      {state.status === 'loading' && <div class="skeleton" aria-label="AI đang chọn nghĩa theo câu" />}
      {state.status === 'error' && !dict.length && <div class="meta">{state.message} Chuyển sang EN để xem nghĩa tiếng Anh.</div>}
      {dict.length > 0 && (
        <div class="dict-vi">
          <div class="dict-vi-label">Từ điển</div>
          <ol>
            {dict.map((s, i) => (
              <li key={i}>
                {dict.length > 1 && <span class="pin">{s.pinyin} · </span>}
                {s.vietnamese.slice(0, 5).join('; ')}
              </li>
            ))}
          </ol>
        </div>
      )}
      {state.status !== 'done' && state.status !== 'loading' && !dict.length && state.status !== 'error' && <div class="meta">Không có trong từ điển.</div>}
    </>
  );
}

function EnglishBlock({ entry }: { entry: DictEntry }) {
  if (entry.senses.length === 0) return <div class="meta">Không có trong từ điển CC-CEDICT.</div>;
  return (
    <ol>
      {entry.senses.slice(0, 3).map((s, i) => (
        <li key={i}>
          {entry.senses.length > 1 && <span class="pin">{s.pinyin} · </span>}
          {s.english.slice(0, 5).join('; ')}
        </li>
      ))}
    </ol>
  );
}
