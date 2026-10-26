import type { PersonStatusKind } from '../status';
import type { MeterKey } from '../../content/schemas';

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
};

export function MeterGlyph({ k }: { k: MeterKey }) {
  if (k === 'payrollAccuracy') return <svg {...S}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>;
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
