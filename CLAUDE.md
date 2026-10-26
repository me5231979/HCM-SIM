# Pay Period: HCM Simulation

Read SPEC.md fully before any work.

Rules:
- TypeScript strict. No `any`.
- All scenario content in /content JSON, validated by Zod (`content/schemas`). Never hardcode content in components.
- Missions are XState machines (`src/machines`). Scoring only via eventBus DecisionEvents (`src/engine/eventBus.ts`).
- All randomness via src/engine/rng.ts (seeded).
- No network calls, analytics, cookies, or backend. Fonts and images are local in /public.
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
