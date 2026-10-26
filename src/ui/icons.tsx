import type { PersonStatusKind } from '../status';
import type { JSX } from 'react';
import type { AreaId, MeterKey } from '../../content/schemas';

/** Inline SVG icons. Status always pairs a distinct shape with a text label; color is never the only cue. */
const S = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const Icon = {
  inbox: () => <svg {...S}><path d="M3 13l2.5-8h13L21 13v6H3z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></svg>,
  book: () => <svg {...S}><path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4z" /><path d="M20 4h-6v16" /></svg>,
  gear: () => <svg {...S}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
  pause: () => <svg {...S}><path d="M8 5v14M16 5v14" /></svg>,
  play: () => <svg {...S}><path d="M7 5l12 7-12 7z" fill="currentColor" /></svg>,
  skip: () => <svg {...S}><path d="M5 5l9 7-9 7zM17 5v14" /></svg>,
  list: () => <svg {...S}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>,
  cube: () => <svg {...S}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>,
  plus: () => <svg {...S}><path d="M12 5v14M5 12h14" /></svg>,
  minus: () => <svg {...S}><path d="M5 12h14" /></svg>,
  close: () => <svg {...S}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  hint: () => <svg {...S}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></svg>,
  clock: () => <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  check: () => <svg {...S}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  cross: () => <svg {...S}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  alert: () => <svg {...S}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.01" /></svg>,
  arrow: () => <svg {...S}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  external: () => <svg {...S}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>,
  pin: () => <svg {...S}><path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  flag: () => <svg {...S}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>,
  help: () => <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2" /><path d="M12 17v.01" /></svg>,
  ring: () => <svg {...S}><ellipse cx="12" cy="14" rx="9" ry="4.5" /><ellipse cx="12" cy="14" rx="5" ry="2.2" /></svg>,
  volume: () => <svg {...S}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /></svg>,
  mute: () => <svg {...S}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></svg>,
  mic: () => <svg {...S}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7" /></svg>,
  micOff: () => <svg {...S}><path d="M15 9.5V6a3 3 0 00-5.6-1.5M9 9v2a3 3 0 004.7 2.5" /><path d="M18.5 11a6.5 6.5 0 01-1 3.4M5.5 11a6.5 6.5 0 009.7 5.7M12 17.5V21M8.5 21h7M3 3l18 18" /></svg>,
  stop: () => <svg {...S}><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" /></svg>,
  chat: () => <svg {...S}><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>,
  more: () => <svg {...S}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" /></svg>,
  keyboard: () => <svg {...S}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>,
};

/** Icon for a legend entry in the tour and Help: symbols, controls, and meters share one lookup. */
export function LegendIcon({ k }: { k: string }) {
  if (k === 'talk' || k === 'issue' || k === 'done') return <StatusGlyph kind={k} />;
  if (k === 'accuracy' || k === 'complianceRisk' || k === 'employeeTrust' || k === 'managerSatisfaction') return <MeterGlyph k={k} />;
  const map: Record<string, () => JSX.Element> = { ring: Icon.ring, skip: Icon.skip, pause: Icon.pause, zoom: Icon.plus, view: Icon.list, binder: Icon.book, voices: Icon.volume, settings: Icon.gear, help: Icon.help };
  const C = map[k];
  return C ? <C /> : null;
}

/** One shape per HCM Academy area, always shown with the area's name. */
export function AreaGlyph({ a }: { a: AreaId }) {
  switch (a) {
    case 'start': return <svg {...S}><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>;
    case 'hiring': return <svg {...S}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" /><path d="M18 8v6M15 11h6" /></svg>;
    case 'payroll': return <svg {...S}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 9.5v.01M17.5 14.5v.01" /></svg>;
    case 'assignments': return <svg {...S}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>;
    case 'leave': return <svg {...S}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M10 13.5l4 4M14 13.5l-4 4" /></svg>;
    case 'costing': return <svg {...S}><path d="M12 3a9 9 0 109 9h-9z" /><path d="M14.5 3.3A9 9 0 0120.7 9.5H14.5z" /></svg>;
    case 'students': return <svg {...S}><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.5" /><path d="M21.5 9.5v5" /></svg>;
    default: return <svg {...S}><path d="M4 6a2 2 0 012-2h4l2 2.5h6a2 2 0 012 2V18a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><path d="M8 13h8M8 16h5" /></svg>;
  }
}

export function MeterGlyph({ k }: { k: MeterKey }) {
  if (k === 'accuracy') return <svg {...S}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>;
  if (k === 'complianceRisk') return <svg {...S}><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M12 8v5M12 16v.01" /></svg>;
  if (k === 'employeeTrust') return <svg {...S}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" /><path d="M16 4.5a3 3 0 010 6M18.5 20c-.3-2.2-1.2-3.8-2.6-4.8" /></svg>;
  return <svg {...S}><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 7V5h6v2M4 12h16" /></svg>;
}

export function StatusGlyph({ kind }: { kind: PersonStatusKind }) {
  if (kind === 'talk') return <svg {...S}><path d="M4 5h16v10H9l-5 4z" /></svg>;
  if (kind === 'issue') return <svg {...S}><circle cx="11" cy="12" r="7.5" /><path d="M11 8v4.5l2.5 1.5" /><path d="M20.5 4v5M20.5 12v.01" /></svg>;
  if (kind === 'done') return <svg {...S}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
  return null;
}
