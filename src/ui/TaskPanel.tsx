import { useEffect, useMemo, useRef, useState } from 'react';
import { courseLink, learnerText, people, personById, policyById } from '../content';
import { clockLabel, dateLabel } from '../engine/clock';
import { computeTotals, isDecisionActive, type ActiveStep, type Resolution } from '../engine/game';
import { createRng } from '../engine/rng';
import { METERS } from '../engine/scoring';
import { useGame } from '../store/game';
import type { ChoiceT, DecisionT, DeltasT, MeterKey } from '../../content/schemas';
import { Avatar, Dialog, priorityLabel } from './common';
import { Icon } from './icons';
import { voicePlayer } from '../audio/voice';
import { Quote, SpeakingAvatar, VoiceButton } from './Voice';
import { LiveOffer, LiveRecap } from './Live';
import { SayAnswer } from './SayAnswer';

const hrs = (n: number) => n.toFixed(1);

/** Seeded shuffle so the right answer isn't always in the same spot, but a shared seed shows the same order. */
function shuffled(seed: string, d: DecisionT): ChoiceT[] {
  const r = createRng(`${seed}:${d.id}`);
  const list = d.choices.filter((c) => !c.hidden);
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
const useOrder = (seed: string, d: DecisionT) => useMemo(() => shuffled(seed, d), [seed, d]);

/** What a decision did to each meter, with an icon and a word, never color alone. */
export function MeterChanges({ deltas }: { deltas: DeltasT }) {
  const list = (Object.entries(deltas) as [MeterKey, number][]).filter(([, v]) => v);
  if (!list.length) return null;
  return (
    <ul className="fb-deltas" aria-label="Meter changes">
      {list.map(([k, v]) => {
        const m = METERS.find((x) => x.key === k)!;
        const good = m.lowerIsBetter ? v < 0 : v > 0;
        return <li key={k} className={good ? 'is-good' : 'is-bad'}>{good ? <Icon.check /> : <Icon.alert />}{m.short} {v > 0 ? '+' : ''}{v}<span className="sr-only">{good ? ' (better)' : ' (worse)'}</span></li>;
      })}
    </ul>
  );
}

function Feedback({ d, res }: { d: DecisionT; res: Resolution }) {
  const mode = useGame((s) => s.settings.mode);
  const event = useGame((s) => s.snap?.log.find((e) => e.id === res.eventId));
  if (mode === 'certification') return <p className="feedback is-neutral" role="status"><Icon.check /> Recorded at {clockLabel(res.at)}. You'll see how it played out on pay day.</p>;
  const c = d.choices.find((x) => x.id === res.choiceId)!;
  const ok = c.correct && !res.missed;
  const courses = ok ? [] : d.courses.slice(0, 2).map(courseLink).filter((x) => !!x);
  const extraFlags = d.kind !== 'number' && res.value ? res.value.split(',').map((id) => personById(id).name) : [];
  return (
    <div className={`feedback ${ok ? 'is-good' : 'is-bad'}`} role="status">
      <p className="fb-head">{ok ? <><Icon.check /> Good call</> : res.missed ? <><Icon.clock /> Missed: the deadline passed</> : <><Icon.cross /> Not the best move</>}</p>
      {!ok && !res.missed && <p className="fb-choice">You chose: {d.kind === 'number' ? `$${res.value}` : c.text}</p>}
      <p>{learnerText(c.feedback)}</p>
      {extraFlags.length > 0 && <p className="fb-extra"><Icon.flag /> You also flagged {extraFlags.join(' and ')}. Those totals were in the normal range, so each extra flag cost a manager a few minutes. If a note worries you, ask the manager before noon.</p>}
      {event && <MeterChanges deltas={event.deltas} />}
      {!ok && (c.consequences?.length ?? 0) > 0 && <p className="fb-later"><Icon.clock /> This will show up on pay day.</p>}
      {courses.map((x) => <a key={x.slug} className="fb-course" href={x.url} target="_blank" rel="noreferrer">HCM Academy: {x.title} <Icon.external /><span className="sr-only"> (opens in a new tab)</span></a>)}
    </div>
  );
}

function ChoiceDecision({ step, d, seed, disabled }: { step: ActiveStep; d: DecisionT; seed: string; disabled: boolean }) {
  const res = useGame((s) => s.snap?.resolutions[step.id]?.[d.id]);
  const decide = useGame((s) => s.decide);
  const order = useOrder(seed, d);
  const [pick, setPick] = useState<string>('');
  const numbered = useGame((s) => s.settings.speakBack);
  if (res) return <div className="decision is-done"><p className="legend">{d.label ? `${d.label}: ` : ''}{d.prompt}</p><Feedback d={d} res={res} /><LiveRecap stepId={step.id} decisionId={d.id} /></div>;
  return (
    <form className="decision" onSubmit={(e) => { e.preventDefault(); if (pick) decide(step.id, d.id, pick); }}>
      {d.spoken && <Quote speaker={d.spoken.speaker} text={d.spoken.line} className="quote--decision" />}
      <LiveOffer step={step} d={d} disabled={disabled} />
      <fieldset>
        <legend className="legend">{d.label && <span className="legend-label">{d.label}</span>}{d.prompt}</legend>
        <div className="options">
          {order.map((c, i) => (
            <label key={c.id} className={`option ${pick === c.id ? 'is-on' : ''}`}>
              <input type="radio" name={`${step.id}-${d.id}`} value={c.id} checked={pick === c.id} onChange={() => setPick(c.id)} disabled={disabled} />
              {numbered && <span className="opt-num" aria-hidden="true">{i + 1}</span>}
              <span>{c.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <SayAnswer options={order} onPick={setPick} disabled={disabled} />
      <div className="decide-bar"><button className="btn btn--gold" type="submit" disabled={!pick || disabled}>Decide</button></div>
    </form>
  );
}

/** Names the real system a practice screen stands in for, and says it's a practice version. */
function ScreenLabel({ step, block }: { step: ActiveStep; block?: boolean }) {
  const Tag = block ? 'p' : 'span';
  return <Tag className="sim-brand" aria-hidden={block || undefined}>{step.screen} <span>practice screen</span></Tag>;
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
      <ScreenLabel step={step} block />
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
      <div className="decide-bar"><button className="btn btn--gold" type="submit" disabled={!ready || disabled}>{step.id === 'reminder' ? 'Send reminder' : 'Save and submit'}</button></div>
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
          <caption><ScreenLabel step={step} /> {g.caption}</caption>
          <thead><tr><th scope="col">Employee</th>{g.days.map((d) => <th key={d} scope="col">{d}</th>)}<th scope="col">Total</th><th scope="col" className="ex-col">Exception</th></tr></thead>
          <tbody>
            {g.rows.map((r) => {
              const p = personById(r.employeeId);
              const resolved = r.exceptionDecision ? res?.[r.exceptionDecision] : undefined;
              return (
                <tr key={r.employeeId} className={r.exceptionDecision && !resolved ? 'has-ex' : ''}>
                  <th scope="row">{p.name}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} data-label={g.days[i]} className={r.exceptionCell === i && !resolved ? 'ex-cell' : ''}>
                      {r.exceptionCell === i && !resolved && <Icon.alert />}{c || <span className="muted">Not entered</span>}
                    </td>
                  ))}
                  <td data-label="Total">{r.total}</td>
                  <td className="ex-col" data-label="Exception">{r.exceptionDecision ? (resolved ? <span className="st-done"><Icon.check /> Resolved</span> : <span className="st-ex"><Icon.alert /> {r.exceptionLabel}</span>) : (r.note ?? <span className="muted">None</span>)}</td>
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
          <caption><ScreenLabel step={step} /> {caption}</caption>
          <thead><tr>{!res?.flag && <th scope="col" className="flag-col">Flag</th>}<th scope="col">Employee</th><th scope="col">Week 1 hrs</th><th scope="col">Week 2 hrs</th><th scope="col">Total hrs</th><th scope="col">Approval state</th><th scope="col">Notes</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.employeeId} className={flags.includes(l.employeeId) ? 'is-flagged' : ''}>
                {!res?.flag && (
                  <td className="flag-col" data-label="Flag"><label className="flag"><input type="checkbox" checked={flags.includes(l.employeeId)} disabled={disabled}
                    onChange={(e) => setFlags(e.target.checked ? [...flags, l.employeeId] : flags.filter((x) => x !== l.employeeId))} /><Icon.flag /><span className="sr-only">Flag {l.name}</span></label></td>
                )}
                <th scope="row">{l.name}</th>
                <td data-label="Week 1 hrs">{hrs(l.week1)}</td><td data-label="Week 2 hrs">{hrs(l.week2)}</td><td data-label="Total hrs">{hrs(l.total)}</td>
                <td data-label="Approval state" className={`approval ap-${l.approval.startsWith('Approved') ? 'ok' : 'wait'}`}>{l.approval.startsWith('Approved') ? <Icon.check /> : <Icon.clock />}{l.approval}</td>
                <td className="notes" data-label="Notes">{l.notes.join('; ') || <span className="muted">None</span>}</td>
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

/** Appears when a request is finished: straight on to the next open request (it takes focus), or back to the office. */
function Done({ next, onNext, onBack }: { next?: ActiveStep; onNext: () => void; onBack: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="done-actions">
      {next && <button ref={ref} className="btn btn--gold" onClick={onNext} data-testid="next-request">Next request: {next.title} <Icon.arrow /></button>}
      <button ref={next ? undefined : ref} className={`btn ${next ? 'btn--ghost' : 'btn--gold'}`} onClick={onBack}>Back to the office</button>
    </div>
  );
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
  const next = allDone ? s.snap.steps.filter((x) => x.id !== step.id && s.game!.status(x) === 'open').sort((a, b) => a.dueAt - b.dueAt)[0] : undefined;
  return (
    <Dialog labelId="task-h" onClose={close} className="drawer drawer--right liquid-glass-strong task" modal={false}>
      <div className="task-head" data-step={step.id}>
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
      <p className="context">{learnerText(step.context)}</p>
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
          hinted || hintOpen === step.id ? <p className="hint"><SpeakingAvatar id="coach" size={28} /><span><strong>Renee:</strong> {learnerText(step.hint)}</span><VoiceButton speaker="coach" text={step.hint} /></p>
            : <button className="btn btn--ghost" onClick={() => { s.hint(step.id); setHintOpen(step.id); void voicePlayer.say('coach', step.hint); }}><Icon.hint /> Ask Renee for a hint <span className="muted">(costs 2 {meterLabel})</span></button>
        )}
        {step.policyIds.length > 0 && (
          <details className="policies" onToggle={(e) => { const el = e.currentTarget; if (el.open) requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: s.settings.reducedMotion ? 'auto' : 'smooth' })); }}><summary><Icon.book /> Policy Binder: {step.policyIds.map((p) => policyById(p)?.title).join(', ')}</summary>
            {step.policyIds.map((p) => { const pol = policyById(p)!; return <div key={p} className="policy"><h3>{pol.title}{pol.sme && <span className="tag tag--sme">Being confirmed</span>}</h3><p>{learnerText(pol.body)}</p><p className="fine">Source: {pol.source}</p></div>; })}
          </details>
        )}
        {allDone && <Done next={next} onNext={() => s.openStep(next!.id)} onBack={close} />}
      </div>
    </Dialog>
  );
}
