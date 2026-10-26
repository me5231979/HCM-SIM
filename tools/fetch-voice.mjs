// Downloads generated voice takes into public/audio as <line id>.mp3, transcoded to 64 kbps mono.
// Input: a saved ElevenLabs flow run status (JSON with media[] of { prompt, url }).
// Each take is matched to its line by the exact text that was spoken (say, or text when there is no say).
// The first take for a line wins; later takes and lines already on disk are skipped unless --force.
// Usage: node tools/fetch-voice.mjs <status.json> [--force]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [statusPath, flag] = process.argv.slice(2);
if (!statusPath) { console.error('Usage: node tools/fetch-voice.mjs <status.json> [--force]'); process.exit(1); }
const force = flag === '--force';

const voice = JSON.parse(readFileSync('content/voice.json', 'utf8'));
const byText = new Map(voice.lines.map((l) => [(l.say ?? l.text).trim(), l.id]));
const status = JSON.parse(readFileSync(statusPath, 'utf8'));
const outDir = 'public/audio';
mkdirSync(outDir, { recursive: true });

const done = new Set();
let fetched = 0;
for (const m of status.media ?? []) {
  const id = byText.get(String(m.prompt ?? '').trim());
  if (!id) { console.warn(`No line matches take: ${String(m.prompt).slice(0, 60)}`); continue; }
  if (done.has(id)) continue;
  done.add(id);
  const out = join(outDir, `${id}.mp3`);
  if (existsSync(out) && !force) continue;
  const res = await fetch(m.url);
  if (!res.ok) { console.error(`${id}: HTTP ${res.status}`); continue; }
  const raw = join(tmpdir(), `${id}.src.mp3`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-ac', '1', '-ar', '44100', '-b:a', '64k', out]);
  rmSync(raw);
  fetched++;
  console.log(`${id} -> ${out}`);
}
const missing = voice.lines.filter((l) => !existsSync(join(outDir, `${l.id}.mp3`))).map((l) => l.id);
console.log(`Fetched ${fetched}. Missing ${missing.length}${missing.length ? `: ${missing.join(', ')}` : ''}`);
