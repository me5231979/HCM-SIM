# Content TODO: [SME] items

Every item here needs confirmation from HCM superusers before the pilot. The game marks each one `[SME]` in content.

| Area | Item | Where | Current placeholder |
|---|---|---|---|
| Calendar | `calendar`: time of day for the HCM transaction cutoff | policies.json `calendar`, payroll.json `deadlines.transactions` | The 2026 Payroll Calendar lists the date only (Fri Oct 23); the game uses 5:00 PM |
| Calendar | Is there a separate Retro Change Cutoff for biweekly changes? | policies.json `retro` | Not modeled; retro changes use the HCM transaction cutoff |
| Calendar | Auto-select the current period from the full calendar | content/department.json | Fixed to biweekly period 22 (Oct 11 to Oct 24, 2026) |
| Time cards | `who_fixes`: where a manager's confirmation of an HCM-entered correction should be recorded | policies.json `who_fixes` | "Keep a record" |
| Approvals | `manager_approval`: backup approver rule when a manager is out | policies.json, payroll.json `escalate` | Escalate to the backup approver and copy the supervisor |
| Approvals | What happens to unapproved time at the time card deadline | payroll.json `escalate.leave` feedback | Hours miss the run |
| Reminders | Whether any exempt groups record time | payroll.json `reminder.audience.everyone` | Exempt staff don't submit time cards |
| Events | Timecard system outage workaround | events.json `timecard_outage` | Planned, not live |
| Events | Holiday pay rules | events.json `holiday_pay` | Planned, not live |
| Scoring | Certification pass threshold | src/engine/scoring.ts `rating` | Ready = all A; Almost ready = all A or B |
| Live practice | Dana's role-play prompt and the coaching notes for the overtime conversation | ElevenLabs agent prompt, content/live.json `coaching` | Written from FLSA overtime rules and the manager-reviews-time model; needs an SME read |
| Live practice | Daily conversation cap for the pilot | ElevenLabs agent call limits | 100 a day, 5 at once, 3 minutes each |

Sourced (not SME): the pay period, HCM transaction cutoff date, time card deadline, and paycheck date (Vanderbilt 2026 Payroll Calendar, biweekly period 22); the HCM's role in payroll; the time card approval order; Save vs Submit; the 4-hour PTO increment; FLSA overtime; retro effective dates; off-cycle requests. Sources are listed in policies.json.

## SME review log

### Pay Period feedback (October 2026)

| Feedback | Change |
|---|---|
| Match the real payroll calendar and its cutoffs | The game now runs on biweekly period 22 of the Vanderbilt 2026 Payroll Calendar: HCM transaction cutoff Fri Oct 23, time cards due Mon Oct 26 at noon, paycheck Fri Oct 30. Both deadlines show as countdowns in the HUD, and the raise must be in by the transaction cutoff. |
| Explain the symbols above people's heads | Legend in the guided tour and in Help (speech bubble, time card issue, resolved, gold floor ring). |
| A short tutorial or practice first | Optional one-minute guided tour after the briefing, with an unscored practice request. Replay any time from Help. |
| Explain the buttons | Every HUD control now has a visible label, and the tour and Help explain each one. |
| Waiting for something to happen after finishing tasks | When nothing is waiting, a "caught up" bar appears, time runs 10x faster to the next request, and Skip jumps straight there. When everything is done, Finish the period ends it. |
| HCMs don't run Payroll Preview | Replaced with a Final time card check: period totals and Approval State, the same view the weekly check uses. |
| HCMs don't approve payroll | Removed. Play ends when time cards are due and payroll signs off. |
| Managers should review time cards and ask employees for clarification | Time card exceptions now go to the manager, who confirms with the employee and corrects it; the HCM supports. Fixing it yourself, even with the right answer, is scored as bypassing the manager. |
| Timecard review training for managers too | Proposed next: a manager edition of this mission, played from the manager's chair (reviewing exceptions, clarifying with employees, approving by the deadline). HCM Academy already has "UKG: Timecards, Time Off, and Schedules for Managers" for HCMs who coach managers. |
