// ui/components/PosTag.tsx — Nhãn loại từ nhỏ đứng trước nghĩa: "N", "V", "ADJ"… hoặc "cụm động từ" với cụm.

import { posLabel } from '@/services/partOfSpeech';

export function PosTag({ raw, phrase = false }: { raw?: string; phrase?: boolean }) {
  const label = posLabel(raw, phrase);
  return label ? <span class={`pos-tag${label.length > 4 ? ' is-long' : ''}`}>{label}</span> : null;
}
