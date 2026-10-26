import { motion } from 'motion/react';
import { period, personById } from '../content';
import { dateLabel } from '../engine/clock';
import { paydayBeats, useGame } from '../store/game';
import { Avatar } from './common';
import { Icon } from './icons';

export function Payday() {
  const { snap, beat, nextBeat, skipPayday, settings } = useGame();
  if (!snap) return null;
  const beats = paydayBeats(snap);
  const b = beats[beat];
  if (!b) return null;
  const p = personById(b.speaker);
  return (
    <section className="payday" aria-labelledby="payday-h">
      <div className="payday-banner liquid-glass">
        <p className="eyebrow">Pay day · {dateLabel(period.paycheck)}</p>
        <h2 id="payday-h">Checks are out.</h2>
        <p className="muted">Payroll signed off when time cards came due, Monday at noon.</p>
        <p className="muted">{beat + 1} of {beats.length}</p>
      </div>
      <motion.div key={beat} className={`dialogue liquid-glass-strong tone-${b.tone}`} initial={settings.reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} role="group" aria-label={`${p.name} says`}>
        <Avatar id={b.speaker} size={64} />
        <div className="dl-body">
          <p className="dl-name">{p.name} <span className="muted">· {p.title}</span></p>
          <p className="dl-line" aria-live="polite">"{b.line}"</p>
          {b.speaker !== 'coach' && <p className={`dl-summary ${b.tone === 'positive' ? 'is-good' : 'is-bad'}`}>{b.tone === 'positive' ? <Icon.check /> : <Icon.alert />}{b.summary}{b.task ? ` Next period: ${b.task}` : ''}</p>}
          <div className="dl-actions">
            <button className="btn btn--gold" onClick={nextBeat} data-testid="next-beat" autoFocus>{beat + 1 < beats.length ? 'Next' : 'See the debrief'} <Icon.arrow /></button>
            {beat + 1 < beats.length && <button className="btn btn--ghost" onClick={skipPayday}>Skip to debrief</button>}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
