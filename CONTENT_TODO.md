# Content TODO: [SME] items

Every item here needs confirmation from HCM superusers before the pilot. The game marks each one `[SME]` in content.

| Area | Item | Where | Current placeholder |
|---|---|---|---|
| Calendar | Pay frequency by employee type (biweekly vs monthly) | content/department.json `frequencyNote` | Non-exempt biweekly from approved UKG timecards; exempt monthly |
| Calendar | Biweekly pay date offset | content/department.json `payDateNote` | Pay date one week after period end (Fri Oct 23) |
| Deadlines | Manager approval deadline | content/missions/payroll.json `deadlines.managerApproval` | Friday 12:00 PM of period end |
| Deadlines | `cutoff`: biweekly payroll cutoff day and time | policies.json `cutoff`, payroll.json `deadlines.cutoff` | Friday 5:00 PM of period end |
| Timecards | `documented_edits`: where confirmation of a timecard edit should be documented | policies.json | "Keep a record of that confirmation" |
| Approvals | `manager_approval`: backup approver rule when a manager is out | policies.json, payroll.json `escalate` | Escalate to backup approver and copy the supervisor |
| Approvals | What happens to unapproved time at cutoff | payroll.json `escalate.leave` feedback | Hours miss the run |
| Reminders | Whether any exempt groups record time | payroll.json `reminder.audience.everyone` | Exempt staff don't submit timecards |
| Events | Timecard system outage workaround | events.json `timecard_outage` | Planned, not live |
| Events | Holiday pay rules | events.json `holiday_pay` | Planned, not live |
| Scoring | Certification pass threshold | src/engine/scoring.ts `rating` | Ready = all A; Almost ready = all A or B |

Sourced (not SME): timecard approval order, Save vs Submit, 4-hour PTO increment, FLSA overtime, retro effective dates, off-cycle requests. Sources are listed in policies.json.
