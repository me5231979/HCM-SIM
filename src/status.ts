import type { Game, Snapshot } from './engine/game';

export type PersonStatusKind = 'issue' | 'talk' | 'done' | 'none';
export interface PersonStatus { kind: PersonStatusKind; label: string; stepId?: string }

/** What each person needs from you right now. Drives the 3D icons and the 2D list view alike. */
export function personStatus(id: string, game: Game | null, snap: Snapshot | null): PersonStatus {
  if (!game || !snap) return { kind: 'none', label: '' };
  const open = snap.steps.filter((s) => game.status(s) === 'open');
  const req = open.find((s) => s.from === id);
  if (req) return { kind: 'talk', label: 'Wants to talk', stepId: req.id };
  for (const s of open) {
    const res = snap.resolutions[s.id] ?? {};
    const row = s.grid?.rows.find((r) => r.employeeId === id && r.exceptionDecision && !res[r.exceptionDecision]);
    if (row) return { kind: 'issue', label: row.exceptionLabel ?? 'Timecard issue', stepId: s.id };
    const odd = s.review?.rows.find((r) => r.employeeId === id && r.anomaly);
    if (odd && !res.flag) return { kind: 'issue', label: 'Time card total looks wrong', stepId: s.id };
  }
  const touched = snap.steps.some((s) => {
    const res = snap.resolutions[s.id] ?? {};
    return s.grid?.rows.some((r) => {
      const hit = r.employeeId === id && r.exceptionDecision ? res[r.exceptionDecision] : undefined;
      if (!hit) return false;
      const d = s.decisions.find((x) => x.id === r.exceptionDecision);
      return !hit.missed && !!d?.choices.find((c) => c.id === hit.choiceId)?.correct;
    });
  });
  return touched ? { kind: 'done', label: 'Resolved' } : { kind: 'none', label: '' };
}
