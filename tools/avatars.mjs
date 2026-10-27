// Turns portrait downloads into small avatars, public/avatars/<person id>.webp (256 px square), and records each
// as that person's photo in content/employees.json. Needs ImageMagick. The game shows initials for anyone without one.
// Usage: node tools/avatars.mjs <folder of <person id>.png, .jpg, or .webp>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node tools/avatars.mjs <folder>'); process.exit(1); }
const peoplePath = 'content/employees.json';
let raw = readFileSync(peoplePath, 'utf8');
const ids = new Set(JSON.parse(raw).people.map((p) => p.id));
mkdirSync('public/avatars', { recursive: true });

let made = 0;
for (const f of readdirSync(dir).sort()) {
  if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
  const id = basename(f, extname(f));
  if (!ids.has(id)) { console.warn(`skip ${f}: no person ${id}`); continue; }
  const out = `public/avatars/${id}.webp`;
  // Head-and-shoulders portraits: crop in a little so the face fills the circle, then shrink.
  execFileSync('convert', [join(dir, f), '-gravity', 'north', '-crop', '84%x84%+0+4%', '+repage', '-resize', '256x256^', '-gravity', 'center', '-extent', '256x256', '-strip', '-quality', '78', out]);
  // One person per line in employees.json: add or replace "photo" at the end of the line.
  const line = new RegExp(`^(\\s*\\{ "id": "${id}",.*?)(, "photo": "[^"]*")?( \\},?)$`, 'm');
  if (!line.test(raw)) throw new Error(`No line for ${id} in ${peoplePath}`);
  raw = raw.replace(line, (_, head, _old, tail) => `${head}, "photo": "avatars/${id}.webp"${tail}`);
  made++;
  console.log(`${id} -> ${out}`);
}
writeFileSync(peoplePath, raw);
console.log(`Made ${made} avatars`);
