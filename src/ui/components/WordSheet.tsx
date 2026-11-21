// ui/components/WordSheet.tsx — Popup tra từ (trượt lên từ đáy màn hình):
// từ, pinyin, âm Hán Việt, nghĩa Việt (AI) / Anh (CC-CEDICT), nút Lưu, nút nghe, tra từng chữ.

import type { AiMode, DictEntry, MeaningLang, PhrasePart, VietMeaning } from '@/core/types';
import { canSpeak, speak } from '@/modules/speech/speak';
import { useSynonyms } from '../hooks/useSynonyms';
import { useWordLookup, type VietState } from '../hooks/useWordLookup';
import { IconSpeaker, IconStar } from '../icons';
import { AiTierToggle } from './AiTierToggle';
import { CopyButton } from './CopyButton';
import { PhraseParts } from './PhraseParts';
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

export function WordSheet(p: Props) {
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
      <button class="backdrop" aria-label="Đóng popup" onClick={p.onClose} />
      <section class="sheet" role="dialog" aria-label={`Nghĩa của ${phrase}`}>
        <div class="grip" aria-hidden="true" />
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
              <div class="sheet-word" lang="zh-Hant">{phrase}</div>
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
              <PhraseParts parts={synList} onPick={pickPart(synList, synHere)} />
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
            <PhraseParts parts={p.back.parts} current={nav && nav.items.join('|') === p.back.parts.map((x) => x.text).join('|') ? nav.index : -1} onPick={pickPart(p.back.parts, null)} />
          </div>
        )}

        <PhraseParts parts={parts} onPick={pickPart(parts, here)} />

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
      </section>
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
