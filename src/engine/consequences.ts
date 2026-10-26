import type { ConsequenceT } from '../../content/schemas';

export interface ScheduledConsequence extends ConsequenceT {
  causedBy: string; // DecisionEvent id
  stepId: string;
  decisionId: string;
  choiceId: string;
}

/** Delayed effects queue. Decisions schedule; pay day resolves. The debrief traces each back to its cause. */
export function createConsequenceQueue() {
  let items: ScheduledConsequence[] = [];
  return {
    schedule(c: ScheduledConsequence) { items = [...items, c]; },
    cancelFor(stepId: string, decisionId: string) { items = items.filter((c) => !(c.stepId === stepId && c.decisionId === decisionId)); },
    due(trigger: ConsequenceT['at']) { return items.filter((c) => c.at === trigger); },
    all() { return items; },
    reset() { items = []; },
  };
}
export type ConsequenceQueue = ReturnType<typeof createConsequenceQueue>;
