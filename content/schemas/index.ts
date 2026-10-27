import { z } from 'zod';

export const Meter = z.enum(['accuracy', 'complianceRisk', 'employeeTrust', 'managerSatisfaction']);
/** The eight HCM Academy topics. Every request belongs to one; every decision is scored under one. */
export const Area = z.enum(['start', 'hiring', 'payroll', 'assignments', 'leave', 'costing', 'students', 'records']);
export const Deltas = z.partialRecord(Meter, z.number());
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const SimAt = z.object({ date: IsoDate, at: z.string().regex(/^\d{2}:\d{2}$/) });

/** A line a character says out loud. Captions show the line; content/voice.json holds the recording. */
export const Spoken = z.object({ speaker: z.string(), line: z.string() });

/** How a decision changes the time card totals the HCM reviews later. */
export const TotalsAdjust = z.object({
  employeeId: z.string(),
  week1: z.number().optional(),
  week2: z.number().optional(),
  clearsAnomaly: z.boolean().optional(),
  note: z.string(),
});

export const Consequence = z.object({
  at: z.literal('payday'),
  speaker: z.string(),
  tone: z.enum(['positive', 'negative']),
  line: z.string(),
  summary: z.string(),
  deltas: Deltas,
  task: z.string().optional(),
});

export const Choice = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean(),
  hidden: z.boolean().optional(),
  errorCode: z.string().optional(),
  deltas: Deltas,
  timeCost: z.number().int().min(0),
  feedback: z.string().min(20),
  totalsAdjust: TotalsAdjust.optional(),
  consequences: z.array(Consequence).optional(),
});

export const Decision = z.object({
  id: z.string(),
  label: z.string().optional(),
  prompt: z.string(),
  kind: z.enum(['choice', 'number']).optional(),
  prefix: z.string().optional(),
  expected: z.number().optional(),
  missedChoiceId: z.string(),
  showIf: z.object({ decision: z.string(), choice: z.string() }).optional(),
  /** What a character says when this decision comes up. */
  spoken: Spoken.optional(),
  /** HCM Academy course slugs this decision practices (content/academy-courses.json). Drives coverage and the debrief. */
  courses: z.array(z.string()).min(1),
  /** Scored under this area instead of the step's. */
  area: Area.optional(),
  choices: z.array(Choice).min(2).max(4),
});

export const Attachment = z.object({ kind: z.enum(['calendar', 'letter', 'email']), title: z.string(), lines: z.array(z.string()) });

export const GridRow = z.object({
  employeeId: z.string(),
  cells: z.array(z.string()),
  total: z.string(),
  exceptionDecision: z.string().optional(),
  exceptionCell: z.number().int().optional(),
  exceptionLabel: z.string().optional(),
  note: z.string().optional(),
});

export const ApprovalState = z.enum(['Open', 'Submitted', 'Approved (PayPrep Ready)']);
export const ReviewRow = z.object({
  employeeId: z.string(),
  week1: z.number(),
  week2: z.number(),
  approval: ApprovalState,
  anomaly: z.boolean().optional(),
  note: z.string().optional(),
});

export const StepType = z.enum(['choice', 'form', 'grid', 'review']);
export const Location = z.enum(['terminal', 'board', 'office_a', 'office_b', 'office_c', 'reception', 'break']);

const stepFields = {
  id: z.string(),
  area: Area,
  /** A quick question from a colleague: one decision, a short chat message, due a few hours later. */
  quick: z.boolean().optional(),
  type: StepType,
  /** The real system a practice screen stands in for (Oracle, the time card system). Forms, grids, and reviews have one. */
  screen: z.string().optional(),
  title: z.string(),
  from: z.string(),
  location: Location,
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requires: z.array(z.string()).optional(),
  skipIf: z.object({ step: z.string(), decision: z.string(), choice: z.string() }).optional(),
  context: z.string(),
  /** What the requester says when you first open the request. */
  opener: Spoken.optional(),
  attachment: Attachment.optional(),
  policyIds: z.array(z.string()),
  hint: z.string(),
  hintMeter: Meter,
  grid: z.object({ caption: z.string(), days: z.array(z.string()), rows: z.array(GridRow) }).optional(),
  review: z.object({ caption: z.string(), rows: z.array(ReviewRow) }).optional(),
  decisions: z.array(Decision).min(1),
};

export const Step = z.object({ ...stepFields, receivedAt: SimAt, dueAt: SimAt });
export const EventStep = z.object({ ...stepFields, dueMinutes: z.number().int().positive() });

/** hud: shown as a countdown in the HUD. The latest deadline ends play (time cards due; payroll signs off). */
const Deadline = SimAt.extend({ key: z.string(), label: z.string(), short: z.string(), sme: z.boolean(), hud: z.boolean() });

export const Mission = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  start: SimAt,
  deadlines: z.array(Deadline).min(1),
  briefing: z.array(z.string()).min(1),
  /** The mentor's closing line on pay day. */
  payday: z.object({ clean: z.string(), problems: z.string() }),
  noise: z.array(z.object({ id: z.string(), from: z.string(), subject: z.string(), body: z.string(), at: SimAt })),
  steps: z.array(Step).min(1),
});

export const GameEvent = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['live', 'planned']),
  mission: z.string(),
  sme: z.boolean().optional(),
  window: z.object({ from: SimAt, to: SimAt }).optional(),
  step: EventStep.optional(),
});
export const Events = z.object({ events: z.array(GameEvent) });

export const Person = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  /** partner: central HR, payroll, and others who reach you by email or phone; they have no desk here. */
  role: z.enum(['director', 'manager', 'coach', 'employee', 'partner']),
  type: z.enum(['exempt', 'nonexempt']),
  payBasis: z.enum(['hourly', 'salary']),
  payRate: z.number().positive(),
  managerId: z.string().nullable(),
  desk: z.string(),
  outfit: z.enum(['black', 'gold', 'cream']),
  /** Which payroll calendar pays this person. Exempt staff are monthly; non-exempt staff are weekly or biweekly. */
  payFrequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  /** First day in the office (a new hire). Before this, they aren't at their desk. */
  arrives: SimAt.optional(),
  /** Said when you click someone with nothing waiting. */
  greeting: z.string().optional(),
  /** Portrait under public/, such as avatars/mgr_ortiz.webp. Without one, the avatar shows initials. */
  photo: z.string().optional(),
});
export const Employees = z.object({ people: z.array(Person).min(1) });

export const Department = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  director: z.string(),
  /** The three payroll calendars this week, from the published 2026 payroll calendar. Which one applies depends on the worker. */
  calendars: z.array(z.object({
    id: z.enum(['weekly', 'biweekly', 'monthly']),
    label: z.string(),
    who: z.string(),
    period: z.string(),
    begin: IsoDate,
    end: IsoDate,
    hcmCutoff: SimAt,
    retroCutoff: SimAt.optional(),
    timecardsDue: SimAt.optional(),
    paycheck: IsoDate.optional(),
    note: z.string(),
    source: z.string(),
    sme: z.boolean(),
  })).length(3),
});

/** The eight topics, in HCM Academy order, with what the week practices in each. */
export const Areas = z.object({
  areas: z.array(z.object({ id: Area, number: z.string(), label: z.string(), short: z.string(), tab: z.string(), practice: z.string() })).length(8),
});

/** Every HCM Academy course. parked: a draft with no published page yet (links go to the topic instead). */
export const AcademyCourses = z.object({
  home: z.string().url(),
  courses: z.array(z.object({ slug: z.string(), title: z.string(), area: Area, parked: z.boolean() })).min(1),
});

export const Policies = z.object({
  entries: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), source: z.string(), sme: z.boolean() })),
});

export const AcademyMap = z.object({
  base: z.string().url(),
  codes: z.record(z.string(), z.object({ course: z.string(), title: z.string() })),
});

/** Guided tour, symbol and control legends, and the unscored practice request. */
const LegendItem = z.object({ key: z.string(), label: z.string(), text: z.string() });
export const Tutorial = z.object({
  steps: z.array(z.object({
    id: z.string(),
    target: z.string().nullable(),
    title: z.string(),
    body: z.string(),
    legend: z.enum(['meters', 'symbols', 'controls']).optional(),
    practice: z.boolean().optional(),
    only3d: z.boolean().optional(),
  })).min(1),
  legends: z.object({ meters: z.array(LegendItem), symbols: z.array(LegendItem), controls: z.array(LegendItem) }),
  practice: z.object({ title: z.string(), from: z.string(), context: z.string(), intro: z.string(), hint: z.string(), decision: Decision }),
});

/** Generated by tools/voice-manifest.mjs: one ElevenLabs voice per character and every recorded line. */
export const Voice = z.object({
  cast: z.record(z.string(), z.object({ voiceId: z.string(), voiceName: z.string() })),
  lines: z.array(z.object({
    id: z.string().regex(/^[a-z0-9_.]+$/),
    speaker: z.string(),
    text: z.string(),
    /** How the line is spoken when it differs from the caption, for example numbers as words. */
    say: z.string().optional(),
  })).min(1),
});

/** Generated by tools/voice-envelopes.mjs: loudness per line, one digit (0 to 9) per step at `rate` steps a second. */
export const VoiceEnvelopes = z.object({ rate: z.number().int().positive(), lines: z.record(z.string(), z.string().regex(/^[0-9]*$/)) });

/** Opt-in live conversations with an ElevenLabs agent. Each one can settle a decision, which the player confirms. */
export const Live = z.object({
  privacy: z.object({ provider: z.string(), points: z.array(z.string()).min(1) }),
  /** The practice card shown with the decision. {first} in a step becomes the character's first name. */
  offer: z.object({ eyebrow: z.string(), headline: z.string(), italic: z.string(), steps: z.array(z.string()).length(3) }),
  conversations: z.array(z.object({
    id: z.string(),
    agentId: z.string().regex(/^agent_[a-z0-9]+$/),
    speaker: z.string(),
    stepId: z.string(),
    decisionId: z.string(),
    title: z.string(),
    pitch: z.string(),
    /** The situation, on the practice card: what's happening, who you're talking to, and what to settle. */
    scene: z.string(),
    maxSeconds: z.number().int().positive(),
    /** Outcome reported by the agent's record_outcome tool, mapped to a choice id. Anything else means unresolved. */
    outcomes: z.record(z.string(), z.string()),
    /** Coaching notes keyed on the other fields record_outcome reports. */
    coaching: z.array(z.object({
      field: z.string(),
      is: z.union([z.boolean(), z.string()]),
      good: z.boolean(),
      text: z.string(),
      deltas: Deltas.optional(),
    })),
  })),
});

export type MeterKey = z.infer<typeof Meter>;
export type AreaId = z.infer<typeof Area>;
export type Meters = Record<MeterKey, number>;
export type DeltasT = z.infer<typeof Deltas>;
export type SimAtT = z.infer<typeof SimAt>;
export type ChoiceT = z.infer<typeof Choice>;
export type DecisionT = z.infer<typeof Decision>;
export type StepT = z.infer<typeof Step>;
export type EventStepT = z.infer<typeof EventStep>;
export type MissionT = z.infer<typeof Mission>;
export type GameEventT = z.infer<typeof GameEvent>;
export type PersonT = z.infer<typeof Person>;
export type PolicyT = z.infer<typeof Policies>['entries'][number];
export type ConsequenceT = z.infer<typeof Consequence>;
export type TotalsAdjustT = z.infer<typeof TotalsAdjust>;
export type LocationT = z.infer<typeof Location>;
export type ApprovalStateT = z.infer<typeof ApprovalState>;
export type TutorialT = z.infer<typeof Tutorial>;
export type SpokenT = z.infer<typeof Spoken>;
export type VoiceT = z.infer<typeof Voice>;
export type VoiceLineT = VoiceT['lines'][number];
export type LiveT = z.infer<typeof Live>;
export type LiveConversationT = LiveT['conversations'][number];
