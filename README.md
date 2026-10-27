# Role of the HCM

An HCM simulation for HCM Academy. You are the HCM for a fictional department for one full week, Monday Oct 19
to Friday Oct 23, 2026, with pay day on Oct 30. Hiring, payroll, assignments, leave, costing, student and faculty
work, and records all land in the same inbox, just as they do in the job: 60 requests and 100 decisions that
practice every one of the 79 HCM Academy courses. Three payroll calendars run at once (monthly, biweekly, and
weekly), and on pay day every decision shows up on someone's check. A full run takes about 60 to 90 minutes.

- `npm run dev`: play locally
- `npm test`: unit tests (content schemas and cross references, coverage of every Academy course, the
  anti-guessing rules for answer length, feedback that teaches, the clock, scoring and readiness by area,
  consequences, perfect and worst runs, the week machine, and the voice manifest)
- `npm run test:e2e`: Playwright runs (a perfect week in 3D, the worst week, the guided tour, the request panel,
  phones, List view by keyboard, axe-core, voices, the live conversation against a stand-in socket, and Answer
  out loud with a stand-in recognizer)

Live: https://me5231979.github.io/HCM-SIM/ (every push to main runs the tests, then publishes to the gh-pages branch).

Read SPEC.md and CLAUDE.md before contributing. Open policy questions are in CONTENT_TODO.md, and anything still
waiting on a subject matter expert shows to learners as "Being confirmed".

## How the week works

- `content/week.json` holds the week: the briefing, the deadlines, and every request. Each request belongs to one
  of the eight Academy areas, and each decision lists the Academy courses it practices (`courses`).
- Quick questions (`quick: true`) are one short decision. Requests can wait on another (`requires`), drop out when
  an earlier answer makes them moot (`skipIf`), or reveal a follow-up decision (`showIf`).
- Scoring runs only through eventBus decision events. The debrief rates readiness by area and links each missed
  decision to its Academy course.

## Voices and live conversations

Every character has an ElevenLabs voice. Captions always show, and the Voices button or Settings turns audio off.

- **Recorded lines.** Spoken text lives in content (briefing, request `opener`, decision `spoken`, hints, pay day
  `consequences`, `payday` coach lines, people's `greeting`, the practice `intro`). After changing any of them:
  1. `node tools/voice-manifest.mjs` rebuilds `content/voice.json` (the cast and every line). It writes a spoken
     spelling (`say`) for numbers, dates, times, and acronyms, using `tools/speakable.mjs`.
  2. Record the changed lines with the cast voice (eleven_v4), save the run status JSON, then
     `node tools/fetch-voice.mjs <status.json>` saves them to `public/audio/<line id>.mp3` (64 kbps mono).
  3. `node tools/voice-envelopes.mjs` rebuilds the loudness envelopes that animate whoever is talking.
  `npm test` fails if a caption has no recording or a recording no longer matches its caption.
- **Live conversations (opt in).** Two requests offer a live talk with an ElevenLabs agent (`content/live.json`):
  Dana Ortiz about Priya's overtime in the time card check (agent `agent_1901m5wnrbg4f9195cbqxtdfkst4`), and
  Marcus Bell about whether his new hire can start early (agent `agent_0401m5wwnmhteaesd74gzwsekttc`). A consent
  screen comes first; typing works instead of talking. Each agent's `record_outcome` tool reports what was
  settled, and the player confirms before it counts. Agent settings: allowlist `me5231979.github.io`, `localhost:4173`,
  and `localhost:5173` (each also listed with its scheme), origin header required, 3 minute cap, 5 at once, 100 a
  day, no bursting, audio not recorded, transcripts deleted after 30 days. Change these in the ElevenLabs agent
  settings. Because the origin header is required, `src/audio/live.ts` connects over the WebSocket even for voice:
  WebRTC sessions don't carry the Origin header, and ElevenLabs refuses them.
- **Answer out loud (opt in).** Settings turns on a mic button for multiple-choice answers. The browser's speech
  recognition turns speech into text; `src/audio/match.ts` matches it to an option on the device. A match only
  selects the option; Decide still confirms.

A Futures Learning Hub simulation. The department, people, and CampusHR (Sim) are fictional.
