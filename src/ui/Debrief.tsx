import { motion } from 'motion/react';
import { useState } from 'react';
import { courseFor, department, personById } from '../content';
import { clockLabel, DAY_START, dateLabel, dayStart, isWorkday, weekdayLabel, workMinutesBetween } from '../engine/clock';
import { grade, METERS, rating } from '../engine/scoring';
import type { DecisionEvent } from '../engine/eventBus';
import { useGame } from '../store/game';
import type { DeltasT, MeterKey } from '../../content/schemas';
import { BlurText } from './common';
import { Icon, MeterGlyph } from './icons';

const deltaText = (d: DeltasT) => (Object.entries(d) as [MeterKey, number][]).filter(([, v]) => v).map(([k, v]) => `${METERS.find((m) => m.key === k)!.short} ${v > 0 ? '+' : ''}${v}`).join(', ');

export function Debrief() {
  const { snap, game, startRun, restart, settings, pauses } = useGame();
  const [sel, setSel] = useState<string | null>(null);
  if (!snap || !game) return null;
  const r = rating(snap.meters);
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
  const courses = [...new Map(errors.filter((e) => e.errorCode).map((e) => [courseFor(e.errorCode!)!.course, courseFor(e.errorCode!)!])).values()];
  const chains = snap.consequences.filter((q) => q.tone === 'negative');
  const selected = snap.log.find((e) => e.id === sel);
  const fade = settings.reducedMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

  return (
    <main className="debrief" id="main">
      <header className="db-head">
        <p className="eyebrow">Debrief · Payroll · run code {snap.seed} · {snap.mode === 'training' ? 'Training' : 'Certification'}</p>
        <BlurText as="h1" text={`${r}.`} italic={r.split(' ').pop()} className="display display--sm" />
        <p className="lede">{snap.ended?.reason === 'finished' ? `You wrapped up ${dateLabel(snap.ended.at)} at ${clockLabel(snap.ended.at)}, and payroll signed off when time cards came due.` : 'Time cards came due Monday at noon, and payroll signed off on whatever was in.'} {errors.length === 0 ? 'Every decision was the right call.' : `${snap.log.length - errors.length} of ${snap.log.length} decisions were the right call.`}{snap.hints.length > 0 && ` Hints used: ${snap.hints.length}.`}{snap.mode === 'certification' && pauses > 0 && ` Pauses: ${pauses} (logged, not penalized).`}</p>
      </header>

      <section aria-labelledby="m-h" className="db-section">
        <h2 id="m-h" className="sr-only">Final meters</h2>
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
            <p><strong>{selected.missed ? 'Outcome:' : 'You chose:'}</strong> {selected.value ? `$${selected.value}` : c.text}</p>
            <p>{c.feedback}</p>
            {causes.map((q, i) => <p key={i} className="is-bad"><Icon.arrow /> <strong>On pay day:</strong> {q.summary} ({deltaText(q.deltas)})</p>)}
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
                  <span className="link-node"><span className="ln-k">{weekdayLabel(e.simTime)} {clockLabel(e.simTime)}</span>{step.title}: {e.missed ? 'missed' : e.value ? `$${e.value}` : c.text}</span>
                  <span className="link-arrow" aria-label="led to"><Icon.arrow /></span>
                  <span className="link-node"><span className="ln-k">Pay day · {personById(q.speaker).name}</span>{q.summary}</span>
                  <span className="link-arrow" aria-label="cost"><Icon.arrow /></span>
                  <span className="link-node is-cost"><span className="ln-k">Cost</span>{deltaText(q.deltas)}{q.task && <><br />{q.task}</>}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="a-h" className="db-section">
        <h2 id="a-h">Recommended HCM Academy courses</h2>
        {courses.length === 0 ? <p className="muted">None needed this run. Try Certification mode next.</p> : (
          <ul className="courses">
            {courses.map((c) => <li key={c.course}><a href={c.url} target="_blank" rel="noreferrer">{c.title}<Icon.external /><span className="sr-only"> (opens in a new tab)</span></a></li>)}
          </ul>
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
