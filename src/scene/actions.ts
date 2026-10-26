import { personById } from '../content';
import { useGame } from '../store/game';
import { personStatus } from '../status';

const PRIORITY = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function activateHotspot(id: string) {
  const s = useGame.getState();
  if (!s.game || !s.snap || s.phase !== 'playing') { s.setPanel({ focus: id }); return; }
  const open = s.snap.steps
    .filter((st) => st.location === id && s.game!.status(st) === 'open')
    .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.dueAt - b.dueAt);
  if (open[0]) s.openStep(open[0].id);
  else { s.setPanel({ focus: id }); s.announce('Nothing waiting here right now.'); }
}

export function activatePerson(personId: string) {
  const s = useGame.getState();
  const st = personStatus(personId, s.game, s.snap);
  if (st.stepId && s.phase === 'playing') { s.openStep(st.stepId); return; }
  const p = personById(personId);
  s.setPanel({ focus: p.desk.startsWith('office_') ? p.desk : p.desk === 'hcm_2' ? 'terminal' : 'overview' });
  s.announce(`${p.name}, ${p.title}.`);
}
