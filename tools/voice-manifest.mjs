// Builds content/voice.json: the cast (one ElevenLabs voice per character) and every voiced line.
// Every line is copied verbatim from content (briefing, openers, spoken decisions, hints, pay day
// reactions, greetings), so captions always match the game text; tests/unit/voice.test.ts fails if they drift.
// Run: node tools/voice-manifest.mjs   (then regenerate audio for any changed line ids)
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const payroll = read('missions/payroll.json');
const events = read('events.json');
const tutorial = read('tutorial.json');
const employees = read('employees.json');

const cast = {
  coach: { voiceId: 'YyRJWuwyhKdMZRRnm464', voiceName: 'Katie - E-Learning & Podcast Host' },
  mgr_ortiz: { voiceId: 'g6xIsTj2HwM6VR4iXFCw', voiceName: 'Jessica Anne Bogart - Conversations' },
  dir_park: { voiceId: 'cVOjvbxC2c4mOyGcx3AH', voiceName: 'Jessica - Engaging, textured, grounded' },
  mgr_bell: { voiceId: 'iP95p4xoKVk53GoZ742B', voiceName: 'Chris - Charming, Down-to-Earth' },
  emp_rivera: { voiceId: 'CwhRBWXzGAHq8TQ4Fs17', voiceName: 'Roger - Laid-Back, Casual, Resonant' },
  emp_reyes: { voiceId: 'bIHbv24MWmeRgasZH58o', voiceName: 'Will - Relaxed Optimist' },
  emp_okafor: { voiceId: 'DLtA8Q1hnOvB5FUKBFY9', voiceName: 'Oliver - Inquisitive, Warm, Calm' },
  emp_nair: { voiceId: 'imS9VaqDG0p1hKsDR12k', voiceName: 'Asal' },
  emp_kowalski: { voiceId: 'PHAPuAHARHKi7JvhoY4v', voiceName: 'Bree - Friendly Girl Next Door' },
  emp_grant: { voiceId: 'cgSgspJ2msm6clMCkdW9', voiceName: 'Jessica - Playful, Bright, Warm' },
};

// How to say lines that contain digits or dates. Every line with a digit must have one.
const say = {
  'brief.0': "Morning. It's Thursday, October twenty-second. We're in pay period twenty-two, October eleventh to October twenty-fourth. These dates come straight from the real 2026 payroll calendar.",
  'brief.1': "Two deadlines run your week. Transactions close at the H C M transaction cutoff this Friday, October twenty-third. Time cards are due Monday, October twenty-sixth, at noon. Then payroll signs off and runs payroll. We don't run payroll; we make sure what they get is right.",
  'brief.3': "Requests land in your inbox through the day. Some are urgent; some are noise. On pay day, Friday, October thirtieth, you'll see what your decisions did.",
  'hint.finalcheck': 'A normal two weeks is about eighty hours. Look for anything far from that.',
  'pay.timecards.reyes_punch.self_fix': "Quick thing. I left at three thirty on the twentieth for a doctor visit, but I was paid for a full day. I don't want that coming back on me.",
  'pay.timecards.reyes_punch.leave': 'My check is missing all of Tuesday the twentieth. I have rent due.',
  'pay.timecards.nair_ot.shift': "My overtime from the event setup isn't here, and week two shows hours I didn't work. Who changed my time card?",
  'pay.timecards.nair_ot.cut': 'I worked forty-four hours that week. Why was I paid for forty?',
  'pay.retro.effective.oct11': "I was told my raise went back to September twenty-seventh. The back pay isn't here.",
  'pay.retro.effective.oct22': 'My raise only shows for the last few days. It was supposed to start September twenty-seventh.',
  'pay.finalcheck.flag.missed': "My check is huge. I think I typed eighty instead of eight on Thursday. I don't want to spend money that isn't mine.",
  'spoken.timecards.nair_ot': 'Priya put down forty-four hours in week one, and I never approved overtime. Can I just change her time to forty?',
};

const lines = [];
const add = (id, speaker, text) => lines.push({ id, speaker, text, ...(say[id] ? { say: say[id] } : {}) });

payroll.briefing.forEach((t, i) => add(`brief.${i}`, 'coach', t));

const steps = [...payroll.steps, ...events.events.filter((e) => e.status === 'live' && e.step).map((e) => e.step)];
// What each requester says when you first open their request.
for (const s of steps) if (s.opener) add(`open.${s.id}`, s.opener.speaker, s.opener.line);
// What a character says when a decision comes up.
for (const s of steps) for (const d of s.decisions) if (d.spoken) add(`spoken.${s.id}.${d.id}`, d.spoken.speaker, d.spoken.line);

for (const s of steps) add(`hint.${s.id}`, 'coach', s.hint);
add('hint.practice', 'coach', tutorial.practice.hint);
add('practice.context', 'coach', tutorial.practice.intro);

for (const s of steps) for (const d of s.decisions) for (const c of d.choices) {
  (c.consequences ?? []).forEach((q, i) => add(`pay.${s.id}.${d.id}.${c.id}${i ? `.${i}` : ''}`, q.speaker, q.line));
}
add('pay.coach.clean', 'coach', payroll.payday.clean);
add('pay.coach.problems', 'coach', payroll.payday.problems);

for (const p of employees.people) if (p.greeting) add(`greet.${p.id}`, p.id, p.greeting);

for (const l of lines) {
  if (!cast[l.speaker]) throw new Error(`No voice for ${l.speaker} (${l.id})`);
  if (/\d/.test(l.text) && !l.say) throw new Error(`Line ${l.id} has digits but no "say" spelling`);
  if (/[–—]/.test(l.text + (l.say ?? ''))) throw new Error(`Line ${l.id} contains an em or en dash`);
}
const ids = new Set(lines.map((l) => l.id));
if (ids.size !== lines.length) throw new Error('Duplicate line ids');
for (const k of Object.keys(say)) if (!ids.has(k)) throw new Error(`say entry for unknown line ${k}`);

writeFileSync(new URL('../content/voice.json', import.meta.url), JSON.stringify({ cast, lines }, null, 2) + '\n');
const chars = lines.reduce((n, l) => n + (l.say ?? l.text).length, 0);
console.log(`${lines.length} lines, ${chars} characters`);
for (const l of lines) console.log(`${l.id}\t${l.speaker}\t${(l.say ?? l.text).length}`);
