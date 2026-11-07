// core/defaults.ts — Giá trị mặc định của cài đặt. Dùng chung cho lưu trữ và nút "Đặt lại".

import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  meaningLang: 'vi',
  theme: 'system',
  anthropicApiKey: '',
  reader: { fontSize: 21, lineHeight: 1.9, paraSpacing: 0.9, margin: 24, font: 'serif', paper: 'auto' },
  ankiDeck: 'zhongwenB1',
};
