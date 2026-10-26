# Content TODO: [SME] items

Every item here needs confirmation from HCM superusers before the pilot. Content marks each one `[SME]`; learners never see the marker (`learnerText` in `src/content.ts` removes it), and the Policy Binder labels those entries "Being confirmed".

## Calendars, payroll, and scoring

| Area | Item | Where | Current placeholder |
|---|---|---|---|
| Calendars | Which worker groups are paid weekly, biweekly, and monthly (the game pays exempt staff and faculty monthly, most non-exempt staff biweekly, and some weekly) | content/department.json, employees.json payFrequency | Exempt monthly; non-exempt biweekly, with one weekly technician and weekly student workers |
| Calendars | Weekly payroll dates for the week of Oct 18 (cutoff, time cards due, paycheck) | department.json `weekly` | Same cutoff and time card deadline as biweekly period 22; paycheck Fri Oct 30 |
| Calendars | Monthly cutoff dates: the published rows put each monthly cutoff on the 18th (October: Sun Oct 18; next: Wed Nov 18), and the monthly pay date | department.json `monthly`, week.json `calendar.exempt` | Oct 18 and Nov 18; no monthly pay date is stated |
| Calendars | Retro Change Cutoff for biweekly period 22, and how a backdated change approved between the Retro Change Cutoff and the HCM transaction cutoff pays | policies.json `retro`, week.json `retro`, deadline `retro` | Wed Oct 21 at 5:00 PM; the backdated raise is due then |
| Calendars | Time of day for the HCM transaction cutoff | policies.json `calendar`, deadline `transactions` | 5:00 PM |
| Payroll | Off-cycle run schedule and the request deadline payroll needs | week.json `offcycle` | Payroll needs the transaction and form by Fri Oct 23 at noon for that week's run |
| Payroll | Off-cycle criteria wording on the form (the course lists examples: more than 25% of salary missing, a time card issue, the $200 gross threshold) | week.json `offcycle` attachment | Marcus is $500 a month short after a system error, so he qualifies |
| Time cards | `who_fixes`: where a manager's confirmation of an HCM-entered correction should be recorded | policies.json `who_fixes` | "Keep a record" |
| Approvals | `manager_approval`: backup approver rule when a manager is out | policies.json, week.json `escalate` | Escalate to the backup approver and copy the supervisor |
| Approvals | What happens to unapproved time at the time card deadline | week.json `escalate.leave` feedback | Hours miss the run |
| Reminders | Whether any exempt groups record time | week.json `reminder.audience.everyone` | Exempt staff don't submit time cards |
| Scoring | Readiness thresholds for Certification | src/engine/scoring.ts `READY` | Ready: every topic at 80% or better and compliance risk at 20 or lower. Almost ready: 70% overall and no topic under 50% |
| Live practice | Dana's and Marcus's role-play prompts and coaching notes | ElevenLabs agent prompts, content/live.json `coaching` | Written from FLSA overtime rules, the clear to start rule, and I-9 timing; needs an SME read |
| Live practice | Daily conversation cap for the pilot | ElevenLabs agent call limits | 100 a day per character, 5 at once, 3 minutes each |
| Events | Timecard system outage workaround; holiday pay rules | events.json `timecard_outage`, `holiday_pay` | Planned, not live |

## Start Here and Records

| Item | Where | Current placeholder |
|---|---|---|
| Where HCMs report a suspected data incident, and the approved way to share a file that holds personal data | confidential.send, start_confidentiality | Leave SSNs out, identify people by person number, send only what the task needs, and report incidents right away |
| Which reporting (BI) roles HCMs have, including Create Analysis, and who can publish to Shared Folders | confidential.build, records_new_analysis, q_costing_report.report | HCMs can build an analysis and save it in My Folders; Shared Folders needs publishing rights |
| Approval chain for a Change Assignment that updates a business title | bell.track, start_approvals | Routes to the director (Dr. Park) for approval |
| Exact on-screen label for withdrawing a pending transaction | bell.fix | Withdraw |
| Whether the business title is typed by hand in Change Assignment (so a typo can slip in) or set from the job name | bell.fix | Typed by hand to match the job name, Office Assistant 2 |
| Which standard roster report HCMs run, where it is stored, and its as-of date prompt | report_date.asof | A shared catalog roster report with an as-of date prompt |
| Whether a pending worker shows on roster reports before the hire is converted and approved | report_date.noor | Noor shows once her hire is converted and approved with an Oct 26 start |
| Vanderbilt rules for storing and emailing exported HR data | report_date.save, records_saving_reports | Keep exports to what the task needs and share them only as policy allows |
| Which office handles requests for student information (Registrar or FERPA office), and who to tell about a disclosure | ferpa.schedule, ferpa.schedule.verify consequence, start_ferpa | Decline, suggest the caller ask the student, and refer the request |
| How Vanderbilt classifies student worker employment records under FERPA | ferpa.pay | Treated as education records |
| Time of day for the biweekly HCM transaction cutoff | q_cutoff_timing.timing | 5:00 PM, Fri Oct 23 |
| Vanderbilt's process and contact for worker classification questions | q_contractor.classify, start_classification | Ask your EC (Ravi Menon) before any work starts |
| Naming convention shown in the Compensation Letters type description | doc_record.file, records_document_records | Name it the way the type's description shows (no name spelled out in the draft) |
| Where the Departmental Playbook lives in the reporting catalog | q_costing_report.report, records_playbook | Departmental Playbook costing reports, run for your area |
| Who completes I-9 Section 2 at Vanderbilt, in which system, and who handles a late or incorrect I-9 | i9.section2, i9.section1 consequences, start_i9 | The employer reviews documents and completes Section 2 by Thu Oct 29; corrections go through central HR |

## Positions, Recruitment and Hiring

| Item | Where | Current placeholder |
|---|---|---|
| Vanderbilt's Out of State Risk Assessment form and process (still pending from ECs), who owns each review area, and the lead time for a new state | out_of_state.review; policy hiring_out_of_state | Send the work state and move date to the EC as soon as you hear about a move. No form is named. |
| How Vanderbilt pays staff who work in another state (non-exempt weekly or biweekly, exempt monthly), including whether Illinois rules affect a biweekly worker | out_of_state.cadence; policy hiring_state_rules | Payroll compares the state's pay frequency rule with the worker's pay group before the move. The draft never states what Illinois requires. |
| How Vanderbilt provides and tracks state sick and family leave for staff who work in other states, and who administers it | q_state_leave.leave; policy hiring_state_rules | The HCM routes state leave questions to the EC and keeps the work location right |
| Which worker type and category Vanderbilt uses in CampusHR for paid and unpaid interns, and which checks apply | intern.setup; policy hiring_interns | Confirm the worker type with the EC before anyone builds a record |
| Which positions are union-covered, where the agreements are kept, how they show in CampusHR, and which hiring and posting steps differ | q_union.union; policy hiring_union | Confirm coverage with the EC before posting; if covered, the agreement sets pay. The sim only says the technician job might be covered. |
| Who can approve rehiring someone marked No for rehire, and how Not specified is handled | q_rehire.rehire; policy hiring_rehire | Hold any offer and review the No with the recruiter and the EC |
| The courses send rehire flags, union exceptions, and state leave questions to an HR consultant role other than the EC. Confirm who HCMs should contact for each. | q_rehire.rehire, q_union.union, q_state_leave.leave | The EC (Ravi Menon) handles all three in the sim |
| What Quick Convert leaves out compared with Convert (the course only says never to use it) | convert.method quick feedback and consequence | Quick Convert converts the record as it stands, without the payroll details and salary sections |
| Lead time HCMs should plan between clear to start, conversion approvals, and a first day | start_early.start, convert.method | Convert the day clear to start arrives; a Wednesday clearance supports a Monday Oct 26 start |
| How Vanderbilt handles postings open to several locations or remote anywhere, and whether other states or cities now require posted ranges | policy hiring_pay_transparency | Not used in play; the sim's New York role is on site, so the range is required |

## Students, Faculty, and Leave

| Item | Where | Current placeholder |
|---|---|---|
| How HCMs hand a possible FMLA leave need to the Vanderbilt leave team (form, email, or the employee applies directly), and who sends the eligibility notice | fmla.route; policy leave_fmla_basics | Get the request to Carmen Ruiz on the central leave team the same day; the leave team sends the notice |
| Which absence types Vanderbilt uses for FMLA, TMLA (TPLA), and FMLA running with state leave, and who enters intermittent occurrences | fmla.record; policy leave_intermittent | Record each occurrence with the actual time taken; no absence type or enterer is named |
| Where a biweekly (non-exempt) employee's protected leave is tracked: time card pay codes, CampusHR absence records, or both | fmla.record; policy leave_intermittent | No system named; the decision only tests per-occurrence recording |
| Whether HCMs can approve exempt time off or only managers can | exempt_pto.approval; policy leave_exempt_time_off | The manager (Dana) approves from her notifications bell |
| Vanderbilt approval routing for each absence type, including whether the leave team is in the chain and whether withdrawing an approved absence needs approval | exempt_pto.approval; q_withdraw.cancel; policy leave_approvals | Standard routing to the line manager; a withdrawal may show Awaiting withdrawal approval |
| Exact leave status action and assignment status names (on leave, paid vs unpaid, return to work), and that the HCM makes the change | leave_return.status; policy leave_status | HCM runs Change Assignment with the leave status action; return status such as Active payroll eligible |
| 2026 monthly cutoff dates: October cutoff Sun Oct 18, next cutoff Wed Nov 18 | exempt_pto.approval and faculty_supplement.timing feedback; faculty_supplement attachment; policy leave_exempt_time_off | Oct 18 (passed) and Nov 18 |
| Weekly payroll dates (HCM transaction cutoff Fri Oct 23, time cards due Mon Oct 26 at noon) and the 5:00 PM time of day for the Friday cutoff | term_end.follow_up feedback; faculty_supplement.timing (friday option); faculty_supplement attachment | Fri Oct 23 at 5:00 PM; time cards Mon Oct 26 at noon |
| Whether an October faculty supplement can pay October as retro in November | faculty_supplement.timing | Earliest pay is the November check; retro for October only if the element supports it |
| How to date a student hire and pay hours worked before the hire (Maya's 12 event hours), how a late I-9 is handled, and who completes Section 2 | gift_card.pay; gift_card.checks; policy students_setup | Hire now as a student worker, ask the EC how to date the hire and pay the past hours, complete the I-9 right away and never backdate it |
| Who confirms student eligibility (enrollment, hour limits, international student work authorization) | policy students_setup | Not tested; the policy says to confirm |
| CampusHR setup for Student Expense Only (worker type, person type, hire reason, status, end date) and who approves it | q_expense.setup; policy students_setup | Student Expense Only with no I-9 or background check; confirm the setup with the EC before entering |
| Service free stipend assignment status, element, costing account, and tax handling | q_stipend.setup; policy students_setup | Hire reason Service free appointment, no I-9 or background check; confirm the rest with the EC |
| Exact Quick Action names Vanderbilt uses for Add Work Relationship and Add Assignment | gift_card.record; policy students_record_action | Add the employment Work Relationship; Add Assignment |
| Vanderbilt's term change calendar, whether student assignments are ended in bulk, and which End Assignment entry point to use | term_end.action; term_end.end_date; policy students_term_end | The HCM ends each student job with End Assignment in Change Assignment, dated the last day of the work period |
| Approval routing for student and faculty transactions, and who can see the approver list | term_end.follow_up; policy students_approvals | The approver shown in the notifications bell's approval history; the EC as fallback |
| Which faculty supplement elements Vanderbilt uses, who approves them, and who enters one for faculty from another school | faculty_supplement.method; policy students_faculty_pay | Check with the EC before entering any faculty supplement |
| Faculty and staff element costing accounts (5110 faculty, 5120 staff) from the researched Faculty course | policy students_faculty_pay | 5110 faculty, 5120 staff, 5130 student |
| Whether faculty hires come through a requisition or a manual background check request, and the faculty affairs role in appointments | q_faculty_start.setup; policy students_faculty_hire | Wait for PEBC clear to start; I-9 and background check |
| Vanderbilt's emeritus setup (worker type, person type, hire reason, status, position, end date), who approves and enters it, and whether paid emeritus work needs its own setup | q_emeritus.setup; policy students_confirm_first | Enter nothing until the EC confirms; never reuse the faculty position |
| What FERDC stands for, which population it covers, and its setup (worker type, hire reason, status, checks, costing) | q_ferdc.setup; policy students_confirm_first | Search the person, then confirm the setup with the EC before entering |

## Assignments and Costing

| Item | Where | Current placeholder |
|---|---|---|
| Time of day for the biweekly HCM transaction cutoff | hours.effective | Fri Oct 23, 5:00 PM |
| Retro Change Cutoff date for pay period 22 (usually two business days before the HCM transaction cutoff) | retro_costing.retro; costing_retro_form | Wed Oct 21 |
| Whether the Wellness grant is externally funded, so a retro costing form needs a cost transfer memo | retro_costing.retro | Ask Mei; add the memo if it is |
| What happens to a retro costing fix that misses the Retro Change Cutoff | retro_costing.retro (hidden choice late) | It waits for the next cycle's cutoff |
| Current labels for the Costing for Persons edit actions (Update, Correct, End Date, Delete Record); the training guide predates the current screens | costing_change_actions; retro_costing.action; transfer_costing.date | Labels from the 2022 training guide |
| Which HCM, sending or receiving, ends or updates costing after a cross business unit transfer | transfer_costing.action; costing_transfers | Sending HCM End Dates its costing on the last day of the last pay period and tells the receiving HCM |
| Which End Assignment entry point Vanderbilt uses (Change Assignment or the termination page) | resign.action | End Assignment, with no entry point named |
| Who submits End Assignment and who changes the primary flag when a person's jobs sit in different business units | resign.primary; assignments_end_vs_terminate | Agree with the other HCM on dates and who submits what |
| Owners and process for equipment return and the exit survey | resign.closeout; assignments_offboarding | HCM arranges equipment return with the manager |
| Whether a second assignment needs pre-approval from Compensation or the EC, and which action reasons to use | q_second_job.setup; assignments_add_assignment | Ask your EC before you submit |
| Whether a new manager needs a manager role or time card approver setup after Direct Reports moves a team | q_manager_leaves.move; assignments_direct_reports | Confirm with your EC |
| How the 5 business day internal posting rule applies to moves inside a business unit | q_reorg_move.who; assignments_internal_moves | Ask your EC whether any internal posting rule applies |
| Exact name of the rehire eligibility field | q_misconduct.first; assignments_termination_basics | the rehire field |
| The courses route misconduct, RIF, and access timing decisions to a separate HR consultant role; this draft routes them to the EC, the only HR partner in the cast | q_misconduct.first; q_rif_notice.notice; assignments_termination_basics | your EC (Ravi Menon) and department leadership |

## Policies marked Being confirmed

Each of these policies has an `[SME]` detail in its body: `calendar`, `who_fixes`, `manager_approval`, `retro`, `start_confidentiality`, `records_new_analysis`, `start_approvals`, `records_saving_reports`, `start_ferpa`, `start_i9`, `start_classification`, `records_playbook`, `hiring_interns`, `hiring_rehire`, `hiring_union`, `hiring_pay_transparency`, `hiring_out_of_state`, `hiring_state_rules`, `leave_fmla_basics`, `leave_intermittent`, `leave_exempt_time_off`, `leave_approvals`, `leave_status`, `students_setup`, `students_record_action`, `students_term_end`, `students_approvals`, `students_faculty_pay`, `students_faculty_hire`, `students_confirm_first`, `assignments_internal_moves`, `assignments_end_vs_terminate`, `assignments_offboarding`, `assignments_termination_basics`, `assignments_direct_reports`, `assignments_add_assignment`, `costing_change_actions`, `costing_retro_form`, `costing_transfers`.

Sourced (not SME): the biweekly pay period, HCM transaction cutoff date, time card deadline, and paycheck date (Vanderbilt 2026 Payroll Calendar, period 22); everything else is taught from the HCM Academy course named in each policy's source, or from federal rules (FLSA overtime, I-9 timing, FMLA notice, FERPA).

## SME review log

### Role of the HCM (October 2026)

| Feedback | Change |
|---|---|
| One comprehensive week, not just payroll: an HCM does it all at once | Mon Oct 19 to Mon Oct 26 at noon, with 60 requests and quick questions across all eight Academy topics: hiring, payroll, assignments, leave, costing, students and faculty, records, and foundations. Every one of the 79 HCM Academy courses is practiced at least once (a unit test enforces it). |
| Pay periods are weekly, biweekly, or monthly, depending on the worker | Three payroll calendars run side by side. Each person has a pay frequency; decisions turn on picking the right calendar (exempt changes after Oct 18 pay in November with retro; backdated hourly changes close at the Retro Change Cutoff). |
| Is it clear, does it educate, is it easy to navigate, are outcomes measurable? | A first-time learner walkthrough drove the fixes: answers balanced so length never gives the answer away (tested), meter changes explained in each feedback, a pinned Decide button, a Next request button, solid panels on phones, tables as cards on phones, and a debrief that lists every mistake with the better choice and its course, by topic, with name, date, and time played on the printout. |

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
