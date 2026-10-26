import type { DeltasT, MeterKey, Meters } from '../../content/schemas';

export const METERS: { key: MeterKey; label: string; short: string; lowerIsBetter: boolean }[] = [
  { key: 'accuracy', label: 'Transaction accuracy', short: 'Accuracy', lowerIsBetter: false },
  { key: 'complianceRisk', label: 'Compliance risk', short: 'Risk', lowerIsBetter: true },
  { key: 'employeeTrust', label: 'Employee trust', short: 'Trust', lowerIsBetter: false },
  { key: 'managerSatisfaction', label: 'Manager satisfaction', short: 'Managers', lowerIsBetter: false },
];

export const initialMeters = (): Meters => ({ accuracy: 100, complianceRisk: 0, employeeTrust: 70, managerSatisfaction: 70 });

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function applyDeltas(m: Meters, d: DeltasT): Meters {
  const next = { ...m };
  for (const [k, v] of Object.entries(d) as [MeterKey, number][]) next[k] = clamp(next[k] + v);
  return next;
}

export type Grade = 'A' | 'B' | 'C' | 'D';
/** Trust and manager satisfaction start at 70, which grades a C: a week that changed nothing earns no credit. */
export function grade(key: MeterKey, v: number): Grade {
  if (key === 'complianceRisk') return v <= 10 ? 'A' : v <= 20 ? 'B' : v <= 35 ? 'C' : 'D';
  if (key === 'accuracy') return v >= 90 ? 'A' : v >= 80 ? 'B' : v >= 70 ? 'C' : 'D';
  return v >= 85 ? 'A' : v >= 75 ? 'B' : v >= 60 ? 'C' : 'D';
}

export type Rating = 'Ready' | 'Almost ready' | 'Keep practicing';
/** Mastery thresholds, shown to the player in the debrief. [SME] Confirm the pass bar for Certification. */
export const READY = { area: 0.8, risk: 20, overall: 0.7, floor: 0.5 } as const;

/**
 * Readiness comes from mastery by area (what you know), with compliance risk as a gate (what you exposed).
 * Ready: every area at 80% or better and risk at 20 or lower. Almost ready: 70% overall and no area under 50%.
 */
export function rating(scores: { right: number; total: number }[], m: Meters): Rating {
  const played = scores.filter((s) => s.total > 0);
  const right = played.reduce((n, s) => n + s.right, 0);
  const total = played.reduce((n, s) => n + s.total, 0);
  if (!total) return 'Keep practicing';
  const pct = (s: { right: number; total: number }) => s.right / s.total;
  if (played.every((s) => pct(s) >= READY.area) && m.complianceRisk <= READY.risk) return 'Ready';
  if (right / total >= READY.overall && played.every((s) => pct(s) >= READY.floor)) return 'Almost ready';
  return 'Keep practicing';
}

export const HINT_COST = -2;
/** A hint costs 2 points on the step's meter. For compliance risk, "cost" means risk goes up. */
export const hintDelta = (meter: MeterKey): DeltasT => ({ [meter]: meter === 'complianceRisk' ? -HINT_COST : HINT_COST });
