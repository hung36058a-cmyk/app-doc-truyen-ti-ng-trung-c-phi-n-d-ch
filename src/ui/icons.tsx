// ui/icons.tsx — Icon nét (SVG) dùng trong app. Thêm icon mới: thêm một hàm vào đây.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
} as const;

type P = { size?: number };

export const IconBooks = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M4 5h6v14H4zM14 5h6v14h-6z" /></svg>
);
export const IconBookmark = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M6 3h11a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z" /></svg>
);
export const IconGear = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
  </svg>
);
export const IconPlus = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconBack = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconList = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const IconStar = ({ size = 20, filled = false }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
  </svg>
);
export const IconSpeaker = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
export const IconTrash = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
