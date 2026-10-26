import { useState } from 'react';
import { payroll, personById } from '../content';
import { clockLabel, weekdayLabel } from '../engine/clock';
import { inboxItems, useGame } from '../store/game';
import { Avatar, Dialog, priorityLabel } from './common';
import { Icon } from './icons';

type Sort = 'received' | 'due' | 'priority';
const PR = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export function InboxList({ compact = false }: { compact?: boolean }) {
  const s = useGame();
  const [sort, setSort] = useState<Sort>('received');
  const items = inboxItems(s).sort((a, b) =>
    sort === 'received' ? b.receivedAt - a.receivedAt : sort === 'due' ? (a.dueAt ?? 1e9) - (b.dueAt ?? 1e9) : PR[a.priority] - PR[b.priority]);
  return (
    <div className="inbox">
      <div className="inbox-sort" role="group" aria-label="Sort inbox">
        {(['received', 'due', 'priority'] as const).map((k) => (
          <button key={k} className={`chip-btn ${sort === k ? 'is-on' : ''}`} aria-pressed={sort === k} onClick={() => setSort(k)}>{k === 'received' ? 'Newest' : k === 'due' ? 'Due soonest' : 'Priority'}</button>
        ))}
      </div>
      {items.length === 0 && <p className="muted">Nothing yet.</p>}
      <ul className="inbox-list">
        {items.map((it) => {
          const p = personById(it.from);
          const done = it.status === 'done' || it.status === 'missed' || it.status === 'skipped';
          return (
            <li key={it.id}>
              <button className={`inbox-item ${it.unread ? 'is-unread' : ''} ${done ? 'is-done' : ''} pr-${it.priority}`} onClick={() => (it.kind === 'task' ? s.openStep(it.id) : s.openNoise(it.id))}>
                {!compact && <Avatar id={it.from} size={34} />}
                <span className="ii-main">
                  <span className="ii-subject">{it.unread && <span className="ii-dot" aria-hidden="true" />}{it.subject}{it.unread && <span className="sr-only"> (unread)</span>}</span>
                  <span className="ii-meta">{p.name} · {weekdayLabel(it.receivedAt)} {clockLabel(it.receivedAt)}{it.dueAt && !done ? ` · due ${weekdayLabel(it.dueAt)} ${clockLabel(it.dueAt)}` : ''}</span>
                </span>
                <span className={`ii-status st-${it.kind === 'noise' ? 'fyi' : it.status}`}>
                  {it.kind === 'noise' ? 'FYI' : it.status === 'done' ? <><Icon.check />Done</> : it.status === 'missed' ? <><Icon.cross />Missed</> : it.status === 'locked' ? <><Icon.clock />Waiting</> : it.status === 'skipped' ? 'Not needed' : <>{it.priority === 'urgent' && <Icon.alert />}{priorityLabel(it.priority)}<span className="sr-only"> priority</span></>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Inbox() {
  const close = () => useGame.getState().setPanel({ inboxOpen: false });
  return (
    <Dialog labelId="inbox-h" onClose={close} className="drawer drawer--left liquid-glass-strong" modal={false}>
      <p className="eyebrow">Inbox</p>
      <h2 id="inbox-h">Requests and messages</h2>
      <InboxList />
    </Dialog>
  );
}

export function NoiseReader() {
  const id = useGame((s) => s.openNoiseId);
  const n = payroll.noise.find((x) => x.id === id);
  if (!n) return null;
  const p = personById(n.from);
  return (
    <Dialog labelId="noise-h" onClose={() => useGame.getState().openNoise(null)} className="modal liquid-glass-strong">
      <p className="eyebrow">FYI · from {p.name}</p>
      <h2 id="noise-h">{n.subject}</h2>
      <p>{n.body}</p>
      <button className="btn btn--gold" onClick={() => useGame.getState().openNoise(null)}>Got it</button>
    </Dialog>
  );
}
