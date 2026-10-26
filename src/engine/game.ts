import type { ApprovalStateT, ChoiceT, DecisionT, DeltasT, EventStepT, MissionT, Meters, PersonT, StepT } from '../../content/schemas';
import { advance, at, type SimTime } from './clock';
import { createConsequenceQueue, type ScheduledConsequence } from './consequences';
import { createEventBus, type DecisionEvent } from './eventBus';
import { createRng } from './rng';
import { applyDeltas, hintDelta, initialMeters } from './scoring';

export type Mode = 'training' | 'certification';
export interface ActiveStep extends Omit<StepT, 'receivedAt' | 'dueAt'> { receivedAt: SimTime; dueAt: SimTime; source: 'mission' | 'event' }
export interface Resolution { choiceId: string; value?: string; at: SimTime; missed: boolean; eventId: string }
export type StepStatus = 'upcoming' | 'locked' | 'open' | 'done' | 'missed' | 'skipped';
/** finished: the player wrapped up early. deadline: time cards came due and payroll signed off. */
export type EndReason = 'finished' | 'deadline';
export interface DeadlineInfo { key: 'transactions' | 'timecards'; label: string; short: string; time: SimTime; sme: boolean }

export interface Snapshot {
  seed: string;
  mode: Mode;
  time: SimTime;
  start: SimTime;
  /** When play ends: time cards due, then payroll signs off. */
  deadline: SimTime;
  deadlines: DeadlineInfo[];
  steps: ActiveStep[];
  resolutions: Record<string, Record<string, Resolution>>;
  log: DecisionEvent[];
  meters: Meters;
  hints: string[];
  consequences: ScheduledConsequence[];
  ended?: { reason: EndReason; at: SimTime };
}

export interface GameInput {
  mission: MissionT;
  eventSteps: { step: EventStepT; from: SimTime; to: SimTime }[];
  seed: string;
  mode: Mode;
}

export function isDecisionActive(d: DecisionT, res: Record<string, Resolution> | undefined): boolean {
  if (!d.showIf) return true;
  return res?.[d.showIf.decision]?.choiceId === d.showIf.choice;
}

export function createGame({ mission, eventSteps, seed, mode }: GameInput) {
  const rng = createRng(seed);
  const bus = createEventBus();
  const queue = createConsequenceQueue();
  const deadlines: DeadlineInfo[] = (['transactions', 'timecards'] as const).map((key) => {
    const d = mission.deadlines[key];
    return { key, label: d.label, short: d.short, time: at(d), sme: d.sme };
  });
  const deadline = Math.max(...deadlines.map((d) => d.time));
  const start = at(mission.start);
  let meters = initialMeters();
  let time = start;
  let log: DecisionEvent[] = [];
  let hints: string[] = [];
  let ended: Snapshot['ended'];
  const resolutions: Snapshot['resolutions'] = {};

  const steps: ActiveStep[] = [
    ...mission.steps.map((s) => ({ ...s, receivedAt: at(s.receivedAt), dueAt: at(s.dueAt), source: 'mission' as const })),
    ...eventSteps.map(({ step, from, to }) => {
      // Seeded arrival inside the event window, on a 10-minute grid.
      const slots = Math.max(1, Math.floor((to - from) / 10) + 1);
      const receivedAt = from + Math.floor(rng() * slots) * 10;
      return { ...step, receivedAt, dueAt: advance(receivedAt, step.dueMinutes), source: 'event' as const };
    }),
  ].sort((a, b) => a.receivedAt - b.receivedAt);

  // Subscribers: scoring and consequences listen to decisions. Nothing else changes meters.
  bus.on('decision', (e) => {
    meters = applyDeltas(meters, e.deltas);
    const step = steps.find((s) => s.id === e.stepId)!;
    const choice = choiceOf(step, e.decisionId, e.choiceId);
    choice.consequences?.forEach((c) => queue.schedule({ ...c, causedBy: e.id, stepId: e.stepId, decisionId: e.decisionId, choiceId: e.choiceId }));
  });
  bus.on('hint', (e) => { meters = applyDeltas(meters, hintDelta(e.meter)); });

  function choiceOf(step: ActiveStep, decisionId: string, choiceId: string): ChoiceT {
    const d = step.decisions.find((x) => x.id === decisionId);
    const c = d?.choices.find((x) => x.id === choiceId);
    if (!d || !c) throw new Error(`Unknown choice ${step.id}.${decisionId}.${choiceId}`);
    return c;
  }

  function isComplete(step: ActiveStep): boolean {
    const res = resolutions[step.id];
    return step.decisions.every((d) => !isDecisionActive(d, res) || res?.[d.id]);
  }

  function isSkipped(step: ActiveStep): boolean {
    const s = step.skipIf;
    return !!s && resolutions[s.step]?.[s.decision]?.choiceId === s.choice;
  }

  function status(step: ActiveStep): StepStatus {
    if (isSkipped(step)) return 'skipped';
    if (isComplete(step)) {
      const res = Object.values(resolutions[step.id] ?? {});
      return res.some((r) => r.missed) ? 'missed' : 'done';
    }
    if (step.receivedAt > time) return 'upcoming';
    const reqs = step.requires ?? [];
    const blocked = reqs.some((r) => { const s = steps.find((x) => x.id === r); return s && !isComplete(s) && !isSkipped(s); });
    return blocked ? 'locked' : 'open';
  }

  function record(step: ActiveStep, d: DecisionT, choiceId: string, missed: boolean, value?: string, extra?: DeltasT, when: SimTime = time) {
    if (resolutions[step.id]?.[d.id] || ended) return;
    const c = choiceOf(step, d.id, choiceId);
    const deltas: DeltasT = { ...c.deltas };
    for (const [k, v] of Object.entries(extra ?? {}) as [keyof DeltasT, number][]) deltas[k] = (deltas[k] ?? 0) + v;
    const e: DecisionEvent = {
      id: `${step.id}.${d.id}`, stepId: step.id, decisionId: d.id, choiceId, correct: c.correct && !missed,
      errorCode: c.errorCode, deltas, simTime: when, missed, value,
    };
    resolutions[step.id] = { ...resolutions[step.id], [d.id]: { choiceId, value, at: when, missed, eventId: e.id } };
    log = [...log, e];
    bus.emit('decision', e);
  }

  /** Resolve every open decision on a step with its missed outcome, stamped when its deadline passed (not when the clock caught up). */
  function missStep(step: ActiveStep) {
    const when = Math.min(time, step.dueAt);
    for (const d of step.decisions) {
      if (isDecisionActive(d, resolutions[step.id]) && !resolutions[step.id]?.[d.id]) record(step, d, d.missedChoiceId, true, undefined, undefined, when);
    }
  }

  /** Anything past due is processed as it stands; at the final deadline, payroll signs off and play ends. */
  function checkDeadlines() {
    for (const s of steps) {
      if (s.receivedAt <= time && s.dueAt <= time && !isComplete(s) && !isSkipped(s)) missStep(s);
    }
    if (time >= deadline && !ended) end('deadline', deadline);
  }

  function end(reason: EndReason, when: SimTime) {
    for (const s of steps) if (s.receivedAt <= time && !isSkipped(s) && !isComplete(s)) missStep(s);
    ended = { reason, at: when };
  }

  return {
    bus,
    status,
    stepById: (id: string) => steps.find((s) => s.id === id),
    decide(stepId: string, decisionId: string, choiceIdOrValue: string, opts: { value?: string; extra?: DeltasT } = {}) {
      const step = steps.find((s) => s.id === stepId);
      if (!step || status(step) !== 'open') return;
      const d = step.decisions.find((x) => x.id === decisionId);
      if (!d || !isDecisionActive(d, resolutions[stepId])) return;
      let choiceId = choiceIdOrValue;
      let value = opts.value;
      if (d.kind === 'number') {
        value = choiceIdOrValue;
        const n = Number(String(choiceIdOrValue).replace(/[$,\s]/g, ''));
        choiceId = Number.isFinite(n) && Math.abs(n - (d.expected ?? NaN)) < 0.005 ? d.choices.find((c) => c.correct)!.id : d.choices.find((c) => !c.correct && !c.hidden)!.id;
      }
      record(step, d, choiceId, false, value, opts.extra);
      const cost = choiceOf(step, d.id, choiceId).timeCost;
      if (cost > 0) { time = Math.min(advance(time, cost), deadline); checkDeadlines(); }
    },
    hint(stepId: string) {
      const step = steps.find((s) => s.id === stepId);
      if (!step || hints.includes(stepId) || ended) return;
      hints = [...hints, stepId];
      bus.emit('hint', { stepId, meter: step.hintMeter, simTime: time });
    },
    tick(minutes: number) {
      if (ended) return;
      time = Math.min(advance(time, minutes), deadline);
      checkDeadlines();
    },
    /** Wrap up early: only once nothing is open or still to arrive. Payroll signs off at the deadline as usual. */
    finish() {
      if (ended) return;
      const remaining = steps.some((s) => ['open', 'locked', 'upcoming'].includes(status(s)));
      if (remaining) return;
      const wrapped = time;
      time = deadline;
      end('finished', wrapped);
    },
    snapshot(): Snapshot {
      return { seed, mode, time, start, deadline, deadlines, steps, resolutions: structuredClone(resolutions), log, meters, hints, consequences: queue.all(), ended };
    },
  };
}
export type Game = ReturnType<typeof createGame>;

/** Requests still to handle (open or blocked) and requests still to arrive. */
export function workload(game: Game, snap: Snapshot) {
  const live = snap.steps.filter((s) => game.status(s) !== 'skipped');
  return {
    open: live.filter((s) => game.status(s) === 'open'),
    locked: live.filter((s) => game.status(s) === 'locked'),
    upcoming: live.filter((s) => game.status(s) === 'upcoming'),
  };
}

/** Time card totals for the final check, reflecting the decisions made so far. */
export interface TotalsLine { employeeId: string; name: string; week1: number; week2: number; total: number; approval: ApprovalStateT; notes: string[]; anomaly: boolean }

export function computeTotals(snap: Snapshot, people: PersonT[]): TotalsLine[] {
  const step = snap.steps.find((s) => s.type === 'review');
  if (!step?.review) return [];
  const lines = step.review.rows.map((r) => ({
    employeeId: r.employeeId, name: people.find((x) => x.id === r.employeeId)!.name, week1: r.week1, week2: r.week2, total: 0,
    approval: r.approval, notes: r.note ? [r.note] : [], anomaly: !!r.anomaly,
  }));
  for (const s of snap.steps) {
    const res = snap.resolutions[s.id] ?? {};
    for (const d of s.decisions) {
      const r = res[d.id];
      const adj = r ? d.choices.find((c) => c.id === r.choiceId)?.totalsAdjust : undefined;
      const line = adj && lines.find((l) => l.employeeId === adj.employeeId);
      if (!adj || !line) continue;
      line.week1 += adj.week1 ?? 0;
      line.week2 += adj.week2 ?? 0;
      if (adj.clearsAnomaly) { line.anomaly = false; line.notes = line.notes.filter((n) => n !== step.review!.rows.find((x) => x.employeeId === line.employeeId)?.note); }
      line.notes.push(adj.note);
    }
  }
  for (const l of lines) l.total = l.week1 + l.week2;
  return lines;
}
