// Builds content/voice.json: the cast (one ElevenLabs voice per character) and every voiced line.
// Every line is copied verbatim from content (briefing, openers, spoken decisions, hints, pay day
// reactions, greetings), so captions always match the game text; tests/unit/voice.test.ts fails if they drift.
// Run: node tools/voice-manifest.mjs   (then record the lines it lists with --list; changed lines lose their old audio)
import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { speakable } from './speakable.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const payroll = read('week.json');
// The current manifest: a line whose speaker and text are unchanged keeps its recording (and how it was said).
const previous = existsSync(new URL('../content/voice.json', import.meta.url)) ? read('voice.json').lines : [];
const recorded = new Map(previous.map((l) => [`${l.speaker}|${l.text}`, l]));
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
  emp_brennan: { voiceId: 'mBcvUzCDfAZ1sGXGWSep', voiceName: 'Ryan - Calm & Distinct' },
  emp_chen: { voiceId: 'puJYvK3avsWRTxWzoVJJ', voiceName: 'Billie Voice' },
  new_haddad: { voiceId: 'etmIPb5HGDEg61TyHOPX', voiceName: 'Julia-Casual & Friendly' },
  stu_brooks: { voiceId: '9CJWFnjd4IwAq3ZNBcdc', voiceName: 'Toya J' },
  stu_patel: { voiceId: '9dss9PXMvjrPM8yVW0tW', voiceName: 'Vick - Casual' },
  ec_menon: { voiceId: 'cjVigY5qzO86Huf0OWal', voiceName: 'Eric - Smooth, Trustworthy' },
  pay_liu: { voiceId: 'kfGEdprt9Oe4pbdP8VTo', voiceName: 'Katie - IVR & Customer Service' },
  leave_ruiz: { voiceId: 'PtAEeZ6bHB6UxPL8CyWP', voiceName: 'Sandra - Warm & Soothing' },
  rec_nguyen: { voiceId: 'Iw7E78ChW7UcKWq9OUqG', voiceName: 'Josh - Conversational & Friendly' },
  fin_weiss: { voiceId: 'MCi1Bk7M6CBxQ8rrMHDy', voiceName: 'Dr. Deb' },
  caller: { voiceId: 't3QWIMpbzg4RdPJvfexr', voiceName: 'Ordinary Sun V2 - Friendly Energy' },
};

// How to say a line when the automatic spelling (tools/speakable.mjs) would get it wrong.
const say = {
  'pay.transfer_costing.date.nov6': 'Sam\'s costing ends November sixth, so his whole last period will charge program triple zero instead of the front office code.',
  'pay.position_new.hours.std30': 'The Events Coordinator position shows one point oh F T E. I budgeted point seven five for it, so my numbers don\'t match.',
  'open.q_ferdc': 'I got a form for an F E R D C appointment starting in January. Can you set it up like Doctor Osei\'s record?',
  'hint.q_ferdc': 'Do you know yet what an F E R D C appointment is and how it\'s set up? Who would?',
  'pay.hours.standard.set30': 'Aisha still shows as one point oh F T E on my budget report. Isn\'t she on thirty hours now?',
};

const lines = [];
const hasAudio = (id) => existsSync(new URL(`../public/audio/${id}.mp3`, import.meta.url));
const add = (id, speaker, text) => {
  // A recorded line keeps the spelling it was recorded with; anything else gets the current spelling.
  const before = recorded.get(`${speaker}|${text}`);
  const auto = speakable(text);
  const spoken = say[id] ?? (before && hasAudio(before.id) ? before.say : auto !== text ? auto : undefined);
  lines.push({ id, speaker, text, ...(spoken ? { say: spoken } : {}) });
};

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
  if (/\d/.test(l.text) && !l.say) throw new Error(`Line ${l.id} has digits but no "say" spelling`);
  if (/[–—]/.test(l.text + (l.say ?? ''))) throw new Error(`Line ${l.id} contains an em or en dash`);
}
const ids = new Set(lines.map((l) => l.id));
if (ids.size !== lines.length) throw new Error('Duplicate line ids');
for (const k of Object.keys(say)) if (!ids.has(k)) throw new Error(`say entry for unknown line ${k}`);
const missingCast = [...new Set(lines.filter((l) => !cast[l.speaker]).map((l) => l.speaker))];
if (missingCast.length) throw new Error(`No voice for ${missingCast.join(', ')}`);

// A line whose words changed under the same id has a stale recording: remove it, so it shows up to record.
const previousById = new Map(previous.map((l) => [l.id, l]));
for (const l of lines) {
  const was = previousById.get(l.id);
  const file = new URL(`../public/audio/${l.id}.mp3`, import.meta.url);
  if (was && (was.speaker !== l.speaker || was.text !== l.text) && existsSync(file)) { unlinkSync(file); console.log(`stale ${l.id}: removed its recording`); }
}

// A line that moved to a new id keeps its recording.
for (const l of lines) {
  const before = recorded.get(`${l.speaker}|${l.text}`);
  const to = new URL(`../public/audio/${l.id}.mp3`, import.meta.url);
  const from = before && new URL(`../public/audio/${before.id}.mp3`, import.meta.url);
  if (before && before.id !== l.id && !existsSync(to) && existsSync(from)) { copyFileSync(from, to); console.log(`reused ${before.id} as ${l.id}`); }
}

writeFileSync(new URL('../content/voice.json', import.meta.url), JSON.stringify({ cast, lines }, null, 2) + '\n');
const chars = lines.reduce((n, l) => n + (l.say ?? l.text).length, 0);
const todo = lines.filter((l) => !existsSync(new URL(`../public/audio/${l.id}.mp3`, import.meta.url)));
console.log(`${lines.length} lines, ${chars} characters; ${todo.length} to record (${todo.reduce((n, l) => n + (l.say ?? l.text).length, 0)} characters)`);
if (process.argv.includes('--list')) for (const l of todo) console.log(`${l.id}\t${l.speaker}\t${(l.say ?? l.text).length}`);
