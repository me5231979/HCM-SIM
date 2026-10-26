import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { areaById, areas, courseLink, department, learnerText, personById } from '../content';
import { clockLabel, DAY_START, dateLabel, dayStart, isWorkday, weekdayLabel, workMinutesBetween } from '../engine/clock';
import { grade, METERS, rating, READY } from '../engine/scoring';
import { areaScores, onTime, type AreaScore } from '../engine/game';
import type { DecisionEvent } from '../engine/eventBus';
import { playMinutes, useGame } from '../store/game';
import type { DeltasT, MeterKey } from '../../content/schemas';
import { BlurText } from './common';
import { AreaGlyph, Icon, MeterGlyph } from './icons';

const pctLabel = (s: AreaScore) => (s.total ? `${Math.round((s.right / s.total) * 100)}%` : 'Not practiced');
const level = (s: AreaScore) => (!s.total ? 'none' : s.right / s.total >= READY.area ? 'mastered' : s.right / s.total >= READY.floor ? 'review' : 'practice');
const LEVEL_TEXT = { mastered: 'Mastered', review: 'Review', practice: 'Practice again', none: 'Not practiced' } as const;

/** Mastery by HCM Academy topic: what this run shows the player knows, and where to go next. */
function Profile({ scores }: { scores: AreaScore[] }) {
  return (
    <ul className="profile">
      {scores.map((s) => {
        const a = areaById(s.area);
        const lv = level(s);
        const pct = s.total ? (s.right / s.total) * 100 : 0;
        return (
          <li key={s.area} className={`pf-row lv-${lv}`}>
            <span className="pf-icon" aria-hidden="true"><AreaGlyph a={s.area} /></span>
            <span className="pf-name"><span className="pf-num">{a.number}</span>{a.label}</span>
            <span className="pf-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
            <span className="pf-score">{s.right} of {s.total}<span className="muted"> · {pctLabel(s)}</span></span>
            <span className={`pf-level lv-${lv}`}>{lv === 'mastered' ? <Icon.check /> : lv === 'none' ? <Icon.clock /> : <Icon.alert />}{LEVEL_TEXT[lv]}</span>
            {s.courses.length > 0 && (
              <span className="pf-courses">
                {s.courses.map((slug) => { const c = courseLink(slug); return c ? <a key={slug} href={c.url} target="_blank" rel="noreferrer">{c.title}{c.parked && ' (topic page)'}<Icon.external /><span className="sr-only"> (opens in a new tab)</span></a> : null; })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Every decision, mistakes first, with what to do instead and where to learn it. Prints in full. */
function Decisions({ items }: { items: { e: DecisionEvent; title: string; prompt: string; area: AreaScore['area']; chose: string; better?: string; feedback: string; hinted: boolean; courses: string[] }[] }) {
  const wrong = items.filter((x) => !x.e.correct);
  const right = items.filter((x) => x.e.correct);
  const row = (x: (typeof items)[number]) => {
    const kind = x.e.missed ? 'missed' : x.e.correct ? 'good' : 'bad';
    return (
      <li key={x.e.id} className={`dl-row dl-${kind}`}>
        <span className="dl-status">{kind === 'good' ? <><Icon.check /> Right call</> : kind === 'missed' ? <><Icon.clock /> Missed</> : <><Icon.cross /> Error</>}</span>
        <span className="dl-when">{weekdayLabel(x.e.simTime)} {clockLabel(x.e.simTime)}</span>
        <span className="dl-area"><AreaGlyph a={x.area} />{areaById(x.area).short}</span>
        <span className="dl-what"><strong>{x.title}</strong>: {x.prompt}{x.hinted && <span className="dl-hint"> · hint used</span>}</span>
        <span className="dl-chose"><span className="muted">{x.e.missed ? 'Outcome:' : 'You chose:'}</span> {x.chose}</span>
        {x.better && <span className="dl-better"><Icon.check /> <span className="muted">Better:</span> {x.better}</span>}
        {!x.e.correct && <span className="dl-why">{x.feedback}</span>}
        {!x.e.correct && x.courses.length > 0 && (
          <span className="dl-courses">{x.courses.map((slug) => { const c = courseLink(slug); return c ? <a key={slug} href={c.url} target="_blank" rel="noreferrer">{c.title}<Icon.external /><span className="sr-only"> (opens in a new tab)</span></a> : null; })}</span>
        )}
      </li>
    );
  };
  return (
    <>
      {wrong.length === 0 ? <p className="feedback is-good"><Icon.check /> No errors and nothing missed.</p> : <ol className="decision-list">{wrong.map(row)}</ol>}
      {right.length > 0 && (
        <details className="dl-right">
          <summary>Show the {right.length} right {right.length === 1 ? 'call' : 'calls'}</summary>
          <ol className="decision-list">{right.map(row)}</ol>
        </details>
      )}
    </>
  );
}

const deltaText = (d: DeltasT) => (Object.entries(d) as [MeterKey, number][]).filter(([, v]) => v).map(([k, v]) => `${METERS.find((m) => m.key === k)!.short} ${v > 0 ? '+' : ''}${v}`).join(', ');

export function Debrief() {
  const { snap, game, startRun, restart, settings, pauses, setSettings } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  // The printout shows every decision, including the right calls tucked behind a toggle on screen.
  useEffect(() => {
    const open = () => document.querySelectorAll<HTMLDetailsElement>('.debrief details').forEach((d) => { d.open = true; });
    window.addEventListener('beforeprint', open);
    return () => window.removeEventListener('beforeprint', open);
  }, []);
  if (!snap || !game) return null;
  const scores = areaScores(snap, areas.map((a) => a.id));
  const r = rating(scores, snap.meters);
  const ontime = onTime(game, snap);
  const start = snap.start;
  const span = workMinutesBetween(start, snap.deadline);
  const pos = (t: number) => Math.min(100, (workMinutesBetween(start, t) / span) * 100);
  // Workday starts between the first request and the deadline, for the timeline's day labels.
  const days: number[] = [];
  for (let d = dayStart(start); d < snap.deadline; d += 1440) if (isWorkday(d)) days.push(Math.max(start, d + DAY_START));
  const info = (e: DecisionEvent) => {
    const step = game.stepById(e.stepId)!;
    const d = step.decisions.find((x) => x.id === e.decisionId)!;
    const c = d.choices.find((x) => x.id === e.choiceId)!;
    const best = d.choices.find((x) => x.correct)!;
    return { step, d, c, best, causes: snap.consequences.filter((q) => q.causedBy === e.id) };
  };
  const errors = snap.log.filter((e) => !e.correct);
  const minutes = playMinutes();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const items = snap.log.map((e) => {
    const { step, d, c, best } = info(e);
    return {
      e, title: step.title, prompt: d.label ? `${d.label}. ${d.prompt}` : d.prompt, area: d.area ?? step.area,
      chose: e.missed ? 'Not done by the deadline' : d.kind === 'number' ? `$${e.value}` : c.text,
      better: e.correct ? undefined : d.kind === 'number' ? `$${d.expected?.toFixed(2)}` : best.text,
      feedback: learnerText(c.feedback), hinted: snap.hints.includes(step.id), courses: d.courses,
    };
  });
  const chains = snap.consequences.filter((q) => q.tone === 'negative');
  const selected = snap.log.find((e) => e.id === sel);
  const fade = settings.reducedMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="debrief" id="main">
      <header className="db-head">
        <p className="eyebrow">Debrief · Role of the HCM · run code {snap.seed} · {snap.mode === 'training' ? 'Training' : 'Certification'} · {today}</p>
        <label className="db-name"><span>Name for the printout</span><input value={settings.learnerName} onChange={(e) => setSettings({ learnerName: e.target.value })} placeholder="Optional" autoComplete="name" /><span className="fine">Stays in this browser.</span></label>
        {settings.learnerName && <p className="db-name-print">{settings.learnerName}</p>}
        <BlurText as="h1" text={`${r}.`} italic={r.split(' ').pop()} className="display display--sm" />
        <p className="lede">{snap.ended?.reason === 'finished' ? `You wrapped up ${dateLabel(snap.ended.at)} at ${clockLabel(snap.ended.at)}, and payroll signed off when time cards came due.` : 'Time cards came due Monday at noon, and payroll signed off on whatever was in.'} {errors.length === 0 ? 'Every decision was the right call.' : `${snap.log.length - errors.length} of ${snap.log.length} decisions were the right call.`} {`${ontime.done} of ${ontime.total} requests were finished on time.`}{snap.hints.length > 0 && ` Hints used: ${snap.hints.length}.`}{minutes > 0 && ` Time played: about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`}{snap.mode === 'certification' && pauses > 0 && ` Pauses: ${pauses} (logged, not penalized).`}</p>
      </header>

      <section aria-labelledby="p-h" className="db-section">
        <h2 id="p-h">Your HCM profile</h2>
        <p className="muted">Decisions right in each HCM Academy topic. Ready means every topic at {Math.round(READY.area * 100)}% or better, with compliance risk at {READY.risk} or lower. Links go to the courses for anything you missed.</p>
        <Profile scores={scores} />
      </section>

      <section aria-labelledby="d-h" className="db-section">
        <h2 id="d-h">What to review</h2>
        <p className="muted">Every decision you got wrong or missed, in the order it happened, with the better choice and the course that teaches it.</p>
        <Decisions items={items} />
      </section>

      <section aria-labelledby="m-h" className="db-section">
        <h2 id="m-h">How the week landed</h2>
        <p className="muted">Pay day costs are included: every problem that reached someone counts here. Trust and Managers start at 70, a C; right calls raise them, and mistakes lower them.</p>
        <ul className="grades">
          {METERS.map((m) => { const g = grade(m.key, snap.meters[m.key]); return (
            <motion.li key={m.key} className={`grade g-${g}`} {...fade}>
              <span className="g-icon"><MeterGlyph k={m.key} /></span>
              <span className="g-letter" aria-label={`Grade ${g}`}>{g}</span>
              <span className="g-num">{snap.meters[m.key]}</span>
              <span className="g-label">{m.label}{m.lowerIsBetter && <span className="muted"> (lower is better)</span>}</span>
            </motion.li>
          ); })}
        </ul>
      </section>

      <section aria-labelledby="t-h" className="db-section">
        <h2 id="t-h">Timeline</h2>
        <p className="muted">{dateLabel(start)}, {clockLabel(start)} to {dateLabel(snap.deadline)}, {clockLabel(snap.deadline)}, in work hours. Select a marker to see the decision, what it caused, and the better choice.</p>
        <div className="timeline">
          {days.map((d) => <span key={d} className="tl-day" style={{ left: `${pos(d)}%` }}>{weekdayLabel(d)}</span>)}
          {snap.deadlines.map((d) => <span key={d.key} className={`tl-cut tl-${d.key}`} style={{ left: `${pos(d.time)}%` }} title={d.label}>{d.short}</span>)}
          <ol className="tl-track">
            {snap.log.map((e, i) => {
              const x = pos(e.simTime);
              const kind = e.missed ? 'missed' : e.correct ? 'good' : 'bad';
              const { step, d } = info(e);
              return (
                <li key={e.id} style={{ left: `${x}%`, top: `${(i % 3) * 30}px` }}>
                  <button className={`tl-mark m-${kind} ${sel === e.id ? 'is-on' : ''}`} onClick={() => setSel(sel === e.id ? null : e.id)} aria-pressed={sel === e.id}
                    aria-label={`${dateLabel(e.simTime)} ${clockLabel(e.simTime)}: ${step.title}, ${d.label ?? d.prompt}. ${kind === 'good' ? 'Right call' : kind === 'missed' ? 'Missed' : 'Error'}.`}>
                    {kind === 'good' ? <Icon.check /> : kind === 'missed' ? <Icon.clock /> : <Icon.cross />}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="tl-legend" aria-label="Legend"><li><span className="tl-mark m-good"><Icon.check /></span>Right call</li><li><span className="tl-mark m-bad"><Icon.cross /></span>Error</li><li><span className="tl-mark m-missed"><Icon.clock /></span>Missed deadline</li></ul>
        {selected && (() => { const { step, d, c, best, causes } = info(selected); return (
          <div className="tl-detail liquid-glass" role="region" aria-label="Decision detail">
            <p className="eyebrow">{dateLabel(selected.simTime)} · {clockLabel(selected.simTime)} · {step.title}</p>
            <h3>{d.prompt}</h3>
            <p><strong>{selected.missed ? 'Outcome:' : 'You chose:'}</strong> {d.kind === 'number' ? `$${selected.value}` : c.text}</p>
            <p>{learnerText(c.feedback)}</p>
            {causes.map((q, i) => <p key={i} className="is-bad"><Icon.arrow /> <strong>On pay day:</strong> {learnerText(q.summary)} ({deltaText(q.deltas)})</p>)}
            {!selected.correct && <p className="better"><Icon.check /> <strong>Better choice:</strong> {d.kind === 'number' ? `$${d.expected?.toFixed(2)}` : best.text}</p>}
          </div>
        ); })()}
      </section>

      <section aria-labelledby="c-h" className="db-section">
        <h2 id="c-h">Root cause chains</h2>
        {chains.length === 0 ? <p className="feedback is-good"><Icon.check /> No problems reached a paycheck. Nothing to trace.</p> : (
          <ol className="chains">
            {chains.map((q, i) => {
              const e = snap.log.find((x) => x.id === q.causedBy)!;
              const { step, c } = info(e);
              return (
                <li key={i} className="chain">
                  <span className="link-node"><span className="ln-k">{weekdayLabel(e.simTime)} {clockLabel(e.simTime)}</span>{step.title}: {e.missed ? 'missed' : info(e).d.kind === 'number' ? `$${e.value}` : c.text}</span>
                  <span className="link-arrow" aria-label="led to"><Icon.arrow /></span>
                  <span className="link-node"><span className="ln-k">Pay day · {personById(q.speaker).name}</span>{learnerText(q.summary)}</span>
                  <span className="link-arrow" aria-label="cost"><Icon.arrow /></span>
                  <span className="link-node is-cost"><span className="ln-k">Cost</span>{deltaText(q.deltas)}{q.task && <><br />{learnerText(q.task)}</>}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>


      <div className="db-actions">
        <button className="btn btn--gold" onClick={() => startRun({ seed: snap.seed, mode: snap.mode })}>Replay run {snap.seed}</button>
        <button className="btn btn--ghost" onClick={() => startRun({ mode: snap.mode })}>New run</button>
        <button className="btn btn--ghost" onClick={() => window.print()}>Print or save as PDF</button>
        <button className="btn btn--ghost" onClick={restart}>Back to title</button>
      </div>
      <p className="fine">{department.name} is fictional. A Futures Learning Hub simulation.</p>
    </main>
  );
}
