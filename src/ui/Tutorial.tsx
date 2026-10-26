import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { personById, tutorial } from '../content';
import { clockLabel, dateLabel } from '../engine/clock';
import { useGame } from '../store/game';
import type { TutorialT } from '../../content/schemas';
import { Avatar, Dialog } from './common';
import { Icon, LegendIcon } from './icons';

type LegendKey = keyof TutorialT['legends'];

export function Legend({ which }: { which: LegendKey }) {
  return (
    <ul className={`legend legend--${which}`}>
      {tutorial.legends[which].map((item) => (
        <li key={item.key}>
          <span className={`legend-icon li-${item.key}`} aria-hidden="true"><LegendIcon k={item.key} /></span>
          <span className="legend-text"><strong>{item.label}</strong><span>{item.text}</span></span>
        </li>
      ))}
    </ul>
  );
}

/** The unscored warm-up: same interaction as a real decision, nothing recorded. */
function Practice({ onDone }: { onDone: () => void }) {
  const p = tutorial.practice;
  const [pick, setPick] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const chosen = p.decision.choices.find((c) => c.id === result);
  return (
    <div className="practice">
      <div className="practice-head"><Avatar id={p.from} size={36} /><div><p className="eyebrow">{personById(p.from).name} · Practice, not scored</p><h3>{p.title}</h3></div></div>
      <p className="context">{p.context}</p>
      {!chosen ? (
        <form className="decision" onSubmit={(e) => { e.preventDefault(); if (pick) { setResult(pick); onDone(); } }}>
          <fieldset>
            <legend className="legend-q">{p.decision.prompt}</legend>
            <div className="options">
              {p.decision.choices.map((c) => (
                <label key={c.id} className={`option ${pick === c.id ? 'is-on' : ''}`}>
                  <input type="radio" name="practice" value={c.id} checked={pick === c.id} onChange={() => setPick(c.id)} />
                  <span>{c.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="practice-actions">
            <button className="btn btn--gold" type="submit" disabled={!pick}>Decide</button>
            {hint ? <p className="hint"><Avatar id="coach" size={24} /><span><strong>Renee:</strong> {p.hint}</span></p>
              : <button type="button" className="btn btn--ghost" onClick={() => setHint(true)}><Icon.hint /> Ask Renee for a hint <span className="muted">(free in practice)</span></button>}
          </div>
        </form>
      ) : (
        <div className={`feedback ${chosen.correct ? 'is-good' : 'is-bad'}`} role="status">
          <p className="fb-head">{chosen.correct ? <><Icon.check /> Good call</> : <><Icon.cross /> Not the best move</>}</p>
          <p>{chosen.feedback}</p>
          {!chosen.correct && <button className="link-btn" onClick={() => { setResult(null); setPick(''); }}>Try again</button>}
        </div>
      )}
    </div>
  );
}

interface Rect { top: number; left: number; width: number; height: number }

/** Guided tour: spotlights each part of the screen in turn, explains it, then runs the practice request. */
export function Tutorial() {
  const { tourStep, setTourStep, endTour, settings, snap } = useGame();
  const steps = tutorial.steps.filter((s) => !(s.only3d && settings.view === '2d'));
  const i = Math.min(tourStep, steps.length - 1);
  const step = steps[i];
  const [rect, setRect] = useState<Rect | null>(null);
  const [practiced, setPracticed] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      const r = el?.getBoundingClientRect();
      setRect(r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [i]);

  const last = i === steps.length - 1;
  const pad = 8;
  const spot = rect && { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  // Card goes below the spotlight when there's room, otherwise above it; centered when nothing is highlighted.
  const below = spot ? spot.top + spot.height + 360 < window.innerHeight : true;
  const cardStyle = spot
    ? { top: below ? spot.top + spot.height + 14 : undefined, bottom: below ? undefined : window.innerHeight - spot.top + 14, left: Math.max(16, Math.min(spot.left, window.innerWidth - 496)) }
    : undefined;

  return (
    <div className="tour" data-testid="tour">
      {spot ? <div className="tour-spot" style={spot} aria-hidden="true" /> : <div className="tour-dim" aria-hidden="true" />}
      <Dialog labelId="tour-h" onClose={endTour} style={cardStyle} className={`tour-card liquid-glass-strong ${spot ? '' : 'is-centered'} ${step.practice ? 'is-wide' : ''}`}>
        <p className="eyebrow">How to play · {i + 1} of {steps.length}</p>
        <h2 id="tour-h" ref={titleRef} tabIndex={-1}>{step.title}</h2>
        <p>{step.body}</p>
        {step.id === 'deadlines' && snap && (
          <ul className="tour-deadlines">
            {snap.deadlines.map((d) => <li key={d.key}><Icon.clock /><strong>{d.label}:</strong> {dateLabel(d.time)} at {clockLabel(d.time)}</li>)}
          </ul>
        )}
        {step.legend && <Legend which={step.legend} />}
        {step.practice && <Practice onDone={() => setPracticed(true)} />}
        <div className="tour-actions">
          <button className="link-btn" onClick={endTour}>Skip the tour</button>
          <span className="tour-nav">
            {i > 0 && <button className="btn btn--ghost" onClick={() => setTourStep(i - 1)}>Back</button>}
            {last
              ? <button className="btn btn--gold" onClick={endTour} data-testid="tour-done">Start the clock <Icon.arrow /></button>
              : <button className="btn btn--gold" onClick={() => setTourStep(i + 1)} data-testid="tour-next">{step.practice && !practiced ? 'Skip practice' : 'Next'} <Icon.arrow /></button>}
          </span>
        </div>
      </Dialog>
    </div>
  );
}

/** Help: the same legends any time, plus a way back into the tour. */
export function Help() {
  const { setPanel, startTour, phase, snap } = useGame();
  const close = () => setPanel({ helpOpen: false });
  return (
    <Dialog labelId="help-h" onClose={close} className="modal modal--wide liquid-glass-strong help">
      <p className="eyebrow">Help</p>
      <h2 id="help-h">How to <em>play</em>.</h2>
      {snap && (
        <section aria-labelledby="help-d">
          <h3 id="help-d">Your deadlines</h3>
          <ul className="tour-deadlines">{snap.deadlines.map((d) => <li key={d.key}><Icon.clock /><strong>{d.label}:</strong> {dateLabel(d.time)} at {clockLabel(d.time)}</li>)}</ul>
        </section>
      )}
      <section aria-labelledby="help-s"><h3 id="help-s">Symbols</h3><Legend which="symbols" /></section>
      <section aria-labelledby="help-c"><h3 id="help-c">Controls</h3><Legend which="controls" /></section>
      <section aria-labelledby="help-m"><h3 id="help-m">Meters</h3><Legend which="meters" /></section>
      <div className="set-actions">
        {phase === 'playing' && <button className="btn btn--ghost" onClick={startTour}>Replay the tour</button>}
        <button className="btn btn--gold" onClick={close}>Back to work</button>
      </div>
    </Dialog>
  );
}
