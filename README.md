# Pay Period

An HCM simulation for HCM Academy. Real deadlines from the 2026 payroll calendar, eight requests, and a pay day where every decision shows up on someone's check.

- `npm run dev`: play locally
- `npm test`: unit tests (content schemas, clock, scoring, consequences, perfect and worst runs, mission machine)
- `npm run test:e2e`: Playwright runs (3D perfect run, worst run, List view by keyboard, axe-core, voices, the
  live conversation against a stand-in socket, and Answer out loud with a stand-in recognizer)

Live: https://me5231979.github.io/HCM-SIM/ (every push to main runs the tests, then publishes to the gh-pages branch).

Read SPEC.md and CLAUDE.md before contributing. Open policy questions are in CONTENT_TODO.md.

## Voices and live conversations

Every character has an ElevenLabs voice. Captions always show, and the Voices button or Settings turns audio off.

- **Recorded lines.** Spoken text lives in content (briefing, request `opener`, decision `spoken`, hints, pay day
  `consequences`, `payday` coach lines, people's `greeting`, the practice `intro`). After changing any of them:
  1. `node tools/voice-manifest.mjs` rebuilds `content/voice.json` (the cast and every line).
  2. Record the changed lines with the cast voice (eleven_v4), save the run status JSON, then
     `node tools/fetch-voice.mjs <status.json>` saves them to `public/audio/<line id>.mp3` (64 kbps mono).
  3. `node tools/voice-envelopes.mjs` rebuilds the loudness envelopes that animate whoever is talking.
  `npm test` fails if a caption has no recording or a recording no longer matches its caption.
- **Live conversation (opt in).** In the weekly time card check, the player can talk Priya's overtime through with
  Dana Ortiz, a live ElevenLabs agent (`content/live.json`, agent `agent_1901m5wnrbg4f9195cbqxtdfkst4`). A consent
  screen comes first; typing works instead of talking. The agent's `record_outcome` tool reports what was settled,
  and the player confirms before it counts. Agent settings: allowed origins `https://me5231979.github.io` and
  `http://localhost:4173` / `5173`, origin header required, 3 minute cap, 5 at once, 100 a day, no bursting,
  audio not recorded, transcripts deleted after 30 days. Change these in the ElevenLabs agent settings.
- **Answer out loud (opt in).** Settings turns on a mic button for multiple-choice answers. The browser's speech
  recognition turns speech into text; `src/audio/match.ts` matches it to an option on the device. A match only
  selects the option; Decide still confirms.

A Futures Learning Hub simulation. The department, people, and CampusHR (Sim) are fictional.
