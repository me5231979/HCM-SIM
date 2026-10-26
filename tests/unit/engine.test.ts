import { describe, expect, it } from 'vitest';
import { advance, at, clockLabel, urgency, workMinutesBetween } from '../../src/engine/clock';
import { applyDeltas, grade, initialMeters, rating } from '../../src/engine/scoring';
import { createConsequenceQueue } from '../../src/engine/consequences';
import { createRng } from '../../src/engine/rng';

describe('clock', () => {
  const thu8 = at({ day: 9, at: '08:00' });
  const cutoff = at({ day: 10, at: '17:00' });
  it('skips nights when advancing', () => {
    expect(clockLabel(advance(at({ day: 9, at: '17:30' }), 60))).toBe('8:30 AM');
    expect(advance(at({ day: 9, at: '17:30' }), 60)).toBe(at({ day: 10, at: '08:30' }));
  });
  it('counts only work minutes to cutoff', () => {
    expect(workMinutesBetween(thu8, cutoff)).toBe(19 * 60);
  });
  it('urgency: warning inside 24 clock hours, critical inside 4 work hours', () => {
    expect(urgency(thu8, cutoff)).toBe('normal');
    expect(urgency(at({ day: 9, at: '17:30' }), cutoff)).toBe('warning');
    expect(urgency(at({ day: 10, at: '13:30' }), cutoff)).toBe('critical');
    expect(urgency(cutoff, cutoff)).toBe('closed');
  });
});

describe('scoring', () => {
  it('clamps meters to 0..100', () => {
    expect(applyDeltas(initialMeters(), { payrollAccuracy: 30, complianceRisk: -5 })).toMatchObject({ payrollAccuracy: 100, complianceRisk: 0 });
  });
  it('grades compliance risk with lower as better', () => {
    expect(grade('complianceRisk', 5)).toBe('A');
    expect(grade('complianceRisk', 40)).toBe('D');
    expect(grade('payrollAccuracy', 95)).toBe('A');
  });
  it('rates a perfect meter set Ready', () => {
    expect(rating({ payrollAccuracy: 100, complianceRisk: 0, employeeTrust: 80, managerSatisfaction: 80 })).toBe('Ready');
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
