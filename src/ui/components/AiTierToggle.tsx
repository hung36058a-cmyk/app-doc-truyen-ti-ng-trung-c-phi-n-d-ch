// ui/components/AiTierToggle.tsx — Công tắc nhỏ "Nâng cao" (bật = Dịch nâng cao / Gemini Pro,
// tắt = Dịch tự động / Gemini Flash). Dùng chung ở bong bóng tra từ, bảng tra từ và khung dịch câu/đoạn;
// đổi ở đâu cũng là đổi chung một cài đặt (aiMode). Cố ý làm nhỏ, đặt xa nút Lưu để khó bấm nhầm.

import type { AiMode } from '@/core/types';

interface Props {
  value: AiMode;
  onChange: (m: AiMode) => void;
}

export function AiTierToggle({ value, onChange }: Props) {
  const on = value === 'quality';
  return (
    <button
      class="tier-switch"
      role="switch"
      aria-checked={on}
      title={on ? 'Đang dùng Dịch nâng cao (Gemini Pro)' : 'Đang dùng Dịch tự động (Gemini Flash)'}
      onClick={() => onChange(on ? 'save' : 'quality')}
    >
      <span class="tier-track" aria-hidden="true"><span class="tier-thumb" /></span>
      Nâng cao
    </button>
  );
}
