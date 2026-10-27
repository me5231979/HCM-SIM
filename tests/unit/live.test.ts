import { describe, expect, it } from 'vitest';
import { liveErrorText } from '../../src/audio/live';

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
