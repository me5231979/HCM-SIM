import { AcademyCourses, AcademyMap, Areas, Department, Employees, Events, Live, Mission, Policies, Tutorial, Voice, VoiceEnvelopes, type AreaId } from '../content/schemas';
import departmentJson from '../content/department.json';
import employeesJson from '../content/employees.json';
import policiesJson from '../content/policies.json';
import academyJson from '../content/academy-map.json';
import academyCoursesJson from '../content/academy-courses.json';
import areasJson from '../content/areas.json';
import eventsJson from '../content/events.json';
import tutorialJson from '../content/tutorial.json';
import weekJson from '../content/week.json';
import voiceJson from '../content/voice.json';
import liveJson from '../content/live.json';
import envelopesJson from '../content/voice-envelopes.json';
import { at, dateStart } from './engine/clock';

/** Every content file is parsed with Zod at load. A bad file fails loudly, never silently. */
export const department = Department.parse(departmentJson);
export const people = Employees.parse(employeesJson).people;
export const policies = Policies.parse(policiesJson).entries;
export const academy = AcademyMap.parse(academyJson);
export const academyCourses = AcademyCourses.parse(academyCoursesJson);
export const areas = Areas.parse(areasJson).areas;
export const events = Events.parse(eventsJson).events;
export const tutorial = Tutorial.parse(tutorialJson);
export const week = Mission.parse(weekJson);
export const voice = Voice.parse(voiceJson);
export const live = Live.parse(liveJson);
export const envelopes = VoiceEnvelopes.parse(envelopesJson);

/** The three payroll calendars, with sim times. Which one applies depends on the worker. */
export const calendars = department.calendars.map((c) => ({
  ...c,
  beginAt: dateStart(c.begin),
  endAt: dateStart(c.end),
  hcmCutoffAt: at(c.hcmCutoff),
  retroCutoffAt: c.retroCutoff ? at(c.retroCutoff) : undefined,
  timecardsDueAt: c.timecardsDue ? at(c.timecardsDue) : undefined,
  paycheckAt: c.paycheck ? dateStart(c.paycheck) : undefined,
}));
export const calendarFor = (id: 'weekly' | 'biweekly' | 'monthly') => calendars.find((c) => c.id === id)!;
/** Pay day: the biweekly paycheck, when the week's consequences show up. */
export const payday = calendarFor('biweekly').paycheckAt!;

export const personById = (id: string) => {
  const p = people.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown person ${id}`);
  return p;
};
export const policyById = (id: string) => policies.find((p) => p.id === id);
export const areaById = (id: AreaId) => areas.find((a) => a.id === id)!;

/** Where an Academy course lives: its page, or its topic tab while the course is still a draft. */
export function courseLink(slug: string) {
  const c = academyCourses.courses.find((x) => x.slug === slug);
  if (!c) return undefined;
  const tab = areaById(c.area).tab;
  return { ...c, url: c.parked ? `${academyCourses.home}#${tab}` : `${academyCourses.home}courses/${c.slug}/` };
}
/**
 * Author notes stay in content for reviewers (and CONTENT_TODO.md); learners see the text without them.
 * Three forms: an inline note "[SME: who approves]", a sentence that starts with "[SME]", and a bare "[SME]" tag.
 */
export const learnerText = (s: string) => s
  .replace(/\s*\[SME:[^\]]*\]/g, '')
  .replace(/(^|[.!?]\s+)\[SME\][^.]*\.?/g, '$1')
  .replace(/\s*\[SME\]/g, '')
  .trim();

/** The recording for a caption, matched on speaker and exact text. Lines without one are silent. */
const voiceIndex = new Map(voice.lines.map((l) => [`${l.speaker}|${l.text}`, l]));
export const voiceLine = (speaker: string, text: string) => voiceIndex.get(`${speaker}|${text}`);
/** The live conversation offered for a decision, if any. */
export const liveFor = (stepId: string, decisionId: string) => live.conversations.find((c) => c.stepId === stepId && c.decisionId === decisionId);

/** Every request in the week, from the week file and live events. */
export const allSteps = () => [...week.steps, ...events.filter((e) => e.status === 'live' && e.step).map((e) => e.step!)];

/** Cross-file checks Zod can't express: every reference must point at something real. */
export function crossCheck(): string[] {
  const errors: string[] = [];
  const ids = new Set(people.map((p) => p.id));
  const pol = new Set(policies.map((p) => p.id));
  const slugs = new Set(academyCourses.courses.map((c) => c.slug));
  const steps = allSteps();
  const stepIds = new Set(steps.map((s) => s.id));
  if (stepIds.size !== steps.length) errors.push('duplicate step ids');
  const dash = /[–—]/;
  for (const s of steps) {
    if (!ids.has(s.from)) errors.push(`${s.id}: unknown from ${s.from}`);
    if (s.opener && !ids.has(s.opener.speaker)) errors.push(`${s.id}: unknown opener speaker ${s.opener.speaker}`);
    s.policyIds.forEach((p) => pol.has(p) || errors.push(`${s.id}: unknown policy ${p}`));
    (s.requires ?? []).forEach((r) => stepIds.has(r) || errors.push(`${s.id}: unknown requires ${r}`));
    if (s.skipIf && !stepIds.has(s.skipIf.step)) errors.push(`${s.id}: unknown skipIf step`);
    if (s.quick && s.decisions.length !== 1) errors.push(`${s.id}: a quick question has exactly one decision`);
    if ((s.type === 'form' || s.grid || s.review) && !s.screen) errors.push(`${s.id}: a practice screen needs the system it stands in for (screen)`);
    if (dash.test(s.context + s.title + s.hint + (s.opener?.line ?? ''))) errors.push(`${s.id}: contains an em or en dash`);
    for (const d of s.decisions) {
      if (!d.choices.some((c) => c.id === d.missedChoiceId)) errors.push(`${s.id}.${d.id}: missedChoiceId not found`);
      if (!d.choices.some((c) => c.correct)) errors.push(`${s.id}.${d.id}: no correct choice`);
      d.courses.forEach((c) => slugs.has(c) || errors.push(`${s.id}.${d.id}: unknown course ${c}`));
      if (d.spoken && !ids.has(d.spoken.speaker)) errors.push(`${s.id}.${d.id}: unknown spoken speaker`);
      for (const c of d.choices) {
        if (c.errorCode && !academy.codes[c.errorCode]) errors.push(`${s.id}.${d.id}.${c.id}: error code ${c.errorCode} not in academy-map`);
        c.consequences?.forEach((q) => ids.has(q.speaker) || errors.push(`${s.id}.${d.id}.${c.id}: unknown speaker ${q.speaker}`));
        if (c.totalsAdjust && !ids.has(c.totalsAdjust.employeeId)) errors.push(`${s.id}.${d.id}.${c.id}: unknown totals employee`);
        if (dash.test(c.text + c.feedback + (c.consequences ?? []).map((q) => q.line + q.summary).join(''))) errors.push(`${s.id}.${d.id}.${c.id}: contains an em or en dash`);
      }
    }
  }
  week.noise.forEach((n) => ids.has(n.from) || errors.push(`noise ${n.id}: unknown from`));
  if (dash.test(week.briefing.join('') + JSON.stringify(tutorial) + JSON.stringify(policies) + JSON.stringify(areas) + JSON.stringify(department))) errors.push('briefing, tutorial, policies, areas, or calendars contain an em or en dash');
  // The pay period deadlines must be the biweekly calendar's.
  const bw = calendarFor('biweekly');
  const dl = (k: string) => week.deadlines.find((d) => d.key === k);
  if (!dl('transactions') || at(dl('transactions')!) !== bw.hcmCutoffAt) errors.push('transactions deadline does not match the biweekly HCM transaction cutoff');
  if (!dl('timecards') || at(dl('timecards')!) !== bw.timecardsDueAt) errors.push('time card deadline does not match the biweekly calendar');
  if (at(week.start) < bw.beginAt || at(week.start) > bw.timecardsDueAt!) errors.push('the week starts outside the pay period');
  // Voice: every line has a cast voice and a real speaker; every live conversation points at a real decision.
  for (const l of voice.lines) {
    if (!voice.cast[l.speaker]) errors.push(`voice ${l.id}: no cast voice for ${l.speaker}`);
    if (!ids.has(l.speaker)) errors.push(`voice ${l.id}: unknown speaker ${l.speaker}`);
  }
  for (const c of live.conversations) {
    const step = steps.find((s) => s.id === c.stepId);
    const d = step?.decisions.find((x) => x.id === c.decisionId);
    if (!d) { errors.push(`live ${c.id}: unknown decision ${c.stepId}.${c.decisionId}`); continue; }
    if (!ids.has(c.speaker)) errors.push(`live ${c.id}: unknown speaker ${c.speaker}`);
    Object.values(c.outcomes).forEach((choice) => d.choices.some((x) => x.id === choice) || errors.push(`live ${c.id}: unknown choice ${choice}`));
  }
  if (dash.test(JSON.stringify(voice) + JSON.stringify(live) + JSON.stringify(week.payday) + people.map((p) => p.greeting ?? '').join(''))) errors.push('voice, live, pay day, or greetings contain an em or en dash');
  return errors;
}

/** Academy courses no decision practices yet. The week should leave none out. */
export function uncovered(): string[] {
  const used = new Set(allSteps().flatMap((s) => s.decisions.flatMap((d) => d.courses)));
  return academyCourses.courses.filter((c) => !used.has(c.slug)).map((c) => c.slug);
}
