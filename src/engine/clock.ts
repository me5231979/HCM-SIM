import type { SimAtT } from '../../content/schemas';

/** Sim time is minutes since midnight on day 1 of the period. Work runs 08:00 to 18:00; nights are skipped. */
export type SimTime = number;
export const DAY_START = 8 * 60;
export const DAY_END = 18 * 60;

export function at(a: SimAtT): SimTime {
  const [h, m] = a.at.split(':').map(Number);
  return (a.day - 1) * 1440 + h * 60 + m;
}

export const dayOf = (t: SimTime): number => Math.floor(t / 1440) + 1;
export const minuteOfDay = (t: SimTime): number => t % 1440;

/** Advance by work minutes, rolling past 18:00 into the next morning. */
export function advance(t: SimTime, minutes: number): SimTime {
  let cur = t;
  let left = minutes;
  while (left > 0) {
    const m = minuteOfDay(cur);
    if (m < DAY_START) { cur += DAY_START - m; continue; }
    if (m >= DAY_END) { cur += 1440 - m + DAY_START; continue; }
    const step = Math.min(left, DAY_END - m);
    cur += step;
    left -= step;
    if (minuteOfDay(cur) >= DAY_END && left > 0) cur += 1440 - DAY_END + DAY_START;
  }
  return cur;
}

/** Work minutes between two times (0 if b is before a). */
export function workMinutesBetween(a: SimTime, b: SimTime): number {
  if (b <= a) return 0;
  let total = 0;
  for (let d = dayOf(a); d <= dayOf(b); d++) {
    const s = Math.max(a, (d - 1) * 1440 + DAY_START);
    const e = Math.min(b, (d - 1) * 1440 + DAY_END);
    if (e > s) total += e - s;
  }
  return total;
}

export function clockLabel(t: SimTime): string {
  const m = minuteOfDay(t);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${mm} ${suffix}`;
}

export function countdownLabel(minutes: number): string {
  if (minutes <= 0) return 'Closed';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Cutoff urgency: warning inside 24 clock hours, critical inside 4 work hours. */
export type Urgency = 'normal' | 'warning' | 'critical' | 'closed';
export function urgency(now: SimTime, cutoff: SimTime): Urgency {
  if (now >= cutoff) return 'closed';
  if (workMinutesBetween(now, cutoff) <= 4 * 60) return 'critical';
  if (cutoff - now <= 24 * 60) return 'warning';
  return 'normal';
}

/** Real seconds per sim hour for each speed setting. */
export const SPEEDS = { relaxed: 40, standard: 24, brisk: 12 } as const;
export type Speed = keyof typeof SPEEDS;
