import { describe, expect, it } from 'vitest';
import { advance, at, clockLabel, dateLabel, urgency, workMinutesBetween } from '../../src/engine/clock';
import { applyDeltas, grade, initialMeters, rating } from '../../src/engine/scoring';
import { createConsequenceQueue } from '../../src/engine/consequences';
import { createRng } from '../../src/engine/rng';

describe('clock on the real calendar', () => {
  const thu8 = at({ date: '2026-10-22', at: '08:00' });
  const txCutoff = at({ date: '2026-10-23', at: '17:00' });
  const cardsDue = at({ date: '2026-10-26', at: '12:00' });
  it('labels real dates', () => {
    expect(dateLabel(thu8)).toBe('Thu Oct 22');
    expect(dateLabel(cardsDue)).toBe('Mon Oct 26');
    expect(clockLabel(cardsDue)).toBe('12:00 PM');
  });
  it('skips nights and the weekend when advancing', () => {
    const t = advance(at({ date: '2026-10-23', at: '17:30' }), 60);
    expect(dateLabel(t)).toBe('Mon Oct 26');
    expect(clockLabel(t)).toBe('8:30 AM');
    expect(advance(at({ date: '2026-10-22', at: '17:30' }), 60)).toBe(at({ date: '2026-10-23', at: '08:30' }));
  });
  it('never stops on a Friday evening: ending exactly at 18:00 rolls to Monday 8:00', () => {
    const t = advance(at({ date: '2026-10-23', at: '17:00' }), 60);
    expect(t).toBe(at({ date: '2026-10-26', at: '08:00' }));
    expect(workMinutesBetween(t, at({ date: '2026-10-26', at: '08:00' }))).toBe(0);
  });
  it('counts only work minutes: Thursday, Friday, and Monday morning', () => {
    expect(workMinutesBetween(thu8, cardsDue)).toBe((10 + 10 + 4) * 60);
    expect(workMinutesBetween(thu8, txCutoff)).toBe((10 + 9) * 60);
  });
  it('urgency: warning inside the last workday, critical inside 4 work hours', () => {
    expect(urgency(thu8, txCutoff)).toBe('normal');
    expect(urgency(at({ date: '2026-10-23', at: '08:00' }), txCutoff)).toBe('warning');
    expect(urgency(at({ date: '2026-10-23', at: '13:30' }), txCutoff)).toBe('critical');
    expect(urgency(at({ date: '2026-10-26', at: '08:00' }), cardsDue)).toBe('critical');
    expect(urgency(cardsDue, cardsDue)).toBe('closed');
  });
});

describe('scoring', () => {
  it('clamps meters to 0..100', () => {
    expect(applyDeltas(initialMeters(), { accuracy: 30, complianceRisk: -5 })).toMatchObject({ accuracy: 100, complianceRisk: 0 });
  });
  it('grades compliance risk with lower as better', () => {
    expect(grade('complianceRisk', 5)).toBe('A');
    expect(grade('complianceRisk', 40)).toBe('D');
    expect(grade('accuracy', 95)).toBe('A');
  });
  it('a week that changed nothing earns no credit: trust and managers start at a C', () => {
    const m = initialMeters();
    expect(grade('employeeTrust', m.employeeTrust)).toBe('C');
    expect(grade('managerSatisfaction', m.managerSatisfaction)).toBe('C');
    expect(grade('employeeTrust', 86)).toBe('A');
  });
  it('rates readiness from mastery by area, with risk as a gate', () => {
    const m = { accuracy: 100, complianceRisk: 0, employeeTrust: 80, managerSatisfaction: 80 };
    expect(rating([{ right: 5, total: 5 }, { right: 4, total: 5 }], m)).toBe('Ready');
    expect(rating([{ right: 5, total: 5 }, { right: 3, total: 5 }], m)).toBe('Almost ready');
    expect(rating([{ right: 5, total: 5 }, { right: 2, total: 5 }], m)).toBe('Keep practicing');
    expect(rating([{ right: 5, total: 5 }], { ...m, complianceRisk: 30 })).toBe('Almost ready');
  });
});

describe('consequences and rng', () => {
  it('schedules, filters, and cancels', () => {
    const q = createConsequenceQueue();
    q.schedule({ at: 'payday', speaker: 'x', tone: 'negative', line: 'l', summary: 's', deltas: {}, causedBy: 'a.b', stepId: 'a', decisionId: 'b', choiceId: 'c' });
    expect(q.due('payday')).toHaveLength(1);
    q.cancelFor('a', 'b');
    expect(q.all()).toHaveLength(0);
  });
  it('is repeatable for the same seed', () => {
    const a = createRng('oak-123'); const b = createRng('oak-123');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
