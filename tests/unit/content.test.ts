import { describe, expect, it } from 'vitest';
import { crossCheck, events, payroll, people, policies } from '../../src/content';

describe('content', () => {
  it('every JSON file parses against its Zod schema', () => {
    expect(payroll.steps.length).toBeGreaterThan(5);
    expect(people.length).toBeGreaterThan(5);
    expect(policies.length).toBeGreaterThan(5);
    expect(events.length).toBe(12);
  });
  it('every cross reference points at something real', () => {
    expect(crossCheck()).toEqual([]);
  });
  it('every [SME] policy is logged in CONTENT_TODO.md', async () => {
    const fs = await import('node:fs');
    const todo = fs.readFileSync('CONTENT_TODO.md', 'utf8');
    policies.filter((p) => p.sme).forEach((p) => expect(todo).toContain(p.id));
  });
});
