// ui/components/BottomNav.tsx — Thanh điều hướng dưới cùng: Thư viện, Sổ từ, Cài đặt.

import { IconBookmark, IconBooks, IconGear } from '../icons';

export type Tab = 'library' | 'vocab' | 'settings';

const ITEMS: { tab: Tab; label: string; Icon: typeof IconBooks }[] = [
  { tab: 'library', label: 'Thư viện', Icon: IconBooks },
  { tab: 'vocab', label: 'Sổ từ', Icon: IconBookmark },
  { tab: 'settings', label: 'Cài đặt', Icon: IconGear },
];

export function BottomNav({ current, hrefs }: { current: Tab; hrefs: Record<Tab, string> }) {
  return (
    <nav class="bottom-nav" aria-label="Điều hướng chính">
      {ITEMS.map(({ tab, label, Icon }) => (
        <a key={tab} href={`#${hrefs[tab]}`} aria-current={current === tab ? 'page' : undefined}>
          <Icon />
          {label}
        </a>
      ))}
    </nav>
  );
}
