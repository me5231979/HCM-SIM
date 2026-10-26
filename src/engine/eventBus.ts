import type { DeltasT } from '../../content/schemas';
import type { SimTime } from './clock';

export interface DecisionEvent {
  id: string;
  stepId: string;
  decisionId: string;
  choiceId: string;
  correct: boolean;
  errorCode?: string;
  deltas: DeltasT;
  simTime: SimTime;
  missed: boolean;
  value?: string;
}

export interface HintEvent { stepId: string; meter: keyof DeltasT & string; simTime: SimTime }

/** Pay day: a scheduled consequence lands on someone's check, budget, or record, and its cost counts. */
export interface ConsequenceEvent { causedBy: string; deltas: DeltasT; simTime: SimTime }

type Events = { decision: DecisionEvent; hint: HintEvent; consequence: ConsequenceEvent };
type Handler<K extends keyof Events> = (e: Events[K]) => void;

/** Typed pub/sub. Missions emit decisions; scoring and consequences subscribe. Missions never call scoring directly. */
export function createEventBus() {
  const handlers: { [K in keyof Events]: Set<Handler<K>> } = { decision: new Set(), hint: new Set(), consequence: new Set() };
  return {
    on<K extends keyof Events>(type: K, fn: Handler<K>) {
      handlers[type].add(fn);
      return () => { handlers[type].delete(fn); };
    },
    emit<K extends keyof Events>(type: K, e: Events[K]) {
      handlers[type].forEach((fn) => fn(e));
    },
  };
}
export type EventBus = ReturnType<typeof createEventBus>;
