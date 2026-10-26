import { AcademyMap, Department, Employees, Events, Mission, Policies, Tutorial } from '../content/schemas';
import departmentJson from '../content/department.json';
import employeesJson from '../content/employees.json';
import policiesJson from '../content/policies.json';
import academyJson from '../content/academy-map.json';
import eventsJson from '../content/events.json';
import tutorialJson from '../content/tutorial.json';
import payrollJson from '../content/missions/payroll.json';
import { at, dateStart } from './engine/clock';

/** Every content file is parsed with Zod at load. A bad file fails loudly, never silently. */
export const department = Department.parse(departmentJson);
export const people = Employees.parse(employeesJson).people;
export const policies = Policies.parse(policiesJson).entries;
export const academy = AcademyMap.parse(academyJson);
export const events = Events.parse(eventsJson).events;
export const tutorial = Tutorial.parse(tutorialJson);
export const payroll = Mission.parse(payrollJson);

/** The real calendar row, as sim times. */
export const period = {
  number: department.payPeriod.number,
  begin: dateStart(department.payPeriod.begin),
  end: dateStart(department.payPeriod.end),
  paycheck: dateStart(department.payPeriod.paycheck),
  source: department.payPeriod.source,
};

export const personById = (id: string) => {
  const p = people.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown person ${id}`);
  return p;
};
export const policyById = (id: string) => policies.find((p) => p.id === id);
export const courseFor = (code: string) => {
  const c = academy.codes[code];
  return c ? { ...c, url: `${academy.base}${c.course}/` } : undefined;
};

/** Cross-file checks Zod can't express: every reference must point at something real. */
export function crossCheck(): string[] {
  const errors: string[] = [];
  const ids = new Set(people.map((p) => p.id));
  const pol = new Set(policies.map((p) => p.id));
  const liveSteps = events.filter((e) => e.status === 'live' && e.step).map((e) => e.step!);
  const steps = [...payroll.steps, ...liveSteps];
  const stepIds = new Set(steps.map((s) => s.id));
  const dash = /[–—]/;
  for (const s of steps) {
    if (!ids.has(s.from)) errors.push(`${s.id}: unknown from ${s.from}`);
    s.policyIds.forEach((p) => pol.has(p) || errors.push(`${s.id}: unknown policy ${p}`));
    (s.requires ?? []).forEach((r) => stepIds.has(r) || errors.push(`${s.id}: unknown requires ${r}`));
    if (s.skipIf && !stepIds.has(s.skipIf.step)) errors.push(`${s.id}: unknown skipIf step`);
    if (dash.test(s.context + s.title + s.hint)) errors.push(`${s.id}: contains an em or en dash`);
    for (const d of s.decisions) {
      if (!d.choices.some((c) => c.id === d.missedChoiceId)) errors.push(`${s.id}.${d.id}: missedChoiceId not found`);
      if (!d.choices.some((c) => c.correct)) errors.push(`${s.id}.${d.id}: no correct choice`);
      for (const c of d.choices) {
        if (c.errorCode && !academy.codes[c.errorCode]) errors.push(`${s.id}.${d.id}.${c.id}: error code ${c.errorCode} not in academy-map`);
        c.consequences?.forEach((q) => ids.has(q.speaker) || errors.push(`${s.id}.${d.id}.${c.id}: unknown speaker ${q.speaker}`));
        if (c.totalsAdjust && !ids.has(c.totalsAdjust.employeeId)) errors.push(`${s.id}.${d.id}.${c.id}: unknown totals employee`);
        if (dash.test(c.text + c.feedback + (c.consequences ?? []).map((q) => q.line + q.summary).join(''))) errors.push(`${s.id}.${d.id}.${c.id}: contains an em or en dash`);
      }
    }
  }
  payroll.noise.forEach((n) => ids.has(n.from) || errors.push(`noise ${n.id}: unknown from`));
  if (dash.test(payroll.briefing.join('') + JSON.stringify(tutorial) + JSON.stringify(policies))) errors.push('briefing, tutorial, or policies contain an em or en dash');
  // The mission's deadlines must be the real calendar row's deadlines.
  const pp = department.payPeriod;
  if (payroll.deadlines.transactions.date !== pp.hcmCutoff) errors.push('transactions deadline does not match the calendar HCM cutoff');
  if (at(payroll.deadlines.timecards) !== at(pp.timecardsDue)) errors.push('time card deadline does not match the calendar');
  if (at(payroll.start) < dateStart(pp.begin) || at(payroll.start) > at(pp.timecardsDue)) errors.push('mission start is outside the pay period');
  return errors;
}
