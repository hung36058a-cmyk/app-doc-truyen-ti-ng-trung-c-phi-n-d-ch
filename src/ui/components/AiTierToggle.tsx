// ui/components/AiTierToggle.tsx — Hai nút "Dịch tự động / Dịch nâng cao", dùng chung ở bong bóng tra từ,
// bảng tra từ đầy đủ và khung dịch câu/đoạn. Đổi ở đâu cũng là đổi chung một cài đặt (aiMode).
// Tự động = Gemini Flash, nâng cao = Gemini Pro.

import type { AiMode } from '@/core/types';

interface Props {
  value: AiMode;
  onChange: (m: AiMode) => void;
  small?: boolean; // bản gọn cho bong bóng tra từ
}

export function AiTierToggle({ value, onChange, small = false }: Props) {
  return (
    <div class={`seg ai-tier${small ? ' ai-tier-sm' : ''}`} role="group" aria-label="Mức dịch">
      <button aria-pressed={value === 'save'} onClick={() => onChange('save')}>Dịch tự động</button>
      <button aria-pressed={value === 'quality'} onClick={() => onChange('quality')}>Dịch nâng cao</button>
    </div>
  );
}
