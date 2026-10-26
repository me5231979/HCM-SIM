import { at } from '../../src/engine/clock';
import { createGame, type Game } from '../../src/engine/game';
import { events, payroll } from '../../src/content';

export const newGame = (seed = 'test-seed', mode: 'training' | 'certification' = 'training') =>
  createGame({
    mission: payroll,
    eventSteps: events.filter((e) => e.status === 'live' && e.step && e.window).map((e) => ({ step: e.step!, from: at(e.window!.from), to: at(e.window!.to) })),
    seed, mode,
  });

/** Advance the clock until a step is open (or the run ends). */
export function waitFor(g: Game, stepId: string) {
  for (let i = 0; i < 400; i++) {
    const s = g.stepById(stepId)!;
    const st = g.status(s);
    if (st === 'open' || g.snapshot().ended) return st;
    g.tick(5);
  }
  return g.status(g.stepById(stepId)!);
}

export function perfectRun(g: Game) {
  const best = (stepId: string, decisionId: string) => g.stepById(stepId)!.decisions.find((d) => d.id === decisionId)!.choices.find((c) => c.correct)!.id;
  g.decide('calendar', 'date', best('calendar', 'date'));
  g.decide('reminder', 'timing', 'now');
  g.decide('reminder', 'audience', 'both');
  waitFor(g, 'timecards');
  for (const d of ['reyes_punch', 'nair_ot', 'okafor_pto']) g.decide('timecards', d, best('timecards', d));
  waitFor(g, 'retro');
  g.decide('retro', 'effective', 'sep21');
  g.decide('retro', 'rate', '24.50');
  waitFor(g, 'approvals');
  g.decide('approvals', 'remind', 'remind');
  waitFor(g, 'escalate');
  g.decide('escalate', 'escalate', 'escalate');
  waitFor(g, 'headcount');
  g.decide('headcount', 'triage', 'scope');
  waitFor(g, 'preview');
  g.decide('preview', 'flag', 'caught');
  g.decide('preview', 'fix', 'resubmit');
  waitFor(g, 'approve');
  g.decide('approve', 'final', 'approved');
  return g.snapshot();
}
