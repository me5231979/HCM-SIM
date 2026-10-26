import { create } from 'zustand';
import { createActor } from 'xstate';
import { areas, events, payday, people, week } from '../content';
import { at, CAUGHT_UP_FACTOR, clockLabel, dateLabel, dayStart, monthDayLabel, SPEEDS, weekdayLabel, workMinutesBetween, type Speed } from '../engine/clock';
import { areaScores, computeTotals, createGame, workload, type Game, type Mode, type Snapshot } from '../engine/game';
import { KEYS, clearAll, load, remove, save } from '../engine/save';
import { newSeed } from '../engine/rng';
import { rating } from '../engine/scoring';
import { weekMachine, type WeekPhase } from '../machines/weekMachine';
import type { AreaId, ConsequenceT } from '../../content/schemas';

export type View = '3d' | '2d';
export interface Settings {
  mode: Mode; speed: Speed; reducedMotion: boolean; view: View; textScale: number; seed: string; tourDone: boolean;
  /** Character voices (captions are always shown). */
  voices: boolean; voiceVolume: number;
  /** Opt-in: answer choices out loud with the browser's speech recognition. */
  speakBack: boolean;
  /** Offer live AI conversations; liveConsent records that the player agreed to the privacy notice. */
  live: boolean; liveConsent: boolean;
  /** Optional, for the debrief printout. Stays in this browser. */
  learnerName: string;
}
type RunAction =
  | { t: 'decide'; stepId: string; decisionId: string; choice: string; extra?: Record<string, number>; value?: string }
  | { t: 'hint'; stepId: string }
  | { t: 'tick'; minutes: number }
  | { t: 'finish' };
interface SavedRun { seed: string; mode: Mode; actions: RunAction[]; elapsedMs?: number }
interface Progress { runs: number; best: string | null; last: string | null }

export interface LiveResult { summary: string; notes: { good: boolean; text: string }[] }
export interface DayRecap {
  id: number;
  text: string;
  /** "Tuesday, Oct 20" */
  today: string;
  /** The day that just ended, and how it went. */
  yesterday: string;
  handled: number;
  missed: number;
  /** Requests due today, earliest first. */
  dueToday: { id: string; title: string; at: number }[];
  deadlines: string[];
  weekend: boolean;
}
export interface PaydayBeat { speaker: string; tone: ConsequenceT['tone']; line: string; summary: string; task?: string; causedBy?: string }

const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const defaultSettings: Settings = { mode: 'training', speed: 'standard', reducedMotion: !!prefersReduced, view: '3d', textScale: 1, seed: '', tourDone: false, voices: true, voiceVolume: 0.9, speakBack: false, live: true, liveConsent: false, learnerName: '' };

const liveEventSteps = () =>
  events.filter((e) => e.status === 'live' && e.mission === 'week' && e.step && e.window)
    .map((e) => ({ step: e.step!, from: at(e.window!.from), to: at(e.window!.to) }));

interface State {
  phase: WeekPhase;
  beat: number;
  settings: Settings;
  progress: Progress;
  game: Game | null;
  snap: Snapshot | null;
  actions: RunAction[];
  paused: boolean;
  pauses: number;
  openStepId: string | null;
  openNoiseId: string | null;
  inboxOpen: boolean;
  binderOpen: boolean;
  settingsOpen: boolean;
  helpOpen: boolean;
  tourStep: number;
  /** A new workday: a short recap of yesterday and what's due today. The clock waits until it's dismissed. */
  dayNotice: DayRecap | null;
  /** A greeting from someone you clicked who has nothing waiting. */
  bubble: { id: number; speaker: string; text: string } | null;
  /** A live conversation is open: the sim clock waits for it in every mode. */
  liveOpen: boolean;
  /** What a live conversation settled, shown with the decision's feedback (step.decision). */
  liveResults: Record<string, LiveResult>;
  readIds: string[];
  focus: string | null;
  announcement: string;
  carry: number;
  hasSavedRun: boolean;
  setSettings(p: Partial<Settings>): void;
  startRun(opts?: { seed?: string; mode?: Mode }): void;
  resumeRun(): void;
  begin(): void;
  startTour(): void;
  setTourStep(n: number): void;
  endTour(): void;
  decide(stepId: string, decisionId: string, choice: string, extra?: Record<string, number>, value?: string): void;
  flagRows(stepId: string, flagged: string[]): void;
  hint(stepId: string): void;
  tick(realMs: number): void;
  skipToNext(): void;
  finishPeriod(): void;
  openStep(id: string | null): void;
  openNoise(id: string | null): void;
  setPanel(p: Partial<Pick<State, 'inboxOpen' | 'binderOpen' | 'settingsOpen' | 'helpOpen' | 'paused' | 'focus' | 'dayNotice' | 'bubble' | 'liveOpen'>>): void;
  /** Record the answer a live conversation settled, after the player confirms it. */
  recordLive(stepId: string, decisionId: string, choiceId: string, extra: Record<string, number> | undefined, result: LiveResult): void;
  togglePause(): void;
  announce(msg: string): void;
  nextBeat(): void;
  skipPayday(): void;
  restart(): void;
  clearData(): void;
}

const actor = createActor(weekMachine).start();

/** Real time spent playing, for the debrief and the printout. Kept outside the store so it never re-renders the HUD. */
let elapsedMs = 0;
export const playMinutes = () => Math.round(elapsedMs / 60000);

export const paydayBeats = (snap: Snapshot): PaydayBeat[] => {
  const beats: PaydayBeat[] = snap.consequences.map((c) => ({ speaker: c.speaker, tone: c.tone, line: c.line, summary: c.summary, task: c.task, causedBy: c.causedBy }));
  const negatives = beats.filter((b) => b.tone === 'negative').length;
  beats.push({
    speaker: 'coach',
    tone: negatives ? 'negative' : 'positive',
    line: negatives === 0 ? week.payday.clean : week.payday.problems,
    summary: 'Debrief',
  });
  return beats;
};

/** Nothing to handle right now. upcoming: more requests are still to arrive. */
export function caughtUp(s: Pick<State, 'game' | 'snap'>): { caughtUp: boolean; more: boolean } {
  if (!s.game || !s.snap || s.snap.ended) return { caughtUp: false, more: false };
  const w = workload(s.game, s.snap);
  return { caughtUp: w.open.length === 0 && w.locked.length === 0, more: w.upcoming.length > 0 };
}

export const useGame = create<State>((set, get) => {
  const sync = () => {
    const { game } = get();
    if (!game) return;
    // Pay day: once play ends, scheduled consequences land and their costs count.
    if (game.snapshot().ended) game.settle(payday);
    const snap = game.snapshot();
    set({ snap });
    if (snap.ended && actor.getSnapshot().value === 'playing') {
      actor.send({ type: 'END', reason: snap.ended.reason, beats: paydayBeats(snap).length });
      remove(KEYS.run);
      const r = rating(areaScores(snap, areas.map((a) => a.id)), snap.meters);
      const prev = get().progress;
      const order = ['Keep practicing', 'Almost ready', 'Ready'];
      const best = !prev.best || order.indexOf(r) > order.indexOf(prev.best) ? r : prev.best;
      const progress = { runs: prev.runs + 1, best, last: r };
      save(KEYS.progress, progress);
      set({ progress, openStepId: null, inboxOpen: false, binderOpen: false, helpOpen: false, dayNotice: null, focus: null });
      get().announce('Time cards are in, and payroll signed off. Pay day is next.');
    } else if (!snap.ended) {
      save(KEYS.run, { seed: snap.seed, mode: snap.mode, actions: get().actions, elapsedMs } satisfies SavedRun);
    }
  };
  const push = (a: RunAction) => {
    const list = get().actions;
    const last = list[list.length - 1];
    if (a.t === 'tick' && last?.t === 'tick') set({ actions: [...list.slice(0, -1), { t: 'tick', minutes: last.minutes + a.minutes }] });
    else set({ actions: [...list, a] });
  };
  const visibleIds = () => {
    const { game, snap } = get();
    if (!game || !snap) return [] as string[];
    return snap.steps.filter((s) => ['open', 'locked'].includes(game.status(s))).map((s) => s.id);
  };
  /** A new workday: which day it is, how yesterday went, and what's due today. */
  const dayRecap = (snap: Snapshot, from: number): DayRecap => {
    const day = dayStart(snap.time);
    const prev = dayStart(from);
    const weekend = day - prev > 1440;
    const deadlines = snap.deadlines.filter((d) => dayStart(d.time) === day).map((d) => `${d.label} today at ${clockLabel(d.time)}.`);
    const text = `${weekend ? 'The weekend passes. ' : ''}${weekdayLabel(snap.time, true)}, ${monthDayLabel(snap.time)}. ${deadlines.join(' ')}`.trim();
    // Requests whose last decision landed on the day that just ended.
    const lastAt = new Map<string, { at: number; missed: boolean }>();
    for (const e of snap.log) { const cur = lastAt.get(e.stepId); if (!cur || e.simTime >= cur.at) lastAt.set(e.stepId, { at: e.simTime, missed: (cur?.missed ?? false) || e.missed }); }
    const ended = [...lastAt.values()].filter((v) => dayStart(v.at) === prev);
    const game = get().game!;
    const dueToday = snap.steps
      .filter((s) => dayStart(s.dueAt) === day && ['open', 'locked', 'upcoming'].includes(game.status(s)))
      .sort((a, b) => a.dueAt - b.dueAt)
      .map((s) => ({ id: s.id, title: s.title, at: s.dueAt }));
    return { id: snap.time, text, today: `${weekdayLabel(snap.time, true)}, ${monthDayLabel(snap.time)}`, yesterday: `${weekdayLabel(from, true)}, ${monthDayLabel(from)}`, handled: ended.filter((v) => !v.missed).length, missed: ended.filter((v) => v.missed).length, dueToday, deadlines, weekend };
  };
  const withArrivals = (fn: () => void) => {
    const before = new Set(visibleIds());
    const t0 = get().snap?.time ?? 0;
    fn();
    sync();
    const snap = get().snap;
    if (!snap || snap.ended) return;
    const fresh = visibleIds().filter((id) => !before.has(id)).map((id) => snap.steps.find((s) => s.id === id)!);
    const noise = week.noise.filter((n) => { const tt = at(n.at); return tt > t0 && tt <= snap.time; });
    const names = [...fresh.map((s) => s.title), ...noise.map((n) => n.subject)];
    const parts: string[] = [];
    if (dateLabel(snap.time) !== dateLabel(t0)) {
      const recap = dayRecap(snap, t0);
      set({ dayNotice: recap });
      parts.push(recap.text);
    }
    if (names.length) parts.push(`New in inbox: ${names.join('; ')}`);
    if (parts.length) get().announce(parts.join(' '));
  };

  actor.subscribe((s) => set({ phase: s.value as WeekPhase, beat: s.context.beat }));

  const makeGame = (seed: string, mode: Mode) => createGame({ mission: week, eventSteps: liveEventSteps(), seed, mode });

  return {
    phase: 'title',
    beat: 0,
    settings: load(KEYS.settings, defaultSettings),
    progress: load<Progress>(KEYS.progress, { runs: 0, best: null, last: null }),
    game: null,
    snap: null,
    actions: [],
    paused: false,
    pauses: 0,
    openStepId: null,
    openNoiseId: null,
    inboxOpen: false,
    binderOpen: false,
    settingsOpen: false,
    helpOpen: false,
    tourStep: 0,
    dayNotice: null,
    bubble: null,
    liveOpen: false,
    liveResults: {},
    readIds: [],
    focus: null,
    announcement: '',
    carry: 0,
    hasSavedRun: !!load<SavedRun | null>(KEYS.run, null as unknown as SavedRun)?.seed,

    setSettings(p) {
      // Switching to the manual clock mid-run is logged like a pause: allowed in every mode, never penalized.
      if (p.speed === 'manual' && get().settings.speed !== 'manual' && get().phase === 'playing') set((s) => ({ pauses: s.pauses + 1 }));
      const settings = { ...get().settings, ...p };
      save(KEYS.settings, settings);
      set({ settings });
    },
    startRun(opts = {}) {
      const seed = (opts.seed || get().settings.seed || newSeed()).trim().toLowerCase();
      const mode = opts.mode ?? get().settings.mode;
      get().setSettings({ mode, seed: '' });
      const game = makeGame(seed, mode);
      elapsedMs = 0;
      set({ game, actions: [], readIds: [], openStepId: null, openNoiseId: null, paused: false, pauses: 0, carry: 0, focus: null, hasSavedRun: false, dayNotice: null, bubble: null, liveOpen: false, liveResults: {}, tourStep: 0 });
      if (actor.getSnapshot().value !== 'title') actor.send({ type: 'RESTART' });
      actor.send({ type: 'START' });
      sync();
    },
    resumeRun() {
      const saved = load<SavedRun | null>(KEYS.run, null as unknown as SavedRun);
      if (!saved?.seed) return;
      const game = makeGame(saved.seed, saved.mode);
      elapsedMs = saved.elapsedMs ?? 0;
      for (const a of saved.actions) {
        if (a.t === 'decide') game.decide(a.stepId, a.decisionId, a.choice, { extra: a.extra, value: a.value });
        else if (a.t === 'hint') game.hint(a.stepId);
        else if (a.t === 'finish') game.finish();
        else game.tick(a.minutes);
      }
      set({ game, actions: saved.actions, readIds: [], openStepId: null, paused: true, hasSavedRun: false, settings: { ...get().settings, mode: saved.mode } });
      actor.send({ type: 'START' });
      actor.send({ type: 'BEGIN' });
      sync();
      get().announce('Run resumed and paused. Press Play to continue.');
    },
    begin() {
      actor.send({ type: 'BEGIN' });
      get().announce('The pay period is running. Your inbox has new items.');
    },
    startTour() {
      set({ tourStep: 0, helpOpen: false, openStepId: null, inboxOpen: false, focus: null });
      actor.send({ type: 'TOUR' });
    },
    setTourStep(n) { set({ tourStep: n }); },
    endTour() {
      get().setSettings({ tourDone: true });
      set({ tourStep: 0 });
      actor.send({ type: 'BEGIN' });
      get().announce('Tour finished. The clock is running. Open your inbox to begin.');
    },
    decide(stepId, decisionId, choice, extra, value) {
      const { game } = get();
      if (!game) return;
      push({ t: 'decide', stepId, decisionId, choice, extra, value });
      withArrivals(() => game.decide(stepId, decisionId, choice, { extra, value }));
    },
    recordLive(stepId, decisionId, choiceId, extra, result) {
      set((s) => ({ liveResults: { ...s.liveResults, [`${stepId}.${decisionId}`]: result } }));
      get().decide(stepId, decisionId, choiceId, extra);
    },
    flagRows(stepId, flagged) {
      const { game } = get();
      const step = game?.stepById(stepId);
      if (!game || !step?.review) return;
      const anomalies = computeTotals(game.snapshot(), people).filter((l) => l.anomaly).map((l) => l.employeeId);
      const caught = anomalies.length > 0 && anomalies.every((id) => flagged.includes(id));
      // Extra flags cost a manager's time; they're recorded so the feedback can name them.
      const extras = flagged.filter((id) => !anomalies.includes(id));
      const d = step.decisions[0];
      const choice = d.choices.find((c) => c.correct === caught && !c.hidden)!.id;
      get().decide(stepId, d.id, choice, extras.length ? { managerSatisfaction: -extras.length } : undefined, extras.length ? extras.join(',') : undefined);
    },
    hint(stepId) {
      const { game } = get();
      if (!game) return;
      push({ t: 'hint', stepId });
      game.hint(stepId);
      sync();
    },
    tick(realMs) {
      const s = get();
      if (s.phase === 'playing' && !s.snap?.ended && typeof document !== 'undefined' && !document.hidden) elapsedMs += realMs;
      if (s.phase !== 'playing' || !s.game || s.paused || s.liveOpen || s.dayNotice) return;
      if (s.settings.speed === 'manual') return;
      if (s.settings.mode === 'training' && (s.openStepId || s.binderOpen || s.settingsOpen || s.helpOpen || s.openNoiseId)) return;
      // Caught up: time runs faster until the next request, so nobody sits waiting.
      const factor = caughtUp(s).caughtUp ? CAUGHT_UP_FACTOR : 1;
      const total = s.carry + (realMs / 1000) * (60 / SPEEDS[s.settings.speed]) * factor;
      const minutes = Math.floor(total);
      set({ carry: total - minutes });
      if (minutes <= 0) return;
      push({ t: 'tick', minutes });
      withArrivals(() => s.game!.tick(minutes));
    },
    skipToNext() {
      const { game, snap } = get();
      if (!game || !snap || snap.ended) return;
      const times = [...snap.steps.map((s) => s.receivedAt), ...week.noise.map((n) => at(n.at))].filter((t) => t > snap.time);
      const next = Math.min(...times, snap.deadline);
      // Work minutes to the next arrival (the clock skips nights and weekends itself).
      const minutes = workMinutesBetween(snap.time, next);
      if (minutes <= 0) return;
      push({ t: 'tick', minutes });
      withArrivals(() => game.tick(minutes));
    },
    finishPeriod() {
      const { game } = get();
      if (!game) return;
      push({ t: 'finish' });
      game.finish();
      sync();
    },
    openStep(id) {
      set((s) => ({ openStepId: id, inboxOpen: id ? false : s.inboxOpen, readIds: id && !s.readIds.includes(id) ? [...s.readIds, id] : s.readIds, focus: id ? (s.game?.stepById(id)?.location ?? s.focus) : null }));
    },
    openNoise(id) {
      set((s) => ({ openNoiseId: id, readIds: id && !s.readIds.includes(id) ? [...s.readIds, id] : s.readIds }));
    },
    setPanel(p) { set(p); },
    togglePause() {
      set((s) => ({ paused: !s.paused, pauses: s.paused ? s.pauses : s.pauses + 1 }));
      get().announce(get().paused ? 'Paused.' : 'Running.');
    },
    announce(msg) { set({ announcement: '' }); setTimeout(() => set({ announcement: msg }), 30); },
    nextBeat() { actor.send({ type: 'NEXT_BEAT' }); },
    skipPayday() { actor.send({ type: 'SKIP_PAYDAY' }); },
    restart() {
      actor.send({ type: 'RESTART' });
      set({ game: null, snap: null, actions: [], openStepId: null, focus: null, hasSavedRun: false, helpOpen: false, dayNotice: null, bubble: null, liveOpen: false, liveResults: {}, tourStep: 0 });
    },
    clearData() {
      clearAll();
      set({ settings: defaultSettings, progress: { runs: 0, best: null, last: null }, hasSavedRun: false });
      get().announce('Your saved data was cleared.');
    },
  };
});

/** Inbox items visible now: mission and event steps that have arrived, plus noise. */
export function inboxItems(s: Pick<State, 'game' | 'snap' | 'readIds'>) {
  if (!s.game || !s.snap) return [];
  const { game, snap } = s;
  const tasks = snap.steps.filter((st) => st.receivedAt <= snap.time && game.status(st) !== 'skipped').map((st) => ({
    kind: 'task' as const, id: st.id, from: st.from, subject: st.title, receivedAt: st.receivedAt, dueAt: st.dueAt, priority: st.priority, status: game.status(st), unread: !s.readIds.includes(st.id),
    area: st.area as AreaId | undefined, quick: !!st.quick,
  }));
  const noise = week.noise.filter((n) => at(n.at) <= snap.time).map((n) => ({
    kind: 'noise' as const, id: n.id, from: n.from, subject: n.subject, receivedAt: at(n.at), dueAt: undefined, priority: 'low' as const, status: 'open' as const, unread: !s.readIds.includes(n.id),
    area: undefined as AreaId | undefined, quick: false,
  }));
  return [...tasks, ...noise];
}
