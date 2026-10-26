import type { DeltasT, MeterKey, Meters } from '../../content/schemas';

export const METERS: { key: MeterKey; label: string; short: string; lowerIsBetter: boolean }[] = [
  { key: 'payrollAccuracy', label: 'Payroll accuracy', short: 'Accuracy', lowerIsBetter: false },
  { key: 'complianceRisk', label: 'Compliance risk', short: 'Risk', lowerIsBetter: true },
  { key: 'employeeTrust', label: 'Employee trust', short: 'Trust', lowerIsBetter: false },
  { key: 'managerSatisfaction', label: 'Manager satisfaction', short: 'Managers', lowerIsBetter: false },
];

export const initialMeters = (): Meters => ({ payrollAccuracy: 100, complianceRisk: 0, employeeTrust: 70, managerSatisfaction: 70 });

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function applyDeltas(m: Meters, d: DeltasT): Meters {
  const next = { ...m };
  for (const [k, v] of Object.entries(d) as [MeterKey, number][]) next[k] = clamp(next[k] + v);
  return next;
}

export type Grade = 'A' | 'B' | 'C' | 'D';
export function grade(key: MeterKey, v: number): Grade {
  if (key === 'complianceRisk') return v <= 10 ? 'A' : v <= 20 ? 'B' : v <= 35 ? 'C' : 'D';
  if (key === 'payrollAccuracy') return v >= 90 ? 'A' : v >= 80 ? 'B' : v >= 70 ? 'C' : 'D';
  return v >= 75 ? 'A' : v >= 65 ? 'B' : v >= 55 ? 'C' : 'D';
}

export type Rating = 'Ready' | 'Almost ready' | 'Keep practicing';
export function rating(m: Meters): Rating {
  const g = METERS.map(({ key }) => grade(key, m[key]));
  if (g.every((x) => x === 'A')) return 'Ready';
  if (g.every((x) => x === 'A' || x === 'B') && grade('complianceRisk', m.complianceRisk) !== 'D') return 'Almost ready';
  return 'Keep practicing';
}

export const HINT_COST = -2;
/** A hint costs 2 points on the step's meter. For compliance risk, "cost" means risk goes up. */
export const hintDelta = (meter: MeterKey): DeltasT => ({ [meter]: meter === 'complianceRisk' ? -HINT_COST : HINT_COST });
