import { describe, expect, it } from 'vitest';
import { matchAny, matchChoice } from '../../src/audio/match';
import { payroll } from '../../src/content';

const ot = payroll.steps.find((s) => s.id === 'timecards')!.decisions.find((d) => d.id === 'nair_ot')!.choices.map((c) => c.text);
// ot[0] pay overtime, ot[1] move 4 hours to week 2, ot[2] change it to 40

describe('speak-back matcher', () => {
  it('reads positions said many ways', () => {
    expect(matchChoice('option two', ot)?.index).toBe(1);
    expect(matchChoice('the second one', ot)?.index).toBe(1);
    expect(matchChoice('Number 3.', ot)?.index).toBe(2);
    expect(matchChoice("I'll go with the first one", ot)?.index).toBe(0);
    expect(matchChoice('one', ot)?.index).toBe(0);
    expect(matchChoice('last', ot)?.index).toBe(2);
    expect(matchChoice('I want to pick three', ot)?.index).toBe(2);
    expect(matchChoice('option to', ot)?.index).toBe(1);
  });
  it('rejects positions that are not on screen or are ambiguous', () => {
    expect(matchChoice('option four', ot)).toBeNull();
    expect(matchChoice('one or two', ot)).toBeNull();
  });
  it('matches an answer said in the player’s own words', () => {
    expect(matchChoice('the four hours must be paid as overtime approved or not', ot)?.index).toBe(0);
    expect(matchChoice('she can move the hours into week two', ot)?.index).toBe(1);
    expect(matchChoice('since overtime was not approved she can change it to forty', ot)?.index).toBe(2);
  });
  it('asks again rather than guessing when nothing fits', () => {
    expect(matchChoice('what is for lunch today', ot)).toBeNull();
    expect(matchChoice('', ot)).toBeNull();
  });
  it('picks the best of the recognizer alternatives', () => {
    const r = matchAny(['auction to', 'option two'], ot);
    expect(r?.match.index).toBe(1);
  });
});
