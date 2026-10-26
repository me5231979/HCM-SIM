import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { at, dateLabel } from '../../src/engine/clock';
import { computeTotals, workload } from '../../src/engine/game';
import { grade, METERS, rating } from '../../src/engine/scoring';
import { department, people } from '../../src/content';
import { payrollMachine } from '../../src/machines/payrollMachine';
import { newGame, perfectRun, waitFor } from './runs';

describe('payroll mission', () => {
  it('runs on the real 2026 payroll calendar row', () => {
    const snap = newGame().snapshot();
    expect(department.payPeriod).toMatchObject({ number: 22, begin: '2026-10-11', end: '2026-10-24', hcmCutoff: '2026-10-23', paycheck: '2026-10-30' });
    expect(dateLabel(snap.start)).toBe('Thu Oct 22');
    expect(snap.deadlines.map((d) => `${d.label} ${dateLabel(d.time)}`)).toEqual(['HCM transaction cutoff Fri Oct 23', 'Time cards due Mon Oct 26']);
    expect(snap.deadline).toBe(at({ date: '2026-10-26', at: '12:00' }));
  });

  it('has no approve-payroll or payroll-preview step: HCMs do neither', () => {
    const snap = newGame().snapshot();
    expect(snap.steps.map((s) => s.type)).not.toContain('approve');
    expect(snap.steps.map((s) => s.title.toLowerCase()).join(' ')).not.toMatch(/approve payroll|payroll preview/);
  });

  it('perfect run: every decision correct, all meters in the A range, no negative consequences', () => {
    const snap = perfectRun(newGame());
    expect(snap.ended?.reason).toBe('finished');
    expect(snap.log.every((e) => e.correct)).toBe(true);
    METERS.forEach((m) => expect(grade(m.key, snap.meters[m.key])).toBe('A'));
    expect(rating(snap.meters)).toBe('Ready');
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

  it('worst run: doing nothing lets every deadline pass and produces consequences', () => {
    const g = newGame('worst', 'certification');
    g.tick(60 * 30);
    const snap = g.snapshot();
    expect(snap.ended?.reason).toBe('deadline');
    expect(snap.log.every((e) => e.missed)).toBe(true);
    const codes = new Set(snap.log.map((e) => e.errorCode));
    for (const c of ['PAY_MISSED_ANOMALY', 'PAY_LATE_APPROVAL', 'PAY_REMINDER_LATE', 'PAY_TRANSACTION_LATE', 'PAY_OT_DENIED']) expect(codes).toContain(c);
    expect(snap.consequences.length).toBeGreaterThan(4);
    snap.consequences.forEach((c) => expect(snap.log.some((e) => e.id === c.causedBy)).toBe(true));
    expect(rating(snap.meters)).toBe('Keep practicing');
  });

  it('the raise must be in by the HCM transaction cutoff, not Monday', () => {
    const g = newGame();
    waitFor(g, 'approvals');
    expect(g.status(g.stepById('retro')!)).toBe('missed');
    const miss = g.snapshot().log.find((e) => e.stepId === 'retro')!;
    expect(miss.errorCode).toBe('PAY_TRANSACTION_LATE');
    // Stamped when the cutoff passed, Friday at 5:00 PM, not Monday when the clock caught up.
    expect(miss.simTime).toBe(at({ date: '2026-10-23', at: '17:00' }));
  });

  it('routing to the manager is right; fixing it yourself is not', () => {
    const g = newGame();
    waitFor(g, 'timecards');
    g.decide('timecards', 'reyes_punch', 'ask_employee');
    g.decide('timecards', 'nair_ot', 'shift');
    const snap = g.snapshot();
    expect(snap.log.map((e) => e.errorCode)).toEqual(['PAY_BYPASS_MANAGER', 'PAY_OT_DENIED']);
    expect(snap.consequences.map((c) => c.speaker)).toEqual(['emp_nair']);
  });

  it('skipping from Friday afternoon lands on Monday morning, never stuck on Friday evening', () => {
    const g = newGame();
    g.tick(19 * 60 - 30); // Fri 4:30 PM
    expect(dateLabel(g.snapshot().time)).toBe('Fri Oct 23');
    g.tick(90); // to 6:00 PM, the end of the workday
    expect(dateLabel(g.snapshot().time)).toBe('Mon Oct 26');
  });

  it('cannot finish early while requests are open or still to arrive', () => {
    const g = newGame();
    g.finish();
    expect(g.snapshot().ended).toBeUndefined();
  });

  it('caught up only when nothing is open or blocked', () => {
    const g = newGame();
    g.decide('calendar', 'deadlines', 'two');
    g.decide('reminder', 'timing', 'now');
    g.decide('reminder', 'audience', 'both');
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
    expect(g.snapshot().log.find((e) => e.stepId === 'retro')).toMatchObject({ choiceId: 'wrong', errorCode: 'PAY_RETRO_WRONG_RATE', value: '24.05' });
  });

  it('time costs move the clock: the full headcount report burns two hours of cutoff day', () => {
    const g = newGame();
    waitFor(g, 'headcount');
    const t0 = g.snapshot().time;
    g.decide('headcount', 'triage', 'full');
    expect(g.snapshot().time - t0).toBe(120);
  });

  it('same run code spawns the event at the same time', () => {
    const t = (seed: string) => newGame(seed).stepById('headcount')!.receivedAt;
    expect(t('cohort-a')).toBe(t('cohort-a'));
    expect(dateLabel(t('cohort-a'))).toBe('Fri Oct 23');
  });

  it('hints cost two points on the step meter', () => {
    const g = newGame();
    g.hint('calendar');
    g.hint('calendar');
    expect(g.snapshot().meters.payrollAccuracy).toBe(98);
  });
});

describe('payroll machine', () => {
  it('walks title > briefing > tour > playing > payday > debrief', () => {
    const a = createActor(payrollMachine).start();
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
    const a = createActor(payrollMachine).start();
    a.send({ type: 'END', reason: 'deadline', beats: 1 });
    expect(a.getSnapshot().value).toBe('title');
    a.send({ type: 'START' });
    a.send({ type: 'BEGIN' });
    expect(a.getSnapshot().value).toBe('playing');
  });
});
