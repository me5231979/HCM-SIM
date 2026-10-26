import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { payroll, personById } from '../content';
import { useGame } from '../store/game';
import { Avatar, Dialog } from './common';
import { Icon } from './icons';

export function Briefing() {
  const { begin, startTour } = useGame();
  const reduced = useGame((s) => s.settings.reducedMotion);
  const mode = useGame((s) => s.settings.mode);
  const tourDone = useGame((s) => s.settings.tourDone);
  const [i, setI] = useState(0);
  const coach = personById('coach');
  const last = i === payroll.briefing.length - 1;
  // The Next button is replaced on the last line, so move focus to the new main choice.
  useEffect(() => { if (last) document.querySelector<HTMLElement>('.brief-choice [data-autofocus]')?.focus(); }, [last]);
  return (
    <Dialog labelId="brief-h" className="briefing liquid-glass-strong" modal>
      <div className="brief-head">
        <Avatar id="coach" size={56} />
        <div><p className="eyebrow">Briefing · {mode === 'training' ? 'Training' : 'Certification'}</p><h2 id="brief-h">{coach.name}</h2><p className="muted">{coach.title}</p></div>
      </div>
      <motion.p key={i} className="brief-line" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">{payroll.briefing[i]}</motion.p>
      {last && (
        <ul className="objectives" aria-label="What you'll practice">
          {payroll.learningObjectives.map((o) => <li key={o}><Icon.check />{o}</li>)}
        </ul>
      )}
      <div className="brief-actions">
        <span className="muted" aria-hidden="true">{i + 1} / {payroll.briefing.length}</span>
        {!last ? <button className="btn btn--gold" onClick={() => setI(i + 1)} data-autofocus>Next <Icon.arrow /></button> : (
          <span className="brief-choice">
            {/* First run: the tour is the main path. After that, it stays one click away. */}
            <button className={`btn ${tourDone ? 'btn--ghost' : 'btn--gold'}`} onClick={startTour} data-testid="tour" data-autofocus={tourDone ? undefined : true}>Take the 1-minute tour</button>
            <button className={`btn ${tourDone ? 'btn--gold' : 'btn--ghost'}`} onClick={begin} data-testid="begin" data-autofocus={tourDone ? true : undefined}>Skip to work <Icon.arrow /></button>
          </span>
        )}
      </div>
    </Dialog>
  );
}
