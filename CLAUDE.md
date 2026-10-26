# Pay Period: HCM Simulation

Read SPEC.md fully before any work.

Rules:
- TypeScript strict. No `any`.
- All scenario content in /content JSON, validated by Zod (`content/schemas`). Never hardcode content in components.
- Missions are XState machines (`src/machines`). Scoring only via eventBus DecisionEvents (`src/engine/eventBus.ts`).
- All randomness via src/engine/rng.ts (seeded).
- No network calls, analytics, cookies, or backend. Fonts, images, and recorded voices are local in /public.
  Approved exception (October 2026): two opt-in voice features may reach the network, and only after the player chooses them.
  Live conversations (`src/audio/live.ts`) connect to ElevenLabs after a consent screen; the agent is locked to the site's
  origins, capped at 3 minutes and 100 conversations a day, and keeps no audio. Answer out loud (`src/audio/speech.ts`) uses
  the browser's speech recognition, which may use the browser maker's service. The game stays fully playable with both off.
- Every 3D interaction must have a 2D List View equivalent (`src/a11y/ListView.tsx`).
- Never rely on color alone for meaning. Status = icon shape + text.
- Mark unknown policy details [SME] and log in CONTENT_TODO.md.
- Vanderbilt brand: black #1C1C1C, gold #CFAE70, oak #946E24, cream #F5F3EF. Libre Caslon Display headlines with one italic word, Inter body, Antonio for numerals and labels. No em or en dashes in copy.
- No real people's names, real departments, or real Oracle screens. CampusHR (Sim) is fictional.
- Run `npm test` and `npm run test:e2e` before every commit.
- Keep model payload under 8 MB and draw calls under 150. Use instancing for repeated furniture.
- Build in phase order. Do not skip acceptance criteria.

Deviations from SPEC section 4 (deliberate):
- React 19, because @react-three/fiber 9 requires it.
- Plain CSS tokens (`src/styles/tokens.css`) instead of Tailwind.
- `motion` (the current Framer Motion package).
- Procedural low-poly geometry instead of GLB models for Phase 1. No model downloads.
- Debrief PDF uses the browser's print to PDF with a print stylesheet.
- Character voices are ElevenLabs recordings shipped as static MP3s: every spoken line lives in content, then
  `tools/voice-manifest.mjs`, `tools/fetch-voice.mjs`, and `tools/voice-envelopes.mjs` build `content/voice.json`,
  `public/audio`, and `content/voice-envelopes.json`. Captions always show; audio is never required.
