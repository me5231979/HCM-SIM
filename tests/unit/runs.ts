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
  for (let i = 0; i < 600; i++) {
    const s = g.stepById(stepId)!;
    const st = g.status(s);
    if (st === 'open' || g.snapshot().ended) return st;
    g.tick(5);
  }
  return g.status(g.stepById(stepId)!);
}

export function perfectRun(g: Game) {
  g.decide('calendar', 'deadlines', 'two');
  g.decide('reminder', 'timing', 'now');
  g.decide('reminder', 'audience', 'both');
  waitFor(g, 'timecards');
  g.decide('timecards', 'reyes_punch', 'route');
  g.decide('timecards', 'nair_ot', 'pay');
  g.decide('timecards', 'okafor_pto', 'route');
  waitFor(g, 'retro');
  g.decide('retro', 'effective', 'sep27');
  g.decide('retro', 'rate', '24.50');
  waitFor(g, 'headcount');
  g.decide('headcount', 'triage', 'scope');
  waitFor(g, 'approvals');
  g.decide('approvals', 'remind', 'remind');
  waitFor(g, 'finalcheck');
  g.decide('finalcheck', 'flag', 'caught');
  g.decide('finalcheck', 'fix', 'resubmit');
  waitFor(g, 'escalate');
  g.decide('escalate', 'escalate', 'escalate');
  g.finish();
  return g.snapshot();
}
