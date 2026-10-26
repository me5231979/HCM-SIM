import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { at, dateLabel } from '../../src/engine/clock';
import { areaScores, computeTotals, onTime, workload } from '../../src/engine/game';
import { rating } from '../../src/engine/scoring';
import { areas, calendarFor, calendars, payday, people, week } from '../../src/content';
import { weekMachine } from '../../src/machines/weekMachine';
import { newGame, perfectRun, playWeek, waitFor } from './runs';

const ORDER = areas.map((a) => a.id);

describe('the week', () => {
  it('runs Mon Oct 19 to Mon Oct 26 at noon, on the real 2026 biweekly row', () => {
    const snap = newGame().snapshot();
    expect(dateLabel(snap.start)).toBe('Mon Oct 19');
    expect(snap.deadline).toBe(at({ date: '2026-10-26', at: '12:00' }));
    expect(snap.deadlines.filter((d) => d.hud).map((d) => `${d.label} ${dateLabel(d.time)}`)).toEqual(['HCM transaction cutoff Fri Oct 23', 'Time cards due Mon Oct 26']);
    expect(calendarFor('biweekly')).toMatchObject({ period: 'Pay period 22', begin: '2026-10-11', end: '2026-10-24', paycheck: '2026-10-30' });
  });

  it('has three payroll calendars, and the monthly cutoff has passed when the week starts', () => {
    expect(calendars.map((c) => c.id).sort()).toEqual(['biweekly', 'monthly', 'weekly']);
    expect(calendarFor('monthly').hcmCutoffAt).toBeLessThan(newGame().snapshot().start);
    // Exempt staff are monthly; non-exempt staff are weekly or biweekly.
    for (const p of people.filter((x) => x.payFrequency)) {
      if (p.type === 'exempt') expect(p.payFrequency).toBe('monthly');
      else expect(['weekly', 'biweekly']).toContain(p.payFrequency);
    }
  });

  it('has no approve-payroll or payroll-preview step: HCMs do neither', () => {
    const snap = newGame().snapshot();
    expect(snap.steps.map((s) => s.type)).not.toContain('approve');
    expect(snap.steps.map((s) => s.title.toLowerCase()).join(' ')).not.toMatch(/approve payroll|payroll preview/);
  });

  it('perfect run: every decision right, every request on time, every area mastered, Ready', () => {
    const g = newGame();
    const snap = perfectRun(g);
    expect(snap.ended?.reason).toBe('finished');
    expect(snap.log.every((e) => e.correct)).toBe(true);
    expect(onTime(g, snap)).toMatchObject({ done: snap.steps.filter((s) => g.status(s) !== 'skipped').length });
    g.settle(payday);
    const scores = areaScores(g.snapshot(), ORDER);
    scores.filter((s) => s.total).forEach((s) => expect(s.right).toBe(s.total));
    expect(rating(scores, g.snapshot().meters)).toBe('Ready');
    expect(snap.consequences.filter((c) => c.tone === 'negative')).toHaveLength(0);
  });

  it('perfect run totals: Lena corrected, Priya keeps her overtime, Jordan and Aisha complete', () => {
    const lines = computeTotals(perfectRun(newGame()), people);
    const by = (id: string) => lines.find((l) => l.employeeId === id)!;
    expect(by('emp_kowalski')).toMatchObject({ total: 80, anomaly: false });
    expect(by('emp_nair')).toMatchObject({ week1: 44, total: 84 });
    expect(by('emp_reyes').week2).toBe(38.5);
    expect(by('emp_grant').total).toBe(80);
  });

  it('worst run: doing nothing lets every deadline pass, and pay day costs count', () => {
    const g = newGame('worst', 'certification');
    g.tick(60 * 60);
    const before = g.snapshot();
    expect(before.ended?.reason).toBe('deadline');
    expect(before.log.every((e) => e.missed)).toBe(true);
    expect(before.consequences.length).toBeGreaterThan(4);
    before.consequences.forEach((c) => expect(before.log.some((e) => e.id === c.causedBy)).toBe(true));
    g.settle(payday);
    const after = g.snapshot();
    // The costs shown on pay day are in the final meters (they were not, before).
    const trustCost = before.consequences.reduce((n, c) => n + (c.deltas.employeeTrust ?? 0), 0);
    expect(trustCost).toBeLessThan(0);
    expect(after.meters.employeeTrust).toBe(Math.max(0, before.meters.employeeTrust + trustCost));
    g.settle(payday);
    expect(g.snapshot().meters).toEqual(after.meters);
    expect(rating(areaScores(after, ORDER), after.meters)).toBe('Keep practicing');
  });

  it('scores each decision under its area', () => {
    const g = newGame();
    g.decide('calendar', 'deadlines', 'two');
    g.decide('calendar', 'exempt', 'oct30');
    const scores = areaScores(g.snapshot(), ORDER);
    // The calendar is a Start Here request, but the exempt pay question is scored under Payroll.
    expect(scores.find((s) => s.area === 'start')).toMatchObject({ right: 1, total: 1 });
    expect(scores.find((s) => s.area === 'payroll')).toMatchObject({ right: 0, total: 1 });
    expect(scores.find((s) => s.area === 'payroll')!.courses).toContain('comp-impacts-payroll');
  });

  it('wrong answers all week rate Keep practicing', () => {
    const g = newGame('wrong');
    const snap = playWeek(g, 'wrong');
    g.settle(payday);
    expect(snap.log.some((e) => !e.correct)).toBe(true);
    expect(rating(areaScores(g.snapshot(), ORDER), g.snapshot().meters)).toBe('Keep practicing');
  });

  it('the backdated raise must be in by the Retro Change Cutoff, Wednesday, not Friday', () => {
    const g = newGame();
    waitFor(g, 'approvals');
    expect(g.status(g.stepById('retro')!)).toBe('missed');
    const miss = g.snapshot().log.find((e) => e.stepId === 'retro')!;
    // Stamped when the Retro Change Cutoff passed, Wednesday at 5:00 PM, not Monday when the clock caught up.
    expect(miss.simTime).toBe(at({ date: '2026-10-21', at: '17:00' }));
    expect(g.snapshot().deadlines.find((d) => d.key === 'retro')?.time).toBe(miss.simTime);
  });

  it('routing to the manager is right; fixing it yourself is not', () => {
    const g = newGame();
    waitFor(g, 'timecards');
    g.decide('timecards', 'reyes_punch', 'ask_employee');
    g.decide('timecards', 'nair_ot', 'shift');
    const snap = g.snapshot();
    expect(snap.log.filter((e) => e.stepId === 'timecards').map((e) => e.correct)).toEqual([false, false]);
    // Marcus finds an edit he never reviewed; Priya finds her overtime moved.
    expect(snap.consequences.filter((c) => c.stepId === 'timecards').map((c) => c.speaker).sort()).toEqual(['emp_nair', 'mgr_bell']);
  });

  it('skipping from Friday afternoon lands on Monday morning, never stuck on Friday evening', () => {
    const g = newGame();
    g.tick(4 * 600 + 9 * 60 - 30); // Mon to Thu full days, then Fri 4:30 PM
    expect(dateLabel(g.snapshot().time)).toBe('Fri Oct 23');
    g.tick(90);
    expect(dateLabel(g.snapshot().time)).toBe('Mon Oct 26');
  });

  it('cannot finish early while requests are open or still to arrive', () => {
    const g = newGame();
    g.finish();
    expect(g.snapshot().ended).toBeUndefined();
  });

  it('caught up only when nothing is open or blocked', () => {
    const g = newGame();
    const w0 = workload(g, g.snapshot());
    expect(w0.open.length).toBeGreaterThan(0);
    for (const s of w0.open) for (const d of s.decisions) g.decide(s.id, d.id, d.choices.find((c) => c.correct)!.id);
    const w = workload(g, g.snapshot());
    expect(w.open).toHaveLength(0);
    expect(w.upcoming.length).toBeGreaterThan(0);
  });

  it('approving for the manager skips the escalation step', () => {
    const g = newGame();
    waitFor(g, 'approvals');
    g.decide('approvals', 'remind', 'approve');
    expect(g.status(g.stepById('escalate')!)).toBe('skipped');
  });

  it('a wrong retro rate is detected from the typed value', () => {
    const g = newGame();
    waitFor(g, 'retro');
    g.decide('retro', 'rate', '24.05');
    expect(g.snapshot().log.find((e) => e.stepId === 'retro' && e.decisionId === 'rate')).toMatchObject({ choiceId: 'wrong', value: '24.05' });
  });

  it('same run code spawns the event at the same time', () => {
    const t = (seed: string) => newGame(seed).stepById('headcount')!.receivedAt;
    expect(t('cohort-a')).toBe(t('cohort-a'));
    expect(dateLabel(t('cohort-a'))).toBe('Fri Oct 23');
  });

  it('hints cost two points on the step meter', () => {
    const g = newGame();
    const meter = g.stepById('calendar')!.hintMeter;
    const start = g.snapshot().meters[meter];
    g.hint('calendar');
    g.hint('calendar');
    expect(Math.abs(g.snapshot().meters[meter] - start)).toBe(2);
  });

  it('every area has requests, and the briefing names the week', () => {
    const snap = newGame().snapshot();
    expect(week.title).toBe('Role of the HCM');
    for (const a of ORDER) expect(snap.steps.some((s) => s.area === a || s.decisions.some((d) => d.area === a))).toBe(true);
  });
});

describe('week machine', () => {
  it('walks title > briefing > tour > playing > payday > debrief', () => {
    const a = createActor(weekMachine).start();
    a.send({ type: 'START' });
    a.send({ type: 'TOUR' });
    expect(a.getSnapshot().value).toBe('tour');
    a.send({ type: 'BEGIN' });
    a.send({ type: 'END', reason: 'finished', beats: 2 });
    expect(a.getSnapshot().value).toBe('payday');
    a.send({ type: 'NEXT_BEAT' });
    expect(a.getSnapshot().context.beat).toBe(1);
    a.send({ type: 'NEXT_BEAT' });
    expect(a.getSnapshot().value).toBe('debrief');
    a.send({ type: 'RESTART' });
    expect(a.getSnapshot().value).toBe('title');
  });
  it('can skip the tour, and ignores END outside of play', () => {
    const a = createActor(weekMachine).start();
    a.send({ type: 'END', reason: 'deadline', beats: 1 });
    expect(a.getSnapshot().value).toBe('title');
    a.send({ type: 'START' });
    a.send({ type: 'BEGIN' });
    expect(a.getSnapshot().value).toBe('playing');
  });
});
