import { z } from 'zod';

export const Meter = z.enum(['payrollAccuracy', 'complianceRisk', 'employeeTrust', 'managerSatisfaction']);
export const Deltas = z.partialRecord(Meter, z.number());
export const SimAt = z.object({ day: z.number().int().min(1).max(10), at: z.string().regex(/^\d{2}:\d{2}$/) });

export const PreviewAdjust = z.object({
  employeeId: z.string(),
  regHours: z.number().optional(),
  otHours: z.number().optional(),
  ptoHours: z.number().optional(),
  rate: z.number().optional(),
  retro: z.number().optional(),
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
  previewAdjust: PreviewAdjust.optional(),
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

export const PreviewRow = z.object({
  employeeId: z.string(),
  regHours: z.number(),
  otHours: z.number(),
  ptoHours: z.number(),
  anomaly: z.boolean().optional(),
  note: z.string().optional(),
});

export const StepType = z.enum(['choice', 'form', 'grid', 'preview', 'approve']);
export const Location = z.enum(['terminal', 'board', 'office_a', 'office_b', 'office_c', 'reception', 'break']);

const stepFields = {
  id: z.string(),
  type: StepType,
  title: z.string(),
  from: z.string(),
  location: Location,
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  requires: z.array(z.string()).optional(),
  skipIf: z.object({ step: z.string(), decision: z.string(), choice: z.string() }).optional(),
  context: z.string(),
  attachment: Attachment.optional(),
  policyIds: z.array(z.string()),
  hint: z.string(),
  hintMeter: Meter,
  grid: z.object({ days: z.array(z.string()), rows: z.array(GridRow) }).optional(),
  preview: z.object({ rows: z.array(PreviewRow) }).optional(),
  decisions: z.array(Decision).min(1),
};

export const Step = z.object({ ...stepFields, receivedAt: SimAt, dueAt: SimAt });
export const EventStep = z.object({ ...stepFields, dueMinutes: z.number().int().positive() });

export const Mission = z.object({
  id: z.string(),
  title: z.string(),
  tagline: z.string(),
  learningObjectives: z.array(z.string()).min(1),
  start: SimAt,
  deadlines: z.object({ managerApproval: SimAt.extend({ sme: z.boolean() }), cutoff: SimAt.extend({ sme: z.boolean() }) }),
  briefing: z.array(z.string()).min(1),
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
  role: z.enum(['director', 'manager', 'coach', 'employee']),
  type: z.enum(['exempt', 'nonexempt']),
  payBasis: z.enum(['hourly', 'salary']),
  payRate: z.number().positive(),
  managerId: z.string().nullable(),
  desk: z.string(),
  outfit: z.enum(['black', 'gold', 'cream']),
});
export const Employees = z.object({ people: z.array(Person).min(1) });

export const Department = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  director: z.string(),
  payPeriod: z.object({
    label: z.string(),
    frequency: z.enum(['biweekly', 'monthly']),
    frequencyNote: z.string(),
    days: z.array(z.string()).length(10),
    payDate: z.string(),
    payDateNote: z.string(),
  }),
});

export const Policies = z.object({
  entries: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), source: z.string(), sme: z.boolean() })),
});

export const AcademyMap = z.object({
  base: z.string().url(),
  codes: z.record(z.string(), z.object({ course: z.string(), title: z.string() })),
});

export type MeterKey = z.infer<typeof Meter>;
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
export type PreviewAdjustT = z.infer<typeof PreviewAdjust>;
export type LocationT = z.infer<typeof Location>;
