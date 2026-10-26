import { describe, expect, it } from 'vitest';
import { allSteps, crossCheck, events, learnerText, week, people, policies, uncovered } from '../../src/content';

/** Every multiple-choice decision in the week, with its visible options. */
const choiceDecisions = () => allSteps().flatMap((s) => s.decisions.filter((d) => d.kind !== 'number').map((d) => ({ s, d, vis: d.choices.filter((c) => !c.hidden) })));

describe('content', () => {
  it('every JSON file parses against its Zod schema', () => {
    expect(week.steps.length).toBeGreaterThan(5);
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
  it('the tutorial has a practice request and legends for symbols and controls', async () => {
    const { tutorial } = await import('../../src/content');
    expect(tutorial.steps.some((s) => s.practice)).toBe(true);
    expect(tutorial.legends.symbols.map((l) => l.key)).toEqual(['talk', 'issue', 'done', 'ring']);
    expect(tutorial.legends.controls.length).toBeGreaterThanOrEqual(7);
  });
  it('practices every HCM Academy course at least once', () => {
    expect(uncovered()).toEqual([]);
  });
  it('never gives the answer away by length: the right option is at most 20% longer, and the longest in under 40% of decisions', () => {
    const list = choiceDecisions();
    const tooLong = list.filter(({ vis }) => {
      const right = vis.find((c) => c.correct)!.text.length;
      return right > Math.max(...vis.filter((c) => !c.correct).map((c) => c.text.length)) * 1.2;
    }).map(({ s, d }) => `${s.id}.${d.id}`);
    expect(tooLong).toEqual([]);
    const longest = list.filter(({ vis }) => vis.find((c) => c.correct)!.text.length >= Math.max(...vis.filter((c) => !c.correct).map((c) => c.text.length)));
    expect(longest.length / list.length).toBeLessThanOrEqual(0.4);
    // Outside forms (dates and amounts), options stay within about 2x of each other.
    const spread = list.filter(({ s, vis }) => s.type !== 'form' && Math.max(...vis.map((c) => c.text.length)) > Math.min(...vis.map((c) => c.text.length)) * 2.2).map(({ s, d }) => `${s.id}.${d.id}`);
    expect(spread).toEqual([]);
  });
  it('feedback teaches: every visible choice ends with a Next time rule', () => {
    const missing = choiceDecisions().flatMap(({ s, d, vis }) => vis.filter((c) => !c.feedback.includes('Next time:')).map((c) => `${s.id}.${d.id}.${c.id}`));
    expect(missing).toEqual([]);
  });
  it('quick questions stay quick: one decision, a short question, and a short setup', () => {
    for (const s of allSteps().filter((x) => x.quick)) {
      expect(s.decisions, s.id).toHaveLength(1);
      expect(s.context.split(/\s+/).length, s.id).toBeLessThanOrEqual(45);
      expect((s.opener?.line ?? '').split(/\s+/).length, s.id).toBeLessThanOrEqual(25);
    }
  });
  it('learners never see [SME] author notes, and the sentence around them stays whole', () => {
    expect(learnerText('Save it in My Folders [SME: which roles HCMs have]. Next time: build less.')).toBe('Save it in My Folders. Next time: build less.');
    expect(learnerText('Entered by the cutoff (5:00 PM [SME]), it is on her record.')).toBe('Entered by the cutoff (5:00 PM), it is on her record.');
    expect(learnerText('Next time: same. [SME] Confirm the backup approver rule.')).toBe('Next time: same.');
    expect(learnerText('It waits for the next cycle [SME]. Next time: act today.')).toBe('It waits for the next cycle. Next time: act today.');
    const shown = allSteps().flatMap((s) => [s.context, s.hint, ...s.decisions.flatMap((d) => d.choices.flatMap((c) => [c.feedback, ...(c.consequences ?? []).flatMap((q) => [q.summary, q.task ?? ''])]))]);
    expect(shown.map(learnerText).filter((t) => /SME/.test(t))).toEqual([]);
    expect(policies.map((p) => learnerText(p.body)).filter((t) => /SME|\(\s*\)|\s[.,]/.test(t))).toEqual([]);
  });
});
