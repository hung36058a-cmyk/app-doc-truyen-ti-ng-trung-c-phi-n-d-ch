// ui/components/CardEditor.tsx — Sửa tay nội dung một thẻ trước khi xuất sang Anki.

import { useState } from 'preact/hooks';
import type { CardContent } from '@/core/types';

interface Props {
  word: string;
  card: CardContent;
  onSave: (card: CardContent) => void;
  onCancel: () => void;
}

/** Ví dụ sửa dưới dạng chữ: mỗi dòng "câu tiếng Trung | bản dịch". */
const examplesToText = (ex: CardContent['examples']) => ex.map((e) => e.zh).join('\n');
const textToExamples = (t: string) =>
  t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    return { zh: l.split('|')[0].trim(), vi: '' };
  });

export function CardEditor({ word, card, onSave, onCancel }: Props) {
  const [c, setC] = useState(card);
  const [examples, setExamples] = useState(examplesToText(card.examples));
  const [patterns, setPatterns] = useState(card.patterns.join('\n'));
  const id = (k: string) => `edit-${k}-${word}`;
  const field = (k: 'pinyin' | 'hanviet' | 'vietnamese' | 'english' | 'partOfSpeech' | 'sentenceVi' | 'comparison', label: string, multiline = false) => (
    <div class="field">
      <label for={id(k)}>{label}</label>
      {multiline ? (
        <textarea id={id(k)} rows={2} value={c[k]} onInput={(e) => setC({ ...c, [k]: e.currentTarget.value })} />
      ) : (
        <input id={id(k)} type="text" value={c[k]} onInput={(e) => setC({ ...c, [k]: e.currentTarget.value })} />
      )}
    </div>
  );

  const save = (e: Event) => {
    e.preventDefault();
    onSave({ ...c, examples: textToExamples(examples), patterns: patterns.split('\n').map((p) => p.trim()).filter(Boolean), edited: true });
  };

  return (
    <form class="card-editor" onSubmit={save}>
      <div class="field-row">
        {field('pinyin', 'Pinyin')}
        {field('hanviet', 'Hán Việt')}
      </div>
      {field('vietnamese', 'Nghĩa tiếng Việt', true)}
      <div class="field-row">
        {field('english', 'Nghĩa tiếng Anh')}
        {field('partOfSpeech', 'Từ loại')}
      </div>
      <div class="field">
        <label for={id('examples')}>Câu ví dụ <small>mỗi dòng một câu</small></label>
        <textarea id={id('examples')} rows={3} lang="zh-Hant" value={examples} onInput={(e) => setExamples(e.currentTarget.value)} />
      </div>
      <div class="field">
        <label for={id('patterns')}>Cấu trúc đi kèm <small>mỗi dòng một cấu trúc</small></label>
        <textarea id={id('patterns')} rows={2} value={patterns} onInput={(e) => setPatterns(e.currentTarget.value)} />
      </div>
      {field('comparison', 'Phân biệt từ gần nghĩa (mỗi từ một dòng)', true)}
      <div class="row">
        <button type="button" class="btn" onClick={onCancel}>Hủy</button>
        <button type="submit" class="btn btn-primary">Lưu thẻ</button>
      </div>
    </form>
  );
}
