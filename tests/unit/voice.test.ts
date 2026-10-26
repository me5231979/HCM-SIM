import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { events, live, payroll, people, tutorial, voice, voiceLine } from '../../src/content';

/** Every caption that should be heard, with who says it. */
function spokenContent(): { speaker: string; text: string }[] {
  const steps = [...payroll.steps, ...events.filter((e) => e.status === 'live' && e.step).map((e) => e.step!)];
  return [
    ...payroll.briefing.map((text) => ({ speaker: 'coach', text })),
    ...steps.flatMap((s) => (s.opener ? [{ speaker: s.opener.speaker, text: s.opener.line }] : [])),
    ...steps.flatMap((s) => s.decisions.flatMap((d) => (d.spoken ? [{ speaker: d.spoken.speaker, text: d.spoken.line }] : []))),
    ...steps.map((s) => ({ speaker: 'coach', text: s.hint })),
    { speaker: 'coach', text: tutorial.practice.hint },
    { speaker: 'coach', text: tutorial.practice.intro },
    ...steps.flatMap((s) => s.decisions.flatMap((d) => d.choices.flatMap((c) => (c.consequences ?? []).map((q) => ({ speaker: q.speaker, text: q.line }))))),
    { speaker: 'coach', text: payroll.payday.clean },
    { speaker: 'coach', text: payroll.payday.problems },
    ...people.flatMap((p) => (p.greeting ? [{ speaker: p.id, text: p.greeting }] : [])),
  ];
}

describe('voice', () => {
  it('every spoken caption has a recorded line with the same speaker and text', () => {
    const missing = spokenContent().filter((c) => !voiceLine(c.speaker, c.text)).map((c) => `${c.speaker}: ${c.text}`);
    expect(missing, 'Run node tools/voice-manifest.mjs, then record the changed lines').toEqual([]);
  });
  it('every line in the manifest is still used by content', () => {
    const used = new Set(spokenContent().map((c) => `${c.speaker}|${c.text}`));
    expect(voice.lines.filter((l) => !used.has(`${l.speaker}|${l.text}`)).map((l) => l.id)).toEqual([]);
  });
  it('every line has its audio file in public/audio', () => {
    expect(voice.lines.filter((l) => !existsSync(`public/audio/${l.id}.mp3`)).map((l) => l.id)).toEqual([]);
  });
  it('lines with digits carry a spoken spelling', () => {
    expect(voice.lines.filter((l) => /\d/.test(l.text) && !l.say).map((l) => l.id)).toEqual([]);
  });
  it('live conversations map outcomes to real choices and stay within 3 minutes', () => {
    for (const c of live.conversations) {
      const step = payroll.steps.find((s) => s.id === c.stepId)!;
      const d = step.decisions.find((x) => x.id === c.decisionId)!;
      expect(Object.values(c.outcomes).every((id) => d.choices.some((x) => x.id === id))).toBe(true);
      expect(c.maxSeconds).toBeLessThanOrEqual(180);
    }
  });
});
