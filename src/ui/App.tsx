// ui/App.tsx — Khung app: khởi động service, áp dụng giao diện sáng/tối, điều hướng giữa các màn hình.
// Tab chính đổi theo hash (#thu-vien, #so-tu, #cai-dat); trang đọc mở chồng lên trên.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AppSettings } from '@/core/types';
import { createServices } from '@/services/container';
import { ServicesContext } from './context';
import { APP_VERSION } from '@/core/changelog';
import { BottomNav, type Tab } from './components/BottomNav';
import { LibraryScreen } from './screens/LibraryScreen';
import { ReaderScreen } from './screens/ReaderScreen';
import { VocabScreen } from './screens/VocabScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const TAB_HASH: Record<Tab, string> = { library: 'thu-vien', vocab: 'so-tu', settings: 'cai-dat' };

function tabFromHash(): Tab {
  const h = location.hash.replace('#', '');
  return (Object.keys(TAB_HASH) as Tab[]).find((t) => TAB_HASH[t] === h) ?? 'library';
}

export type DictState = 'loading' | 'ready' | 'error';

export function App() {
  const services = useMemo(() => createServices(), []);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => services.storage.settings.load());
  const [dictState, setDictState] = useState<DictState>('loading');

  useEffect(() => {
    services.dictionary.load().then(
      () => setDictState('ready'),
      () => setDictState('error'),
    );
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    services.storage.settings.save(next);
  };

  return (
    <ServicesContext.Provider value={services}>
      {readingBookId ? (
        <ReaderScreen
          bookId={readingBookId}
          dictState={dictState}
          settings={settings}
          onSettings={updateSettings}
          onClose={() => setReadingBookId(null)}
        />
      ) : (
        <div class="shell">
          {tab === 'library' && <LibraryScreen onOpen={setReadingBookId} />}
          {tab === 'vocab' && <VocabScreen settings={settings} />}
          {tab === 'settings' && <SettingsScreen settings={settings} onChange={updateSettings} dictState={dictState} />}
          <BottomNav current={tab} hrefs={TAB_HASH} />
        </div>
      )}
      {/* số phiên bản chỉ hiện ở các màn hình ngoài, không hiện trong trang đọc */}
      {!readingBookId && <span class="version-tag" aria-hidden="true">v{APP_VERSION}</span>}
    </ServicesContext.Provider>
  );
}
