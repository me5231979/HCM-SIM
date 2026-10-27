import { describe, expect, it } from 'vitest';
import { liveErrorText, resolveOutcome } from '../../src/audio/live';
import { live } from '../../src/content';

describe('live conversation errors', () => {
  it('names a web address the agent refuses, using the refusal ElevenLabs actually sends', () => {
    expect(liveErrorText('Host hcm-sim.vercel.app is not allowed to connect to this agent')).toMatch(/isn't turned on for this web address/);
    expect(liveErrorText('Client did not provide the origin header')).toMatch(/isn't turned on for this web address/);
  });
  it('tells a blocked microphone apart from a refused address', () => {
    const denied = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    expect(liveErrorText(denied)).toMatch(/microphone is blocked/);
  });
  it('explains limits, and falls back to a plain retry message', () => {
    expect(liveErrorText('Concurrency limit reached')).toMatch(/today's limit/);
    expect(liveErrorText('socket closed')).toMatch(/couldn't connect or continue/);
  });
});

describe('live conversation grading', () => {
  const marcus = live.conversations.find((c) => c.id === 'marcus_start')!;
  // What Marcus reports when the learner holds the gate, turns down unpaid shadowing, and asks for the I-9 early,
  // spread over the whole conversation (agent settings grade every learner message, not just the first).
  const whole = {
    outcome: 'wait', summary: 'You told Marcus that Noor waits for her background check, turned down unpaid shadowing, and asked for her I-9 early.',
    explained_clear_to_start: true, explained_i9: true, turned_down_unpaid: true, gave_date: true, tone: 'neutral',
  };

  it('credits every point the learner made, with no next time notes', () => {
    const r = resolveOutcome(marcus, whole);
    expect(r.choiceId).toBe('wait');
    expect(r.notes.map((n) => n.field)).toEqual(['explained_clear_to_start', 'explained_i9', 'turned_down_unpaid', 'gave_date']);
    expect(r.notes.every((n) => n.good)).toBe(true);
    expect(r.extra).toBeUndefined();
  });

  it("says nothing about a pushback that never came up, and coaches a point that was missed", () => {
    const r = resolveOutcome(marcus, { ...whole, turned_down_unpaid: false, explained_i9: false });
    expect(r.notes.some((n) => n.field === 'turned_down_unpaid')).toBe(false);
    expect(r.notes.find((n) => n.field === 'explained_i9')).toMatchObject({ good: false });
  });
});
