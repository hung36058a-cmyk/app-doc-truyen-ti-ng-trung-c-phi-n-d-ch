// ui/screens/SettingsScreen.tsx — Cài đặt: ngôn ngữ nghĩa, giao diện, deck Anki, chế độ AI, danh sách API key.

import { useEffect, useState } from 'preact/hooks';
import type { AppSettings, MeaningLang, ThemeMode } from '@/core/types';
import { useServices } from '../context';
import { AiKeysEditor } from '../components/AiKeysEditor';
import type { DictState } from '../App';

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  dictState: DictState;
}

export function SettingsScreen({ settings, onChange, dictState }: Props) {
  const { ai } = useServices();
  const [aiLabel, setAiLabel] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    ai.active().then((p) => setAiLabel(p?.label ?? null));
  }, [settings.aiKeys]);

  return (
    <main class="screen">
      <header class="screen-head"><h1>Cài đặt</h1></header>

      <p class="section-label">Đọc truyện</p>
      <div class="settings-group">
        <div class="setting">
          <label class="setting-label" for="set-lang">Ngôn ngữ nghĩa mặc định</label>
          <select id="set-lang" value={settings.meaningLang} onChange={(e) => onChange({ meaningLang: e.currentTarget.value as MeaningLang })}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">Tiếng Anh</option>
          </select>
        </div>
        <div class="setting">
          <label class="setting-label" for="set-theme">Giao diện</label>
          <select id="set-theme" value={settings.theme} onChange={(e) => onChange({ theme: e.currentTarget.value as ThemeMode })}>
            <option value="system">Theo máy</option>
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
          </select>
        </div>
      </div>

      <p class="section-label">Anki</p>
      <div class="settings-group">
        <div class="setting">
          <label class="setting-label" for="set-deck">
            Tên deck khi xuất
            <small>Trùng tên deck có sẵn trong AnkiDroid thì thẻ được thêm vào deck đó.</small>
          </label>
          <input
            id="set-deck"
            type="text"
            value={settings.ankiDeck}
            placeholder="zhongwenB1"
            onChange={(e) => onChange({ ankiDeck: e.currentTarget.value.trim() || 'zhongwenB1' })}
          />
        </div>
      </div>

      <p class="section-label">AI (nghĩa tiếng Việt, dịch, thẻ Anki)</p>
      <div class="settings-group">
        <div class="setting">
          <span class="setting-label">
            Chế độ
            <small>
              {settings.aiMode === 'save'
                ? 'Tiết kiệm: mọi việc dùng model rẻ (Gemini Flash-Lite), rẻ hơn khoảng 6 lần.'
                : 'Chất lượng cao: dịch đoạn và tạo thẻ dùng model tốt hơn (Gemini Flash), tốn hơn.'}
            </small>
          </span>
          <div class="seg" role="group" aria-label="Chế độ AI">
            <button aria-pressed={settings.aiMode === 'save'} onClick={() => onChange({ aiMode: 'save' })}>Tiết kiệm</button>
            <button aria-pressed={settings.aiMode === 'quality'} onClick={() => onChange({ aiMode: 'quality' })}>Chất lượng cao</button>
          </div>
        </div>
        <div class="setting">
          <span class="setting-label">
            Đang dùng
            <small>Trên claude.ai app dùng Claude của tài khoản bạn. Ở app riêng dùng các key bên dưới, theo thứ tự từ trên xuống.</small>
          </span>
          <span>
            <span class={`status-dot${aiLabel ? ' ok' : ''}`} />
            {aiLabel === undefined ? 'Đang kiểm tra…' : aiLabel ?? 'Chưa có'}
          </span>
        </div>
        <div class="setting setting-block">
          <span class="setting-label">
            API key theo thứ tự ưu tiên
            <small>Key số 1 dùng trước. Hết lượt miễn phí hoặc hết tiền thì tự chuyển sang key kế tiếp. Key lưu trên máy này.</small>
          </span>
          <AiKeysEditor keys={settings.aiKeys} onChange={(aiKeys) => { ai.clearResting(); onChange({ aiKeys }); }} restingReason={(id) => ai.restingReason(id)} />
        </div>
      </div>

      <p class="section-label">Dữ liệu</p>
      <div class="settings-group">
        <div class="setting">
          <span class="setting-label">
            Từ điển offline
            <small>CC-CEDICT (nghĩa Anh, pinyin) và Unihan (âm Hán Việt)</small>
          </span>
          <span class="meta">{dictState === 'ready' ? 'Sẵn sàng' : dictState === 'loading' ? 'Đang tải…' : 'Lỗi tải'}</span>
        </div>
        <div class="setting">
          <span class="setting-label">
            Phiên bản app
            <small>Thời điểm bản app này được tạo. Chưa khớp bản mới thì tắt hẳn app, mở lại 2 lần.</small>
          </span>
          <span class="meta">{__BUILD__}</span>
        </div>
        <div class="setting">
          <span class="setting-label">
            Nơi lưu
            <small>Truyện, vị trí đọc và từ đã lưu nằm trong trình duyệt của máy này.</small>
          </span>
        </div>
      </div>
    </main>
  );
}
