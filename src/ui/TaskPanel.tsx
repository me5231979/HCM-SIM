import { useEffect, useMemo, useRef, useState } from 'react';
import { courseFor, people, personById, policyById } from '../content';
import { clockLabel, dateLabel } from '../engine/clock';
import { computeTotals, isDecisionActive, type ActiveStep, type Resolution } from '../engine/game';
import { createRng } from '../engine/rng';
import { METERS } from '../engine/scoring';
import { useGame } from '../store/game';
import type { ChoiceT, DecisionT } from '../../content/schemas';
import { Avatar, Dialog, priorityLabel } from './common';
import { Icon } from './icons';
import { voicePlayer } from '../audio/voice';
import { Quote, SpeakingAvatar, VoiceButton } from './Voice';

const hrs = (n: number) => n.toFixed(1);

/** Seeded shuffle so the right answer isn't always in the same spot, but a shared seed shows the same order. */
function shuffled(seed: string, d: DecisionT): ChoiceT[] {
  const r = createRng(`${seed}:${d.id}`);
  const list = d.choices.filter((c) => !c.hidden);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
const useOrder = (seed: string, d: DecisionT) => useMemo(() => shuffled(seed, d), [seed, d]);

function Feedback({ d, res }: { d: DecisionT; res: Resolution }) {
  const mode = useGame((s) => s.settings.mode);
  const c = d.choices.find((x) => x.id === res.choiceId)!;
  if (mode === 'certification') return <p className="feedback is-neutral" role="status"><Icon.check /> Recorded at {clockLabel(res.at)}. You'll see how it played out on pay day.</p>;
  const course = c.errorCode ? courseFor(c.errorCode) : undefined;
  const ok = c.correct && !res.missed;
  return (
    <div className={`feedback ${ok ? 'is-good' : 'is-bad'}`} role="status">
      <p className="fb-head">{ok ? <><Icon.check /> Good call</> : res.missed ? <><Icon.clock /> Missed: the deadline passed</> : <><Icon.cross /> Not the best move</>}</p>
      {!ok && !res.missed && <p className="fb-choice">You chose: {res.value ? `$${res.value}` : c.text}</p>}
      <p>{c.feedback}</p>
      {course && <a className="fb-course" href={course.url} target="_blank" rel="noreferrer">HCM Academy: {course.title} <Icon.external /><span className="sr-only"> (opens in a new tab)</span></a>}
    </div>
  );
}

function ChoiceDecision({ step, d, seed, disabled }: { step: ActiveStep; d: DecisionT; seed: string; disabled: boolean }) {
  const res = useGame((s) => s.snap?.resolutions[step.id]?.[d.id]);
  const decide = useGame((s) => s.decide);
  const order = useOrder(seed, d);
  const [pick, setPick] = useState<string>('');
  if (res) return <div className="decision is-done"><p className="legend">{d.label ? `${d.label}: ` : ''}{d.prompt}</p><Feedback d={d} res={res} /></div>;
  return (
    <form className="decision" onSubmit={(e) => { e.preventDefault(); if (pick) decide(step.id, d.id, pick); }}>
      {d.spoken && <Quote speaker={d.spoken.speaker} text={d.spoken.line} className="quote--decision" />}
      <fieldset>
        <legend className="legend">{d.label && <span className="legend-label">{d.label}</span>}{d.prompt}</legend>
        <div className="options">
          {order.map((c) => (
            <label key={c.id} className={`option ${pick === c.id ? 'is-on' : ''}`}>
              <input type="radio" name={`${step.id}-${d.id}`} value={c.id} checked={pick === c.id} onChange={() => setPick(c.id)} disabled={disabled} />
              <span>{c.text}</span>
              {c.timeCost >= 15 && <span className="opt-time" aria-label={`takes about ${c.timeCost} minutes`}><Icon.clock />{c.timeCost >= 60 ? `${c.timeCost / 60}h` : `${c.timeCost}m`}</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn--gold" type="submit" disabled={!pick || disabled}>Decide</button>
    </form>
  );
}

function FormStep({ step, seed, disabled }: { step: ActiveStep; seed: string; disabled: boolean }) {
  const resolutions = useGame((s) => s.snap?.resolutions[step.id]);
  const decide = useGame((s) => s.decide);
  const [vals, setVals] = useState<Record<string, string>>({});
  const decisions = step.decisions.filter((d) => isDecisionActive(d, resolutions));
  const done = decisions.every((d) => resolutions?.[d.id]);
  const orders = decisions.map((d) => ({ d, order: shuffled(seed, d) }));
  if (done) return <div className="decisions">{decisions.map((d) => <div key={d.id} className="decision is-done"><p className="legend">{d.label}</p><Feedback d={d} res={resolutions![d.id]} /></div>)}</div>;
  const ready = decisions.every((d) => (vals[d.id] ?? '').trim() !== '');
  return (
    <form className="sim-form" onSubmit={(e) => { e.preventDefault(); if (ready) decisions.forEach((d) => decide(step.id, d.id, vals[d.id])); }}>
      <p className="sim-brand" aria-hidden="true">CampusHR <span>(Sim)</span></p>
      {orders.map(({ d, order }) => (
        <div className="field" key={d.id}>
          <label htmlFor={`f-${step.id}-${d.id}`}>{d.prompt}</label>
          {d.kind === 'number' ? (
            <span className="input-prefix">{d.prefix && <span aria-hidden="true">{d.prefix}</span>}
              <input id={`f-${step.id}-${d.id}`} inputMode="decimal" autoComplete="off" value={vals[d.id] ?? ''} disabled={disabled} onChange={(e) => setVals({ ...vals, [d.id]: e.target.value })} />
            </span>
          ) : (
            <select id={`f-${step.id}-${d.id}`} value={vals[d.id] ?? ''} disabled={disabled} onChange={(e) => setVals({ ...vals, [d.id]: e.target.value })}>
              <option value="">Select</option>
              {order.map((c) => <option key={c.id} value={c.id}>{c.text}</option>)}
            </select>
          )}
        </div>
      ))}
      <button className="btn btn--gold" type="submit" disabled={!ready || disabled}>{step.id === 'reminder' ? 'Send reminder' : 'Save and submit'}</button>
    </form>
  );
}

function GridStep({ step, seed, disabled }: { step: ActiveStep; seed: string; disabled: boolean }) {
  const res = useGame((s) => s.snap?.resolutions[step.id]);
  const g = step.grid!;
  return (
    <>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={g.caption}>
        <table className="grid">
          <caption><span className="sim-brand">CampusHR <span>(Sim)</span></span> {g.caption}</caption>
          <thead><tr><th scope="col">Employee</th>{g.days.map((d) => <th key={d} scope="col">{d}</th>)}<th scope="col">Total</th><th scope="col" className="ex-col">Exception</th></tr></thead>
          <tbody>
            {g.rows.map((r) => {
              const p = personById(r.employeeId);
              const resolved = r.exceptionDecision ? res?.[r.exceptionDecision] : undefined;
              return (
                <tr key={r.employeeId} className={r.exceptionDecision && !resolved ? 'has-ex' : ''}>
                  <th scope="row">{p.name}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className={r.exceptionCell === i && !resolved ? 'ex-cell' : ''}>
                      {r.exceptionCell === i && !resolved && <Icon.alert />}{c || <span className="muted">Not entered</span>}
                    </td>
                  ))}
                  <td>{r.total}</td>
                  <td className="ex-col">{r.exceptionDecision ? (resolved ? <span className="st-done"><Icon.check /> Resolved</span> : <span className="st-ex"><Icon.alert /> {r.exceptionLabel}</span>) : (r.note ?? <span className="muted">None</span>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="decisions">{step.decisions.map((d) => <ChoiceDecision key={d.id} step={step} d={d} seed={seed} disabled={disabled} />)}</div>
    </>
  );
}

/** Final time card check: totals per employee with Approval State, reflecting earlier decisions. */
function ReviewStep({ step, seed, disabled }: { step: ActiveStep; seed: string; disabled: boolean }) {
  const snap = useGame((s) => s.snap)!;
  const flagRows = useGame((s) => s.flagRows);
  const [flags, setFlags] = useState<string[]>([]);
  const lines = computeTotals(snap, people);
  const res = snap.resolutions[step.id];
  const flagDecision = step.decisions.find((d) => d.id === 'flag')!;
  const caption = step.review!.caption;
  return (
    <>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
        <table className="grid review">
          <caption><span className="sim-brand">CampusHR <span>(Sim)</span></span> {caption}</caption>
          <thead><tr>{!res?.flag && <th scope="col" className="flag-col">Flag</th>}<th scope="col">Employee</th><th scope="col">Week 1 hrs</th><th scope="col">Week 2 hrs</th><th scope="col">Total hrs</th><th scope="col">Approval state</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.employeeId} className={flags.includes(l.employeeId) ? 'is-flagged' : ''}>
                {!res?.flag && (
                  <td className="flag-col"><label className="flag"><input type="checkbox" checked={flags.includes(l.employeeId)} disabled={disabled}
                    onChange={(e) => setFlags(e.target.checked ? [...flags, l.employeeId] : flags.filter((x) => x !== l.employeeId))} /><Icon.flag /><span className="sr-only">Flag {l.name}</span></label></td>
                )}
                <th scope="row">{l.name}</th>
                <td>{hrs(l.week1)}</td><td>{hrs(l.week2)}</td><td>{hrs(l.total)}</td>
                <td className={`approval ap-${l.approval.startsWith('Approved') ? 'ok' : 'wait'}`}>{l.approval.startsWith('Approved') ? <Icon.check /> : <Icon.clock />}{l.approval}</td>
                <td className="notes">{l.notes.join('; ') || <span className="muted">None</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="decisions">
        {res?.flag ? <div className="decision is-done"><p className="legend">{flagDecision.prompt}</p><Feedback d={flagDecision} res={res.flag} /></div> : (
          <div className="decision">
            <p className="legend">{flagDecision.prompt}</p>
            <button className="btn btn--gold" disabled={disabled} onClick={() => flagRows(step.id, flags)}>{flags.length ? `Submit ${flags.length} flagged ${flags.length === 1 ? 'row' : 'rows'}` : 'Everything looks right'}</button>
          </div>
        )}
        {step.decisions.filter((d) => d.id !== 'flag' && isDecisionActive(d, res)).map((d) => <ChoiceDecision key={d.id} step={step} d={d} seed={seed} disabled={disabled} />)}
      </div>
    </>
  );
}

/** Appears when a request is finished; takes focus so keyboard users land on the way out. */
function BackButton({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <button ref={ref} className="btn btn--gold" onClick={onClick}>Back to the office</button>;
}

export function TaskPanel() {
  const s = useGame();
  const step = s.openStepId ? s.game?.stepById(s.openStepId) : undefined;
  const [hintOpen, setHintOpen] = useState<string | null>(null);
  if (!step || !s.snap || !s.game) return null;
  const status = s.game.status(step);
  const from = personById(step.from);
  const disabled = status !== 'open';
  const hinted = s.snap.hints.includes(step.id);
  const meterLabel = METERS.find((m) => m.key === step.hintMeter)!.short;
  const close = () => s.openStep(null);
  const allDone = status === 'done' || status === 'missed';
  return (
    <Dialog labelId="task-h" onClose={close} className="drawer drawer--right liquid-glass-strong task" modal={false}>
      <div className="task-head">
        <Avatar id={step.from} size={44} />
        <div>
          <p className="eyebrow">{from.name} · {from.title}</p>
          <h2 id="task-h">{step.title}</h2>
          <p className="task-meta">
            <span className={`prio pr-${step.priority}`}>{step.priority === 'urgent' && <Icon.alert />}{priorityLabel(step.priority)}</span>
            <span><Icon.clock /> Due {dateLabel(step.dueAt)} {clockLabel(step.dueAt)}</span>
            {status === 'locked' && <span><Icon.clock /> Waiting on another task</span>}
          </p>
        </div>
      </div>
      {step.opener && <Quote speaker={step.opener.speaker} text={step.opener.line} auto once={`open.${step.id}.${s.snap.seed}`} note />}
      <p className="context">{step.context}</p>
      {step.attachment && (
        <figure className={`attachment att-${step.attachment.kind}`}>
          <figcaption>{step.attachment.title}</figcaption>
          <ul>{step.attachment.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </figure>
      )}
      {status === 'locked' && <p className="warn">Finish {step.requires?.map((r) => s.game!.stepById(r)?.title).join(' and ')} first.</p>}
      {step.type === 'choice' && <div className="decisions">{step.decisions.map((d) => <ChoiceDecision key={d.id} step={step} d={d} seed={s.snap!.seed} disabled={disabled} />)}</div>}
      {step.type === 'form' && <FormStep step={step} seed={s.snap.seed} disabled={disabled} />}
      {step.type === 'grid' && <GridStep step={step} seed={s.snap.seed} disabled={disabled} />}
      {step.type === 'review' && <ReviewStep step={step} seed={s.snap.seed} disabled={disabled} />}

      <div className="task-foot">
        {s.settings.mode === 'training' && !allDone && (
          hinted || hintOpen === step.id ? <p className="hint"><SpeakingAvatar id="coach" size={28} /><span><strong>Renee:</strong> {step.hint}</span><VoiceButton speaker="coach" text={step.hint} /></p>
            : <button className="btn btn--ghost" onClick={() => { s.hint(step.id); setHintOpen(step.id); void voicePlayer.say('coach', step.hint); }}><Icon.hint /> Ask Renee for a hint <span className="muted">(costs 2 {meterLabel})</span></button>
        )}
        {step.policyIds.length > 0 && (
          <details className="policies"><summary><Icon.book /> Policy Binder: {step.policyIds.map((p) => policyById(p)?.title).join(', ')}</summary>
            {step.policyIds.map((p) => { const pol = policyById(p)!; return <div key={p} className="policy"><h3>{pol.title}{pol.sme && <span className="tag tag--sme">[SME]</span>}</h3><p>{pol.body.replace(/\s*\[SME\][^.]*\./g, '')}</p><p className="fine">Source: {pol.source}</p></div>; })}
          </details>
        )}
        {allDone && <BackButton onClick={close} />}
      </div>
    </Dialog>
  );
}
