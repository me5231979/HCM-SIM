import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { computePreview } from '../../src/engine/game';
import { grade, METERS, rating } from '../../src/engine/scoring';
import { people } from '../../src/content';
import { payrollMachine } from '../../src/machines/payrollMachine';
import { newGame, perfectRun, waitFor } from './runs';

describe('payroll mission', () => {
  it('perfect run: every decision correct, all meters in the A range, no negative consequences', () => {
    const snap = perfectRun(newGame());
    expect(snap.ended?.reason).toBe('approved');
    expect(snap.log.every((e) => e.correct)).toBe(true);
    METERS.forEach((m) => expect(grade(m.key, snap.meters[m.key])).toBe('A'));
    expect(rating(snap.meters)).toBe('Ready');
    expect(snap.consequences.filter((c) => c.tone === 'negative')).toHaveLength(0);
  });

  it('perfect run preview: Lena corrected, Priya paid OT, Jordan retro', () => {
    const g = newGame();
    const snap = perfectRun(g);
    const lines = computePreview(snap, people);
    const lena = lines.find((l) => l.employeeId === 'emp_kowalski')!;
    expect(lena.regHours).toBe(80);
    expect(lena.anomaly).toBe(false);
    expect(lines.find((l) => l.employeeId === 'emp_nair')!.otHours).toBe(4);
    const jordan = lines.find((l) => l.employeeId === 'emp_reyes')!;
    expect(jordan.rate).toBe(24.5);
    expect(jordan.retro).toBe(120);
  });

  it('worst run: doing nothing lets cutoff pass and every deadline produces its consequence', () => {
    const g = newGame('worst', 'certification');
    g.tick(60 * 24);
    const snap = g.snapshot();
    expect(snap.ended?.reason).toBe('cutoff');
    expect(snap.log.every((e) => e.missed)).toBe(true);
    const codes = new Set(snap.log.map((e) => e.errorCode));
    for (const c of ['PAY_MISSED_CUTOFF', 'PAY_MISSED_ANOMALY', 'PAY_LATE_APPROVAL', 'PAY_REMINDER_LATE', 'PAY_RETRO_WRONG_DATE']) expect(codes).toContain(c);
    expect(snap.consequences.length).toBeGreaterThan(4);
    // Every consequence traces back to a logged decision.
    snap.consequences.forEach((c) => expect(snap.log.some((e) => e.id === c.causedBy)).toBe(true));
    expect(rating(snap.meters)).toBe('Keep practicing');
  });

  it('wrong choices schedule their pay day consequences and error codes', () => {
    const g = newGame();
    waitFor(g, 'timecards');
    g.decide('timecards', 'reyes_punch', 'self_fix');
    g.decide('timecards', 'nair_ot', 'shift');
    const snap = g.snapshot();
    expect(snap.log.map((e) => e.errorCode)).toEqual(['PAY_UNDOC_EDIT', 'PAY_OT_DENIED']);
    expect(snap.consequences.map((c) => c.speaker)).toEqual(['emp_reyes', 'emp_nair']);
    expect(snap.meters.complianceRisk).toBe(32);
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

  it('time costs move the clock: the full headcount report burns two hours', () => {
    const g = newGame();
    waitFor(g, 'headcount');
    const t0 = g.snapshot().time;
    g.decide('headcount', 'triage', 'full');
    expect(g.snapshot().time - t0).toBe(120);
  });

  it('same seed spawns the event at the same time', () => {
    const t = (seed: string) => newGame(seed).stepById('headcount')!.receivedAt;
    expect(t('cohort-a')).toBe(t('cohort-a'));
  });

  it('hints cost two points on the step meter', () => {
    const g = newGame();
    g.hint('calendar');
    g.hint('calendar');
    expect(g.snapshot().meters.payrollAccuracy).toBe(98);
  });
});

describe('payroll machine', () => {
  it('walks title > briefing > playing > payday > debrief', () => {
    const a = createActor(payrollMachine).start();
    a.send({ type: 'START' });
    a.send({ type: 'BEGIN' });
    a.send({ type: 'END', reason: 'approved', beats: 2 });
    expect(a.getSnapshot().value).toBe('payday');
    a.send({ type: 'NEXT_BEAT' });
    expect(a.getSnapshot().context.beat).toBe(1);
    a.send({ type: 'NEXT_BEAT' });
    expect(a.getSnapshot().value).toBe('debrief');
    a.send({ type: 'RESTART' });
    expect(a.getSnapshot().value).toBe('title');
  });
  it('ignores END outside of play', () => {
    const a = createActor(payrollMachine).start();
    a.send({ type: 'END', reason: 'cutoff', beats: 1 });
    expect(a.getSnapshot().value).toBe('title');
  });
});
