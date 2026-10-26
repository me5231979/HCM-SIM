import type { ChoiceT, DecisionT, DeltasT, EventStepT, MissionT, Meters, PersonT, StepT } from '../../content/schemas';
import { advance, at, type SimTime } from './clock';
import { createConsequenceQueue, type ScheduledConsequence } from './consequences';
import { createEventBus, type DecisionEvent } from './eventBus';
import { createRng } from './rng';
import { applyDeltas, hintDelta, initialMeters } from './scoring';

export type Mode = 'training' | 'certification';
export interface ActiveStep extends Omit<StepT, 'receivedAt' | 'dueAt'> { receivedAt: SimTime; dueAt: SimTime; source: 'mission' | 'event' }
export interface Resolution { choiceId: string; value?: string; at: SimTime; missed: boolean; eventId: string }
export type StepStatus = 'upcoming' | 'locked' | 'open' | 'done' | 'missed' | 'skipped';
export type EndReason = 'approved' | 'cutoff';

export interface Snapshot {
  seed: string;
  mode: Mode;
  time: SimTime;
  cutoff: SimTime;
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
  const cutoff = at(mission.deadlines.cutoff);
  let meters = initialMeters();
  let time = at(mission.start);
  let log: DecisionEvent[] = [];
  let hints: string[] = [];
  let ended: Snapshot['ended'];
  const resolutions: Snapshot['resolutions'] = {};

  const steps: ActiveStep[] = [
    ...mission.steps.map((s) => ({ ...s, receivedAt: at(s.receivedAt), dueAt: at(s.dueAt), source: 'mission' as const })),
    ...eventSteps.map(({ step, from, to }) => {
      // Seeded spawn time inside the event window, on a 10-minute grid.
      const slots = Math.max(1, Math.floor((to - from) / 10) + 1);
      const receivedAt = from + Math.floor(rng() * slots) * 10;
      return { ...step, receivedAt, dueAt: receivedAt + step.dueMinutes, source: 'event' as const };
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

  function record(step: ActiveStep, d: DecisionT, choiceId: string, missed: boolean, value?: string, extra?: DeltasT) {
    if (resolutions[step.id]?.[d.id] || ended) return;
    const c = choiceOf(step, d.id, choiceId);
    const deltas: DeltasT = { ...c.deltas };
    for (const [k, v] of Object.entries(extra ?? {}) as [keyof DeltasT, number][]) deltas[k] = (deltas[k] ?? 0) + v;
    const e: DecisionEvent = {
      id: `${step.id}.${d.id}`, stepId: step.id, decisionId: d.id, choiceId, correct: c.correct && !missed,
      errorCode: c.errorCode, deltas, simTime: time, missed, value,
    };
    resolutions[step.id] = { ...resolutions[step.id], [d.id]: { choiceId, value, at: time, missed, eventId: e.id } };
    log = [...log, e];
    bus.emit('decision', e);
  }

  /** Resolve every open decision on a step with its missed outcome. */
  function missStep(step: ActiveStep) {
    for (const d of step.decisions) {
      if (isDecisionActive(d, resolutions[step.id]) && !resolutions[step.id]?.[d.id]) record(step, d, d.missedChoiceId, true);
    }
  }

  function checkDeadlines() {
    for (const s of steps) {
      if (s.id === 'approve') continue;
      if (s.receivedAt <= time && s.dueAt <= time && !isComplete(s) && !isSkipped(s)) missStep(s);
    }
    if (time >= cutoff && !ended) end('cutoff');
  }

  function end(reason: EndReason) {
    const approveStep = steps.find((s) => s.type === 'approve');
    if (approveStep) {
      const d = approveStep.decisions[0];
      record(approveStep, d, reason === 'approved' ? d.choices.find((c) => c.correct)!.id : d.missedChoiceId, reason === 'cutoff');
    }
    // Anything still open is processed as it stands.
    for (const s of steps) if (s.receivedAt <= time && !isSkipped(s) && !isComplete(s)) missStep(s);
    ended = { reason, at: Math.min(time, cutoff) };
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
      if (step.type === 'approve') { end('approved'); return; }
      if (cost > 0) { time = advance(time, cost); checkDeadlines(); }
    },
    hint(stepId: string) {
      const step = steps.find((s) => s.id === stepId);
      if (!step || hints.includes(stepId) || ended) return;
      hints = [...hints, stepId];
      bus.emit('hint', { stepId, meter: step.hintMeter, simTime: time });
    },
    tick(minutes: number) {
      if (ended) return;
      time = Math.min(advance(time, minutes), cutoff);
      checkDeadlines();
    },
    snapshot(): Snapshot {
      return { seed, mode, time, cutoff, steps, resolutions: structuredClone(resolutions), log, meters, hints, consequences: queue.all(), ended };
    },
  };
}
export type Game = ReturnType<typeof createGame>;

/** Gross pay preview, reflecting the decisions made so far. */
export interface PreviewLine { employeeId: string; name: string; regHours: number; otHours: number; ptoHours: number; rate: number; retro: number; gross: number; notes: string[]; anomaly: boolean }

export function computePreview(snap: Snapshot, people: PersonT[]): PreviewLine[] {
  const step = snap.steps.find((s) => s.type === 'preview');
  if (!step?.preview) return [];
  const lines = step.preview.rows.map((r) => {
    const p = people.find((x) => x.id === r.employeeId)!;
    return { employeeId: r.employeeId, name: p.name, regHours: r.regHours, otHours: r.otHours, ptoHours: r.ptoHours, rate: p.payRate, retro: 0, gross: 0, notes: r.note ? [r.note] : [], anomaly: !!r.anomaly };
  });
  for (const s of snap.steps) {
    const res = snap.resolutions[s.id] ?? {};
    for (const d of s.decisions) {
      const r = res[d.id];
      if (!r) continue;
      const adj = d.choices.find((c) => c.id === r.choiceId)?.previewAdjust;
      if (!adj) continue;
      const line = lines.find((l) => l.employeeId === adj.employeeId);
      if (!line) continue;
      line.regHours += adj.regHours ?? 0;
      line.otHours += adj.otHours ?? 0;
      line.ptoHours += adj.ptoHours ?? 0;
      if (adj.rate !== undefined) {
        const rateDecision = s.decisions.find((x) => x.kind === 'number');
        const typed = rateDecision ? Number(String(res[rateDecision.id]?.value ?? '').replace(/[$,\s]/g, '')) : NaN;
        line.rate = Number.isFinite(typed) && typed > 0 ? typed : adj.rate;
      }
      line.retro += adj.retro ?? 0;
      line.notes.push(adj.note);
      if (adj.clearsAnomaly) line.anomaly = false;
    }
  }
  for (const l of lines) l.gross = Math.round(((l.regHours + l.ptoHours) * l.rate + l.otHours * l.rate * 1.5 + l.retro) * 100) / 100;
  return lines;
}
