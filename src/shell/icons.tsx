// Icons and the unicorn, copied from design/tablet-mockup.html.
import type { TabId } from './routes';

const stroke = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'aria-hidden': true,
} as const;

export const TAB_ICONS: Record<TabId, preact.JSX.Element> = {
  today: (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
  cal: (
    <svg {...stroke}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  ),
  meals: (
    <svg {...stroke}>
      <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-2 7 0 9v9" />
    </svg>
  ),
  grocery: (
    <svg {...stroke}>
      <path d="M3 4h2l2.5 11h10L20 8H6.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  ),
  chores: (
    <svg {...stroke}>
      <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" />
    </svg>
  ),
};

export function UnicornSvg() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="42" cy="40" r="14" fill="#FF8FC7" />
      <circle cx="33" cy="57" r="13" fill="#B18CFF" />
      <circle cx="34" cy="75" r="12" fill="#7CC8FF" />
      <circle cx="43" cy="91" r="11" fill="#7EE0A1" />
      <circle cx="54" cy="104" r="10" fill="#FFE066" />
      <path
        d="M48 120 C44 84 46 58 62 45 C74 35 92 38 100 52 C106 62 104 73 96 77 C88 81 80 79 76 84 C72 92 74 108 78 120 Z"
        fill="#FFFFFF"
        stroke="#E2D4F7"
        stroke-width="2"
      />
      <path d="M63 46 L58 28 L73 39 Z" fill="#FFFFFF" stroke="#E2D4F7" stroke-width="2" />
      <path d="M71 41 L86 8 L81 44 Z" fill="#FFD166" />
      <path
        d="M74 34 L83 31 M76 26 L84 23 M79 18 L85 16"
        stroke="#F4A93B"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle cx="66" cy="42" r="8" fill="#FF8FC7" />
      <circle cx="58" cy="48" r="6" fill="#B18CFF" />
      <path
        d="M80 57 q5 5 10 0"
        stroke="#2A1F3D"
        stroke-width="2.6"
        fill="none"
        stroke-linecap="round"
      />
      <circle cx="90" cy="67" r="4.5" fill="#FFB3D1" />
      <circle cx="100" cy="66" r="1.8" fill="#C9B6E6" />
    </svg>
  );
}
