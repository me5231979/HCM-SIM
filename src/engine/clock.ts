import type { SimAtT } from '../../content/schemas';

/**
 * Sim time is minutes since 1970-01-01 00:00 on a calendar with no time zones, so real payroll calendar
 * dates map straight in. Work runs 08:00 to 18:00, Monday to Friday; nights and weekends are skipped.
 */
export type SimTime = number;
export const DAY_START = 8 * 60;
export const DAY_END = 18 * 60;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Midnight of an ISO date (YYYY-MM-DD) in sim minutes. */
export function dateStart(iso: string): SimTime {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 60000;
}

export function at(a: SimAtT): SimTime {
  const [h, m] = a.at.split(':').map(Number);
  return dateStart(a.date) + h * 60 + m;
}

export const minuteOfDay = (t: SimTime): number => ((t % 1440) + 1440) % 1440;
const dateOf = (t: SimTime) => new Date(Math.floor(t / 1440) * 86400000);
export const weekday = (t: SimTime): number => dateOf(t).getUTCDay();
export const isWorkday = (t: SimTime): boolean => weekday(t) !== 0 && weekday(t) !== 6;
export const dayStart = (t: SimTime): SimTime => t - minuteOfDay(t);

/** "Thu Oct 22" */
export function dateLabel(t: SimTime): string {
  const d = dateOf(t);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
/** "Thu" or "Thursday" */
export const weekdayLabel = (t: SimTime, long = false): string => (long ? WEEKDAYS_LONG : WEEKDAYS)[weekday(t)];
/** "Oct 22" */
export function monthDayLabel(t: SimTime): string {
  const d = dateOf(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function clockLabel(t: SimTime): string {
  const m = minuteOfDay(t);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Move a time forward into working hours (no-op if already inside them). */
function toWorkingTime(t: SimTime): SimTime {
  let cur = t;
  for (let guard = 0; guard < 14; guard++) {
    const m = minuteOfDay(cur);
    if (!isWorkday(cur) || m >= DAY_END) { cur = dayStart(cur) + 1440 + DAY_START; continue; }
    if (m < DAY_START) { cur = dayStart(cur) + DAY_START; continue; }
    return cur;
  }
  return cur;
}

/**
 * Advance by work minutes, rolling past 18:00 into the next workday morning and over weekends.
 * The result is always inside working hours: landing on 18:00 means the next workday at 08:00,
 * so the clock never sits on a Friday evening with zero work minutes to the next request.
 */
export function advance(t: SimTime, minutes: number): SimTime {
  if (minutes <= 0) return t;
  let cur = t;
  let left = minutes;
  while (left > 0) {
    cur = toWorkingTime(cur);
    const step = Math.min(left, DAY_END - minuteOfDay(cur));
    cur += step;
    left -= step;
  }
  return toWorkingTime(cur);
}

/** Work minutes between two times (0 if b is not after a). */
export function workMinutesBetween(a: SimTime, b: SimTime): number {
  if (b <= a) return 0;
  let total = 0;
  for (let d = dayStart(a); d <= b; d += 1440) {
    if (!isWorkday(d)) continue;
    const s = Math.max(a, d + DAY_START);
    const e = Math.min(b, d + DAY_END);
    if (e > s) total += e - s;
  }
  return total;
}

export function countdownLabel(minutes: number): string {
  if (minutes <= 0) return 'Closed';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Deadline urgency by work time left: warning inside one workday (10 hours), critical inside 4 hours. */
export type Urgency = 'normal' | 'warning' | 'critical' | 'closed';
export function urgency(now: SimTime, deadline: SimTime): Urgency {
  if (now >= deadline) return 'closed';
  const left = workMinutesBetween(now, deadline);
  if (left <= 4 * 60) return 'critical';
  if (left <= DAY_END - DAY_START) return 'warning';
  return 'normal';
}

/** Real seconds per sim hour for each timed speed. Manual: the clock moves only on decisions and Skip (WCAG 2.2.1). */
export const SPEEDS = { relaxed: 40, standard: 24, brisk: 12 } as const;
export type Speed = keyof typeof SPEEDS | 'manual';
/** How much faster the clock runs while you're caught up, so nobody sits waiting for the next request. */
export const CAUGHT_UP_FACTOR = 10;
