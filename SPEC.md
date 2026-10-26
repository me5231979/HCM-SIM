# PAY PERIOD: An HCM Simulation Game
## Full Build Specification for Claude Code

Version 0.1 | Owner: Matt Estes, Futures Learning Hub | Program: HCM Academy

---

## 0. How Claude Code should use this document

1. Read this entire file before writing any code.
2. Save it to the repo root as `SPEC.md`. Create `CLAUDE.md` from Section 23.
3. Build in the phase order in Section 20. Do not start a phase until the previous phase's acceptance criteria pass.
4. Never hardcode scenario content in components. All employees, tasks, events, policies, and feedback text live in `/content` JSON and are validated by Zod schemas.
5. Anything marked `[SME]` is a placeholder. Use the placeholder text, flag it in `CONTENT_TODO.md`, and keep building.
6. Any value marked `[VERIFY]` must be confirmed before launch.
7. Commit after each completed task with a clear message. Run tests before every commit.

---

## 1. Product summary

**What it is:** A browser-based 3D simulation where the learner plays a departmental HCM for one simulated pay period. They hire, onboard, run payroll, process changes, manage leave, and offboard employees while a payroll cutoff clock runs and random events hit.

**Who it is for:**
- New HCMs (guided "Training Mode")
- Experienced HCMs (unguided "Certification Mode" capstone for HCM Academy)

**Learning goal:** Build judgment, not memorization. Every mission forces tradeoffs between speed, accuracy, compliance, and relationships. The debrief maps every mistake to an HCM Academy module.

**Design pillars:**
1. Real workflows, fictional department.
2. Consequences ripple. A sloppy hire becomes a payroll problem in week two.
3. Time pressure is real but fair.
4. Every failure teaches. No dead ends, no game overs.
5. No learner data leaves the browser.

**Session length:** 45 minute full run, or single missions in 8 to 12 minutes.

---

## 2. Decisions assumed (change here, nowhere else)

| Decision | Default chosen | Why |
|---|---|---|
| Player | Both: Training Mode + Certification Mode | One build, two audiences |
| HR system screens | Fictional mock system called "CampusHR (Sim)" that mirrors real workflow logic, not real Oracle screens | Avoids licensing and screen drift; teaches the logic |
| Session | Full 45 min run + mission select | Works for workshops and self-paced |
| 3D style | Isometric low-poly diorama, fixed camera with orbit limits | Runs on standard staff laptops, readable, accessible |
| Data | No analytics, no backend. Progress in localStorage. Debrief downloadable as PDF | Matches AXL "collects no data" hosting position |
| LMS | Optional SCORM 1.2 export in Phase 5 | Completion tracking if needed later |

---

## 3. MCPs and tooling

### 3.1 Required MCPs (install in Claude Code before Phase 0)

| MCP | Purpose in this build | Install note |
|---|---|---|
| **GitHub** | Repo, branches, PRs, issues per mission | Use the Vanderbilt org repo if available, personal repo until then |
| **Vercel** | Preview deploys per branch, production deploy | Already connected. Confirm VRA status before production use |
| **Context7** | Live docs for React Three Fiber, drei, Zustand, XState, Vite | Prevents outdated API usage in 3D code |
| **Playwright** | Automated playthrough tests, screenshot checks, accessibility scans | Required for acceptance testing each phase |

### 3.2 Asset generation MCPs (already connected)

| MCP | Use |
|---|---|
| **Higgsfield** (`generate_3d`, `scene_builder_3d_*`) | Generate custom GLB props: Vanderbilt-style desk pods, HR terminal, filing cabinets, ID badge printer. Export GLB, run through gltf-transform |
| **Runway** (`generate_speech`, `generate_sound_effect`, `generate_music`) | Character voice lines, UI sounds, ambient office loop, cutoff-clock tension music |
| **Adobe** (`font_*`, image tools) | Font pairing checks, icon cleanup, debrief PDF styling |

### 3.3 Optional MCPs

| MCP | Use |
|---|---|
| **Figma** | If you want UI panels designed before code |
| **monday.com** | Track build tasks and SME content intake on a board |
| **Box / Google Drive** | Pull SME interview notes and policy docs into `/content/sources` |

### 3.4 Free asset sources (CC0, no MCP needed)

- Kenney.nl furniture and office packs (CC0)
- Poly Pizza low-poly models (check license per model, prefer CC0)
- Quaternius character packs (CC0) for animated staff

### 3.5 Skills to load in Claude Code

- Course Builder skill (Vanderbilt brand standards + adult learning design)
- frontend-design skill for UI polish
- `webapp-testing` or Playwright patterns for tests

---

## 4. Tech stack

| Layer | Choice |
|---|---|
| Build | Vite + TypeScript (strict) |
| UI | React 18 |
| 3D | three.js via @react-three/fiber, @react-three/drei |
| Post-processing | @react-three/postprocessing (light use: SSAO off by default, outline on hover) |
| Game state | Zustand (world state) + XState v5 (mission state machines) |
| Content validation | Zod |
| Styling | Tailwind CSS + CSS variables for brand tokens |
| Animation (2D) | Framer Motion |
| Audio | Howler.js |
| PDF debrief | @react-pdf/renderer |
| Testing | Vitest (logic), Playwright (E2E + axe-core accessibility) |
| Lint/format | ESLint + Prettier |
| Model optimization | @gltf-transform/cli (draco/meshopt compression) |
| Hosting | Vercel static, GitHub Pages fallback |

No backend. No database. No cookies. No third-party analytics.

---

## 5. Repo structure

```
pay-period/
  SPEC.md
  CLAUDE.md
  CONTENT_TODO.md
  /public
    /models        # optimized .glb
    /audio         # .mp3/.ogg
    /textures
  /content
    /schemas       # zod schemas (TS) used to validate JSON
    department.json
    employees.json
    policies.json
    /missions
      payroll.json
      offboard.json
      hire.json
      onboard.json
      changes.json
      leave.json
    events.json
    feedback.json
    academy-map.json   # error code -> HCM Academy module
  /src
    main.tsx
    App.tsx
    /engine
      clock.ts          # sim time, cutoff
      eventBus.ts
      scoring.ts
      consequences.ts   # delayed effects queue
      rng.ts            # seeded RNG for repeatable runs
      save.ts           # localStorage
    /machines           # XState machines, one per mission
    /store              # Zustand slices
    /scene
      Office.tsx
      Camera.tsx
      Lighting.tsx
      Employee.tsx
      Desk.tsx
      Hotspot.tsx
      StatusIcon.tsx
    /ui
      HUD.tsx
      Inbox.tsx
      TaskPanel.tsx
      CampusHR/         # mock HR system screens
      PayrollGrid.tsx
      Meters.tsx
      Clock.tsx
      Dialogue.tsx
      Debrief.tsx
      Settings.tsx
      Coach.tsx         # training mode hints
    /a11y
      ListView.tsx      # 2D accessible alternative to 3D scene
    /audio
    /utils
  /tests
    /unit
    /e2e
```

---

## 6. Architecture

### 6.1 Simulation clock

- One pay period = 10 business days. `[SME]` Confirm Vanderbilt pay frequency per employee type (biweekly vs monthly) and model both if needed.
- Time scale default: 1 sim business day = 4 real minutes in full run. Configurable.
- Clock pauses when any modal or mock system screen is open in Training Mode. In Certification Mode it keeps running.
- Key timestamps per period: `timecardDeadline`, `managerApprovalDeadline`, `payrollCutoff`, `payDate`. All `[SME]`.

### 6.2 Core loop

```
START PERIOD
  -> seed inbox with mission triggers for this run
  -> loop each sim hour:
       clock.tick()
       eventBus.emit scheduled events
       consequences.resolveDue()
       spawn random events (seeded)
  -> at payrollCutoff: lock payroll, run Payroll Results
  -> at payDate: show employee reactions to pay outcomes
END PERIOD -> Debrief
```

### 6.3 Event bus

Typed pub/sub. Every player decision emits a `DecisionEvent`. Scoring, consequences, audio, and coach hints all subscribe. Missions never call scoring directly.

### 6.4 Consequences queue

Decisions can schedule delayed effects:

```ts
consequences.schedule({
  triggerAt: simTime + days(3),
  effect: { type: 'SPAWN_EVENT', eventId: 'NEW_HIRE_NO_ACCESS' },
  causedBy: decisionId
});
```

The debrief traces each problem back to the decision that caused it. This is the core teaching mechanic.

### 6.5 Mission state machines

One XState machine per mission. States are workflow steps. Guards enforce prerequisites (cannot submit offer before comp check). Invalid shortcuts are allowed in Certification Mode but flagged as errors.

### 6.6 Seeded runs

All randomness goes through `rng.ts` with a seed. Facilitators can share a seed so a cohort plays the same run, then compare debriefs in a workshop.

---

## 7. Data model (TypeScript)

```ts
type EmployeeType = 'exempt' | 'nonexempt';
type EmployeeStatus = 'candidate' | 'preboarding' | 'active' | 'on_leave' | 'separating' | 'separated';

interface Employee {
  id: string;
  name: string;               // fictional
  title: string;
  type: EmployeeType;
  fte: number;                // 1.0, 0.75, 0.5
  payRate: number;            // hourly or annual
  payBasis: 'hourly' | 'salary';
  managerId: string;
  status: EmployeeStatus;
  startDate?: SimDate;
  endDate?: SimDate;
  avatarModel: string;        // glb ref
  deskId?: string;
  mood: number;               // 0-100, drives trust meter
  flags: string[];            // e.g. 'missed_punch', 'ot_pending'
}

interface Timecard {
  employeeId: string;
  days: { date: SimDate; in?: string; out?: string; hours: number; code: PayCode }[];
  status: 'open' | 'submitted' | 'manager_approved' | 'hcm_approved' | 'locked';
  exceptions: TimecardException[];
}

type PayCode = 'REG' | 'OT' | 'PTO' | 'SICK' | 'HOL' | 'LWOP' | 'RETRO';  // [SME] confirm real codes conceptually

interface Task {
  id: string;
  missionId: MissionId;
  title: string;
  from: string;               // employee or manager id
  receivedAt: SimTime;
  dueAt?: SimTime;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'done' | 'escalated' | 'missed';
}

interface DecisionEvent {
  id: string;
  missionId: MissionId;
  stepId: string;
  choiceId: string;
  correct: boolean;
  errorCode?: string;         // maps to academy-map.json
  meterDeltas: Partial<Meters>;
  simTime: SimTime;
}

interface Meters {
  payrollAccuracy: number;    // 0-100
  complianceRisk: number;     // 0-100, lower is better
  employeeTrust: number;      // 0-100
  managerSatisfaction: number;// 0-100
}
```

---

## 8. Content schema (JSON)

### 8.1 Mission file shape

```json
{
  "id": "offboard",
  "title": "Offboarding",
  "learningObjectives": ["..."],
  "variants": [
    {
      "id": "voluntary_resignation",
      "trigger": { "type": "inbox", "atDay": 2, "from": "mgr_ortiz" },
      "steps": [
        {
          "id": "confirm_notice",
          "prompt": "Dana Ortiz forwards a resignation email from Kai Brennan. Last day listed as next Friday. What do you do first?",
          "choices": [
            { "id": "a", "text": "Enter the termination in CampusHR now", "correct": false, "errorCode": "OFF_NO_CONFIRM", "deltas": { "complianceRisk": 5 }, "feedback": "..." },
            { "id": "b", "text": "Confirm written resignation and last day with the manager", "correct": true, "deltas": { "managerSatisfaction": 2 }, "feedback": "..." }
          ],
          "consequences": []
        }
      ]
    }
  ]
}
```

### 8.2 Step types

| Type | Interaction |
|---|---|
| `choice` | Pick one of 2 to 4 options |
| `form` | Fill fields in a CampusHR (Sim) screen, validated against expected values |
| `grid` | Edit timecard/payroll grid cells |
| `checklist` | Order or select required items |
| `dialogue` | Branching conversation with a character |
| `triage` | Sort inbox items by priority |
| `lookup` | Find an answer in the in-game Policy Binder |

### 8.3 Policy Binder

`policies.json` holds fictional-department versions of policy summaries. Every one is `[SME]`. The binder is searchable in game. Lookup steps reward using it.

---

## 9. 3D scene spec

### 9.1 Layout

Isometric open-plan department floor, approx 20m x 14m:

1. **HCM desk** (player station) with a glowing terminal. Opens CampusHR (Sim).
2. **Desk pods** (12 to 16 desks). Employees sit, stand, walk.
3. **Manager offices** (3 glass offices). Managers appear when they have a request.
4. **Break room.** Rumors and early warnings happen here (overheard dialogue hints).
5. **Reception / front door.** New hires arrive here on day one. Departing staff exit here.
6. **IT/equipment closet.** Laptop and badge status visible.
7. **Bulletin board.** Payroll calendar and cutoff countdown.
8. **Window wall** with sky that shifts from morning to evening across each sim day.

### 9.2 Characters

- Low-poly rigged humanoids (Quaternius CC0 base), color-varied outfits.
- Animations: idle, walk, sit, type, talk, wave, frustrated, celebrate.
- Floating status icons above heads:
  - Briefcase: candidate
  - Star: new hire
  - Clock with "!": timecard issue
  - Suitcase: on leave
  - Door: separating
  - Speech bubble: wants to talk
- Mood shown as subtle icon tint, never as color alone (icon shape changes too).

### 9.3 Camera

- Orthographic isometric default. Orbit limited to 90 degrees each side. Zoom 3 levels.
- Click employee: camera eases to them, side panel opens.
- Keyboard: arrow keys pan, +/- zoom, Tab cycles hotspots.

### 9.4 Interactions

- Hover: outline + label.
- Click: open task or profile.
- Hotspots pulse when they have pending tasks.
- Ambient life: people walk to break room, printer runs, phones ring.

### 9.5 Visual style

- Flat-shaded low-poly, soft shadows, warm neutral palette with Vanderbilt gold and black accents. `[VERIFY]` exact brand hex values against the Course Builder skill's brand standards.
- No real Vanderbilt building replicas or logos on 3D surfaces. Department is fictional.

### 9.6 Performance budget

| Item | Budget |
|---|---|
| Total draw calls | under 150 |
| Triangles on screen | under 200k |
| Total model payload | under 8 MB compressed |
| First load (fast 4G) | under 6 s to interactive |
| Frame rate | 60 fps on a 2020 integrated-GPU laptop, 30 fps floor |

Use instancing for desks and chairs. Bake lighting where possible. Lazy load characters.

---

## 10. UI spec

### 10.1 HUD (always visible)

- Top left: sim date, day of period, time.
- Top center: **Payroll cutoff countdown**. Turns amber at 24 sim hours, red at 4.
- Top right: four meters (icon + number + label, never color alone).
- Bottom left: inbox button with unread count.
- Bottom right: Policy Binder, Settings, Pause (Training Mode only).

### 10.2 Inbox

Email-style list. Sort by received, due, priority. Each item opens a Task Panel. Some items are noise or low priority on purpose. Triage is a skill.

### 10.3 Task Panel

Right side drawer. Shows requester, context, attachments (fake documents rendered as images or text), and the current step interaction.

### 10.4 CampusHR (Sim)

A fictional HR system with these screens:

1. **Employee Search**
2. **Person Record** (job, comp, manager, status, history)
3. **Requisition** (create, approve, post)
4. **Candidate Pipeline** (kanban: applied, screen, interview, offer, hired)
5. **Offer Builder** (title, grade, pay, start date, FTE; comp band check)
6. **Onboarding Checklist** (tasks with owners and due dates)
7. **Timecard Review** (grid with exceptions highlighted)
8. **Payroll Preview** (gross pay per employee, flags, totals)
9. **Job Change** (transfer, title, FTE, manager, effective date)
10. **Leave Record** (type, dates, pay status)
11. **Termination** (reason, last day, final pay, access removal triggers)

Design rule: realistic field logic (effective dates, required fields, approvals), generic look. Effective dating mistakes must be possible and must cause downstream problems.

### 10.5 Payroll Grid

Spreadsheet-like. Rows = employees, columns = days + totals. Edit cells, apply pay codes, add comments. Exceptions show an icon and tooltip.

### 10.6 Dialogue

Bottom panel with character portrait, line text, voice audio (captions always on by default), 2 to 4 responses.

### 10.7 Coach (Training Mode only)

A friendly in-world mentor character ("Senior HCM"). Offers one hint per step on request. Hints cost a small score penalty in scored runs.

### 10.8 Debrief screen

1. Final meters with letter grade per meter.
2. Timeline of the period with decision markers. Click a marker to see the decision, the consequence it caused, and the better choice.
3. "Root cause chains": e.g. Skipped access request (Day 2) -> New hire idle on Day 5 -> Manager satisfaction -8.
4. Recommended HCM Academy modules from `academy-map.json`.
5. Download PDF. Replay same seed. New seed.

---

## 11. Mission specs

Each mission lists: objective, steps, key decisions, common errors, consequences. All policy specifics are `[SME]` until validated with HCM superusers.

### 11.1 PAYROLL (Phase 1)

**Objective:** Get accurate pay to every employee by cutoff.

**Steps:**
1. Review period calendar on bulletin board.
2. Send timecard reminder (choose timing and audience).
3. Review timecard exceptions: missed punch, missing day, PTO without balance `[SME]`, OT not pre-approved.
4. Resolve each exception (contact employee, contact manager, correct, or leave and document).
5. Chase manager approvals before deadline.
6. Process a retro pay request from a manager (raise effective two weeks ago).
7. Run Payroll Preview, spot anomalies (one planted: hours entered as 80 instead of 8.0).
8. Final approve before cutoff.

**Key decisions:**
- Fix a missed punch yourself vs. get documented employee/manager confirmation.
- Approve OT that was not pre-approved (federal law requires paying nonexempt OT for hours over 40 in a workweek regardless of approval; the policy issue is separate).
- Push a late manager approval vs. escalate.

**Common errors (error codes):** `PAY_UNDOC_EDIT`, `PAY_OT_DENIED`, `PAY_MISSED_ANOMALY`, `PAY_LATE_APPROVAL`, `PAY_RETRO_WRONG_DATE`

**Consequences:** Underpaid employee walks to your desk on pay date (trust drop, dialogue). Overpayment triggers a recovery task next period. Missed cutoff creates off-cycle check task and manager frustration.

### 11.2 OFFBOARD (Phase 1)

**Variants:** Voluntary resignation, involuntary termination (with ER partner involvement), retirement, end of temp assignment.

**Steps:**
1. Receive notice (sometimes indirectly: break room rumor first).
2. Confirm written notice and last day.
3. Enter termination with correct reason and effective date.
4. Final pay: timing and components `[SME]` (state law and Vanderbilt policy).
5. Coordinate system access removal for last day end-of-day.
6. Equipment and badge return.
7. Benefits/exit info handoff `[SME]`.
8. Knowledge transfer prompt to manager.
9. Exit survey or interview invitation.

**Key decisions:**
- Enter termination on rumor vs. wait for confirmation.
- Access removal timing for involuntary exit (immediate) vs. voluntary (last day).
- Handling a "can I take back my resignation" twist.

**Error codes:** `OFF_NO_CONFIRM`, `OFF_WRONG_DATE`, `OFF_ACCESS_LATE`, `OFF_ACCESS_EARLY`, `OFF_FINAL_PAY`, `OFF_EQUIP_MISSED`

**Consequences:** Access not removed shows a 3D scene of the ex-employee's badge still working (security event). Wrong effective date creates a payroll overpayment in 11.1.

### 11.3 HIRE (Phase 2)

**Steps:**
1. Manager requests a new position (dialogue).
2. Verify budget/position approval `[SME]`.
3. Create requisition with correct job, grade, FTE.
4. Post (choose channels).
5. Screen candidate pipeline (3 to 5 fictional candidates with resumes).
6. Coordinate interviews (schedule conflict puzzle).
7. Build offer: comp band check. Manager pushes for above-band offer.
8. Contingencies: background check `[SME]`.
9. Set start date respecting onboarding lead time and pay period alignment.

**Key decisions:** Above-band pressure from manager. Start date mid-period vs. period start. Candidate asks an illegal-question complaint in interview feedback (spot it).

**Error codes:** `HIRE_NO_APPROVAL`, `HIRE_ABOVE_BAND`, `HIRE_BAD_START`, `HIRE_INTERVIEW_ISSUE`, `HIRE_NO_CONTINGENCY`

### 11.4 ONBOARD (Phase 2)

**Steps:**
1. Preboarding checklist: system access requests, equipment, badge, desk.
2. Welcome email (choose content).
3. Day one: I-9 Section 1 by first day, Section 2 within 3 business days of start (federal requirement).
4. Payroll setup: direct deposit, tax forms.
5. Benefits enrollment window communication `[SME]`.
6. First week check-in with manager.

**3D moment:** New hire arrives at reception. If prep was missed, they sit at an empty desk with no laptop, mood icon drops in real time.

**Error codes:** `ONB_ACCESS_LATE`, `ONB_I9_LATE`, `ONB_NO_EQUIP`, `ONB_PAY_SETUP`, `ONB_BENEFITS_WINDOW`

### 11.5 CHANGES (Phase 3)

**Variants:** Promotion with raise, lateral transfer to another department, FTE reduction, manager change, exempt-to-nonexempt reclassification.

**Key teaching point:** Effective dates. Every change asks for one, and getting it wrong cascades into payroll.

**Error codes:** `CHG_EFF_DATE`, `CHG_NO_APPROVAL`, `CHG_RECLASS_MISSED`, `CHG_FTE_BENEFITS`

### 11.6 LEAVE (Phase 3)

**Variants:** Planned medical leave, sudden family leave, intermittent leave, return to work.

**Steps:** Recognize a leave situation (sometimes the employee only hints), route to the right partner `[SME]`, set leave status and pay status, protect privacy, plan coverage with manager without disclosing medical details, process return.

**Key decision:** Manager asks "what's wrong with her?" Correct path protects confidentiality.

**Error codes:** `LV_NOT_RECOGNIZED`, `LV_PRIVACY`, `LV_PAY_STATUS`, `LV_NO_ROUTE`, `LV_RTW_MISSED`

---

## 12. Random events catalog (events.json)

Seeded. 3 to 6 per full run. Each has a trigger window, a scene effect, and a task.

1. Manager forgot to submit a termination from last week.
2. Employee disputes OT on paycheck.
3. New hire's start date moved by candidate, two days before start.
4. Two managers both claim the same employee after a transfer.
5. Timecard system "outage" for half a day (manual workaround required).
6. Employee overhears pay of a coworker, asks about pay equity.
7. Leave request arrives the morning of payroll cutoff.
8. Director asks for a headcount report in one hour (triage vs. payroll).
9. Duplicate employee record discovered.
10. Employee resigns via text message to their manager.
11. Holiday falls in the period, holiday pay rules apply `[SME]`.
12. Wrong bank info submitted by a new hire.

---

## 13. Scoring

- Meters start at: Accuracy 100, Compliance Risk 0, Trust 70, Manager Satisfaction 70.
- Deltas come only from `DecisionEvent` and `consequences`.
- Final grade per meter: A/B/C/D.
- Overall rating: "Ready," "Almost ready," "Keep practicing." Certification Mode pass threshold is configurable `[SME]`.
- Hints in Training Mode: -2 to the relevant meter each.
- Time bonus: none. Speed is rewarded only by finishing before cutoff. Accuracy matters more.

---

## 14. Audio

| Asset | Source |
|---|---|
| Ambient office loop | Runway generate_sound_effect |
| UI clicks, inbox ping, approve chime, error buzz | Runway generate_sound_effect |
| Cutoff tension music (last 4 sim hours) | Runway generate_music |
| Character voice lines (key moments only, about 60 lines) | Runway generate_speech with distinct voices |

All audio has captions. Separate volume sliders for music, SFX, voice. Mute toggle in HUD.

---

## 15. Accessibility (WCAG 2.1 AA)

1. **2D List View:** full alternative to the 3D scene. Same tasks, same game, no 3D required. Toggle in Settings and auto-offered if WebGL fails.
2. Full keyboard play. Visible focus states.
3. Screen reader labels on all hotspots, meters, and grid cells. Live region announcements for new inbox items and clock warnings.
4. Never color alone for status.
5. Reduced motion setting: disables camera easing, walking, and pulse effects.
6. Captions on by default.
7. Text resizable to 200 percent without breaking panels.
8. Pause available in all modes for accessibility (Certification Mode pause logs but does not penalize).
9. Playwright + axe-core runs on every PR.

---

## 16. Brand

- Apply Vanderbilt brand tokens from the Course Builder skill. `[VERIFY]` gold and black hex values, fonts.
- Department, people, and CampusHR (Sim) are fictional. No real employee names.
- Footer: "A Futures Learning Hub simulation."

---

## 17. Save and privacy

- localStorage keys: `pp_settings`, `pp_progress`, `pp_current_run`.
- No network calls except loading static assets.
- Debrief PDF generated client side.
- Settings includes "Clear my data."

---

## 18. Testing

### 18.1 Unit (Vitest)
- Clock and cutoff math
- Scoring deltas
- Consequence scheduling and resolution
- Every mission machine: all valid paths reach completion
- Content schemas: every JSON file validates

### 18.2 E2E (Playwright)
- Full scripted "perfect run" per mission ends with all meters in A range
- Scripted "worst run" ends with correct consequences and debrief chains
- 2D List View completes every mission
- Keyboard-only playthrough of Payroll mission
- Screenshot regression of HUD and debrief
- axe-core: zero serious or critical violations

### 18.3 Performance
- Lighthouse performance score 80+ on desktop
- FPS logger in dev mode

---

## 19. Deploy

1. `main` -> Vercel production. Feature branches -> preview URLs for SME review.
2. GitHub Pages workflow as fallback.
3. Phase 5 optional: SCORM 1.2 package build script (`npm run build:scorm`) wrapping the static build with completion and pass/fail only.

---

## 20. Phases and acceptance criteria

### Phase 0: Foundation (Day 1)
- Repo, Vite, TS strict, Tailwind, R3F, Zustand, XState, Zod, Vitest, Playwright installed
- CLAUDE.md, SPEC.md, CONTENT_TODO.md in place
- Content schemas written and validating placeholder JSON
- Vercel preview deploy working

**Accept when:** blank scene deploys, `npm test` passes, schema validation runs in CI.

### Phase 1: Diorama + Payroll + Offboard
- Office scene with desks, HCM desk, reception, break room, manager offices
- 8 employees with idle/walk/sit animations and status icons
- HUD, clock, cutoff countdown, meters, inbox, task panel
- CampusHR (Sim) screens: Search, Person Record, Timecard Review, Payroll Preview, Termination
- Payroll and Offboard missions fully playable with consequences
- Basic debrief
- 2D List View for these missions

**Accept when:** both missions playable start to finish in 3D and 2D, perfect/worst run tests pass, 60 fps target met, axe clean.

### Phase 2: Hire + Onboard
- Requisition, Candidate Pipeline, Offer Builder, Onboarding Checklist screens
- New hire arrival scene at reception
- Cross-mission consequences: hire decisions affect onboarding and payroll

**Accept when:** a hire made in-run shows up on day one and appears in payroll.

### Phase 3: Changes + Leave + Random Events
- Job Change and Leave Record screens
- All 12 random events
- Full 45 minute run mode with seeded runs

### Phase 4: Polish
- Audio, voice lines, Coach character, debrief PDF, root cause chains, Training vs Certification modes
- Performance and accessibility hardening

### Phase 5: Content validation + optional SCORM
- All `[SME]` items resolved with HCM superusers
- Pilot with 5 to 8 HCMs, iterate
- SCORM build if needed

---

## 21. SME content intake (from HCM superuser interviews)

Pull these from discovery interviews and Learning Lab Office Hours. Log each in CONTENT_TODO.md.

1. Pay frequencies and period calendar logic
2. Timecard and approval deadlines
3. Real exception types HCMs see most
4. Retro pay process
5. Final pay rules and timing
6. Access removal process and owners
7. Requisition and position approval steps
8. Comp band check process
9. Background check and contingency steps
10. Onboarding lead times and owners
11. Benefits enrollment windows
12. Leave routing partners and pay status options
13. Effective dating rules for changes
14. Holiday pay rules
15. Top 10 "this went wrong once" stories (become random events)
16. Certification pass threshold

---

## 22. Content writing rules

- Plain language. Short sentences. No jargon without a Policy Binder entry.
- Feedback always says: what happened, why it matters, what to do next time.
- Characters are diverse, realistic, and never caricatures.
- Wrong choices must be plausible. No obviously silly options.
- No real names, real departments, or real Oracle screens.

---

## 23. CLAUDE.md (create this file)

```md
# Pay Period: HCM Simulation

Read SPEC.md fully before any work.

Rules:
- TypeScript strict. No `any`.
- All scenario content in /content JSON, validated by Zod. Never hardcode content in components.
- Missions are XState machines. Scoring only via eventBus DecisionEvents.
- All randomness via src/engine/rng.ts (seeded).
- No network calls, analytics, cookies, or backend.
- Every 3D interaction must have a 2D List View equivalent.
- Never rely on color alone for meaning.
- Mark unknown policy details [SME] and log in CONTENT_TODO.md.
- Use Context7 for R3F/drei/XState API questions before guessing.
- Run `npm test` and `npm run test:e2e` before every commit.
- Keep model payload under 8 MB and draw calls under 150.
- Build in phase order. Do not skip acceptance criteria.
```

---

## 24. Kickoff prompt for Claude Code

> Read SPEC.md and CLAUDE.md in full. Then execute Phase 0. Set up the repo exactly as Section 5 describes, install the stack in Section 4, write the Zod schemas for every content file in Section 8 with placeholder JSON that validates, set up Vitest and Playwright with one passing test each, and configure Vercel preview deploys. When Phase 0 acceptance criteria pass, stop and give me a summary with the preview URL before starting Phase 1.
