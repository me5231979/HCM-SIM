// Builds content/voice-envelopes.json: a loudness envelope for every recorded line, 20 steps a second,
// one digit (0 to 9) per step. The game reads it against the audio's current time to animate whoever
// is speaking, so it needs no Web Audio graph and works wherever the audio element plays.
// Run after tools/fetch-voice.mjs: node tools/voice-envelopes.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const RATE = 20;
const SAMPLE_RATE = 8000;
const WINDOW = SAMPLE_RATE / RATE;

const voice = JSON.parse(readFileSync('content/voice.json', 'utf8'));
const lines = {};
for (const l of voice.lines) {
  const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', `public/audio/${l.id}.mp3`, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const rms = [];
  for (let i = 0; i < samples.length; i += WINDOW) {
    let sum = 0;
    const end = Math.min(samples.length, i + WINDOW);
    for (let j = i; j < end; j++) sum += (samples[j] / 32768) ** 2;
    rms.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  // Normalize per line so quiet and loud voices animate alike; a gentle curve keeps soft syllables visible.
  const peak = Math.max(...rms, 1e-6);
  lines[l.id] = rms.map((r) => Math.min(9, Math.round(9 * (r / peak) ** 0.6))).join('');
}
writeFileSync('content/voice-envelopes.json', JSON.stringify({ rate: RATE, lines }, null, 2) + '\n');
console.log(`${Object.keys(lines).length} envelopes, ${Object.values(lines).reduce((n, s) => n + s.length, 0)} steps`);
