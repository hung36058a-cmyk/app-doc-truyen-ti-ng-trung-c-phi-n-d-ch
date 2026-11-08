// ui/components/AiKeysEditor.tsx — Danh sách API key theo thứ tự ưu tiên: thêm, xóa, đưa lên/xuống.
// Key đứng đầu được dùng trước; hết lượt hoặc hết tiền thì app tự chuyển sang key kế tiếp.

import { useState } from 'preact/hooks';
import type { AiKey, AiKeyProvider } from '@/core/types';

interface Props {
  keys: AiKey[];
  onChange: (keys: AiKey[]) => void;
  restingReason: (id: string) => string | null;
}

const mask = (k: string) => (k.length > 10 ? `${k.slice(0, 4)}…${k.slice(-4)}` : '••••');
const newId = () => `k-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function AiKeysEditor({ keys, onChange, restingReason }: Props) {
  const [provider, setProvider] = useState<AiKeyProvider>('gemini');
  const [label, setLabel] = useState('Miễn phí');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const move = (i: number, d: -1 | 1) => {
    const next = [...keys];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  const add = (e: Event) => {
    e.preventDefault();
    const k = key.trim();
    if (provider === 'gemini' && !k.startsWith('AIza')) return setError('Key Gemini thường bắt đầu bằng "AIza".');
    if (provider === 'claude' && !k.startsWith('sk-ant-')) return setError('Key Claude bắt đầu bằng "sk-ant-".');
    if (keys.some((x) => x.key === k)) return setError('Key này đã có trong danh sách.');
    onChange([...keys, { id: newId(), provider, label: label.trim() || (provider === 'gemini' ? 'Gemini' : 'Claude'), key: k }]);
    setKey('');
    setError('');
  };

  return (
    <div class="keys-editor">
      {keys.length === 0 ? (
        <p class="meta">Chưa có key nào. Thêm key Gemini miễn phí trước, key trả phí sau.</p>
      ) : (
        <ol class="key-list">
          {keys.map((k, i) => {
            const resting = restingReason(k.id);
            return (
              <li key={k.id} class="key-row">
                <span class="key-rank" aria-hidden="true">{i + 1}</span>
                <div class="key-info">
                  <strong>{k.provider === 'gemini' ? 'Gemini' : 'Claude'} · {k.label}</strong>
                  <span class="meta">{mask(k.key)}{resting && <span class="key-resting"> · tạm nghỉ: {resting}</span>}</span>
                </div>
                {confirmDel === k.id ? (
                  <div class="key-actions">
                    <button type="button" class="btn" onClick={() => setConfirmDel(null)}>Giữ</button>
                    <button type="button" class="btn btn-danger" onClick={() => { onChange(keys.filter((x) => x.id !== k.id)); setConfirmDel(null); }}>Xóa</button>
                  </div>
                ) : (
                  <div class="key-actions">
                    <button type="button" class="icon-btn" aria-label={`Đưa ${k.label} lên`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                    <button type="button" class="icon-btn" aria-label={`Đưa ${k.label} xuống`} disabled={i === keys.length - 1} onClick={() => move(i, 1)}>↓</button>
                    <button type="button" class="icon-btn" aria-label={`Xóa ${k.label}`} onClick={() => setConfirmDel(k.id)}>✕</button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <form class="key-add" onSubmit={add}>
        <div class="field-row">
          <div class="field">
            <label for="key-provider">Loại</label>
            <select id="key-provider" value={provider} onChange={(e) => setProvider(e.currentTarget.value as AiKeyProvider)}>
              <option value="gemini">Gemini</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div class="field">
            <label for="key-label">Tên</label>
            <input id="key-label" type="text" value={label} placeholder="Miễn phí / Trả phí" onInput={(e) => setLabel(e.currentTarget.value)} />
          </div>
        </div>
        <div class="field">
          <label for="key-value">API key</label>
          <input id="key-value" type="password" autocomplete="off" placeholder={provider === 'gemini' ? 'AIza…' : 'sk-ant-…'} value={key} onInput={(e) => setKey(e.currentTarget.value)} />
        </div>
        {error && <p class="notice notice-error" role="alert">{error}</p>}
        <button type="submit" class="btn btn-primary" disabled={!key.trim()}>Thêm key vào cuối danh sách</button>
      </form>
    </div>
  );
}
