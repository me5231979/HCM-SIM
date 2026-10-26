import { at } from '../../src/engine/clock';
import { createGame, isDecisionActive, workload, type Game } from '../../src/engine/game';
import { events, week } from '../../src/content';

export const newGame = (seed = 'test-seed', mode: 'training' | 'certification' = 'training') =>
  createGame({
    mission: week,
    eventSteps: events.filter((e) => e.status === 'live' && e.step && e.window).map((e) => ({ step: e.step!, from: at(e.window!.from), to: at(e.window!.to) })),
    seed, mode,
  });

/** Advance the clock until a step is open (or the run ends). */
export function waitFor(g: Game, stepId: string) {
  for (let i = 0; i < 2000; i++) {
    const s = g.stepById(stepId)!;
    const st = g.status(s);
    if (st === 'open' || g.snapshot().ended) return st;
    g.tick(5);
  }
  return g.status(g.stepById(stepId)!);
}

/** Answer every open decision. pick chooses the answer; by default the right one. */
export function answerOpen(g: Game, pick: 'correct' | 'wrong' = 'correct') {
  let answered = 0;
  for (let pass = 0; pass < 4; pass++) {
    for (const s of g.snapshot().steps) {
      if (g.status(s) !== 'open') continue;
      for (const d of s.decisions) {
        const res = g.snapshot().resolutions[s.id] ?? {};
        if (!isDecisionActive(d, res) || res[d.id]) continue;
        const right = d.choices.find((c) => c.correct)!;
        const wrong = d.choices.find((c) => !c.correct && !c.hidden) ?? right;
        const c = pick === 'correct' ? right : wrong;
        g.decide(s.id, d.id, d.kind === 'number' ? (pick === 'correct' ? String(d.expected) : '1') : c.id);
        answered++;
      }
    }
  }
  return answered;
}

/** Play the whole week, answering every request as it arrives. */
export function playWeek(g: Game, pick: 'correct' | 'wrong' = 'correct') {
  for (let guard = 0; guard < 4000; guard++) {
    if (g.snapshot().ended) break;
    if (answerOpen(g, pick)) continue;
    const w = workload(g, g.snapshot());
    if (!w.upcoming.length && !w.locked.length && !w.open.length) { g.finish(); break; }
    g.tick(10);
  }
  return g.snapshot();
}

export const perfectRun = (g: Game) => playWeek(g, 'correct');
