// ui/components/DisplayBar.tsx — Thanh chỉnh hiển thị nhanh ở trang đọc. Mỗi thay đổi áp dụng ngay
// lên đoạn văn phía trên (xem trước trực tiếp) và được lưu lại cho lần đọc sau.

import type { ReaderDisplay, ReaderFont, ReaderPaper } from '@/core/types';
import { DEFAULT_SETTINGS } from '@/core/defaults';

interface Props {
  value: ReaderDisplay;
  onChange: (patch: Partial<ReaderDisplay>) => void;
  lookedCount: number; // số từ đã tra (đang được gạch chân)
  onClearLooked: () => void;
  onClose: () => void;
}

/** Giới hạn và bước nhảy của từng thông số. Muốn đổi khoảng chỉnh: sửa bảng này. */
const STEPPERS: { key: 'fontSize' | 'lineHeight' | 'paraSpacing' | 'margin'; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: 'fontSize', label: 'Cỡ chữ', min: 15, max: 34, step: 1, fmt: (v) => `${v}` },
  { key: 'lineHeight', label: 'Khoảng cách dòng', min: 1.4, max: 2.6, step: 0.1, fmt: (v) => v.toFixed(1) },
  { key: 'paraSpacing', label: 'Khoảng cách đoạn', min: 0, max: 2, step: 0.2, fmt: (v) => v.toFixed(1) },
  { key: 'margin', label: 'Lề hai bên', min: 12, max: 48, step: 4, fmt: (v) => `${v}` },
];

const FONTS: { id: ReaderFont; label: string }[] = [
  { id: 'serif', label: 'Có chân' },
  { id: 'sans', label: 'Không chân' },
];

const PAPERS: { id: ReaderPaper; label: string }[] = [
  { id: 'auto', label: 'Theo app' },
  { id: 'white', label: 'Trắng' },
  { id: 'ivory', label: 'Giấy ngà' },
  { id: 'dark', label: 'Tối' },
];

const round = (v: number) => Math.round(v * 10) / 10;

export function DisplayBar({ value, onChange, lookedCount, onClearLooked, onClose }: Props) {
  return (
    <>
      <button class="backdrop" aria-label="Đóng thanh chỉnh hiển thị" onClick={onClose} />
      <section class="sheet display-bar" role="dialog" aria-label="Chỉnh hiển thị">
        <div class="grip" aria-hidden="true" />
        <div class="sheet-top">
          <h2 class="sheet-heading">Hiển thị</h2>
          <button class="btn btn-ghost" onClick={() => onChange({ ...DEFAULT_SETTINGS.reader })}>Đặt lại</button>
        </div>

        {STEPPERS.map((s) => (
          <div class="stepper" key={s.key}>
            <span>{s.label}</span>
            <div class="stepper-ctrl">
              <button
                class="icon-btn"
                aria-label={`Giảm ${s.label.toLowerCase()}`}
                disabled={value[s.key] <= s.min}
                onClick={() => onChange({ [s.key]: Math.max(s.min, round(value[s.key] - s.step)) })}
              >
                −
              </button>
              <output class="stepper-val">{s.fmt(value[s.key])}</output>
              <button
                class="icon-btn"
                aria-label={`Tăng ${s.label.toLowerCase()}`}
                disabled={value[s.key] >= s.max}
                onClick={() => onChange({ [s.key]: Math.min(s.max, round(value[s.key] + s.step)) })}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div class="choice-row" role="group" aria-label="Font chữ">
          <span>Font</span>
          <div class="seg">
            {FONTS.map((f) => (
              <button key={f.id} aria-pressed={value.font === f.id} onClick={() => onChange({ font: f.id })} class={`font-${f.id}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div class="choice-row" role="group" aria-label="Màu nền">
          <span>Nền</span>
          <div class="paper-row">
            {PAPERS.map((p) => (
              <button key={p.id} class={`paper-swatch paper-${p.id}`} aria-pressed={value.paper === p.id} onClick={() => onChange({ paper: p.id })}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div class="choice-row" role="group" aria-label="Gạch chân từ đã tra">
          <span>Gạch chân từ đã tra</span>
          <div class="seg">
            <button aria-pressed={value.showLooked} onClick={() => onChange({ showLooked: true })}>Hiện</button>
            <button aria-pressed={!value.showLooked} onClick={() => onChange({ showLooked: false })}>Ẩn</button>
          </div>
        </div>
        {lookedCount > 0 && (
          <button class="btn btn-ghost clear-looked" onClick={onClearLooked}>
            Xóa gạch chân của {lookedCount} từ đã tra
          </button>
        )}

        <div class="choice-row" role="group" aria-label="Chạm mép để lật trang">
          <span>Chạm mép để lật trang</span>
          <div class="seg">
            <button aria-pressed={value.tapPaging} onClick={() => onChange({ tapPaging: true })}>Bật</button>
            <button aria-pressed={!value.tapPaging} onClick={() => onChange({ tapPaging: false })}>Tắt</button>
          </div>
        </div>
      </section>
    </>
  );
}
