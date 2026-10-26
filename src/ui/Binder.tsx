import { useState } from 'react';
import { learnerText, policies } from '../content';
import { useGame } from '../store/game';
import { Dialog } from './common';

export function Binder() {
  const [q, setQ] = useState('');
  const list = policies.filter((p) => (p.title + p.body).toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog labelId="binder-h" onClose={() => useGame.getState().setPanel({ binderOpen: false })} className="modal modal--wide liquid-glass-strong">
      <p className="eyebrow">Policy Binder</p>
      <h2 id="binder-h">Search the <em>binder</em>.</h2>
      <label className="search"><span className="sr-only">Search policies</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: overtime, retro, cutoff" data-autofocus /></label>
      <p className="fine" role="status">{list.length} of {policies.length} entries. Entries marked Being confirmed have a detail still being checked with HCM superusers.</p>
      <div className="binder-list">
        {list.map((p) => (
          <article key={p.id} className="policy">
            <h3>{p.title}{p.sme && <span className="tag tag--sme">Being confirmed</span>}</h3>
            <p>{learnerText(p.body)}</p>
            <p className="fine">Source: {p.source}</p>
          </article>
        ))}
      </div>
    </Dialog>
  );
}
