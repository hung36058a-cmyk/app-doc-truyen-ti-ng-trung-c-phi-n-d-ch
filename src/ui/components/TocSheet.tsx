// ui/components/TocSheet.tsx — Mục lục: chọn chương để nhảy tới.

import type { TocItem } from '@/core/types';

interface Props {
  toc: TocItem[];
  current: number;
  onPick: (chapterIndex: number) => void;
  onClose: () => void;
}

export function TocSheet({ toc, current, onPick, onClose }: Props) {
  return (
    <>
      <button class="backdrop" aria-label="Đóng mục lục" onClick={onClose} style={{ background: 'rgba(0,0,0,0.25)' }} />
      <section class="sheet" role="dialog" aria-label="Mục lục">
        <div class="grip" aria-hidden="true" />
        <h2 style={{ margin: 0, fontSize: '18px' }}>Mục lục</h2>
        <ul class="toc-list">
          {toc.map((t, i) => (
            <li key={i}>
              <button aria-current={t.chapterIndex === current} onClick={() => onPick(t.chapterIndex)}>
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
