import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { areas, personById, week } from '../content';
import { useGame } from '../store/game';
import { Dialog } from './common';
import { AreaGlyph, Icon } from './icons';
import { SpeakingAvatar, useSay, VoiceButton } from './Voice';

export function Briefing() {
  const { begin, startTour } = useGame();
  const reduced = useGame((s) => s.settings.reducedMotion);
  const mode = useGame((s) => s.settings.mode);
  const tourDone = useGame((s) => s.settings.tourDone);
  const [i, setI] = useState(0);
  const coach = personById('coach');
  const last = i === week.briefing.length - 1;
  useSay('coach', week.briefing[i]);
  // The Next button is replaced on the last line, so move focus to the new main choice.
  useEffect(() => { if (last) document.querySelector<HTMLElement>('.brief-choice [data-autofocus]')?.focus(); }, [last]);
  return (
    <Dialog labelId="brief-h" className="briefing liquid-glass-strong" modal>
      <div className="brief-head">
        <SpeakingAvatar id="coach" size={56} />
        <div><p className="eyebrow">Briefing · {mode === 'training' ? 'Training' : 'Certification'}</p><h2 id="brief-h">{coach.name}</h2><p className="muted">{coach.title}</p></div>
      </div>
      <motion.p key={i} className="brief-line" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">{week.briefing[i]}</motion.p>
      {last && (
        <ul className="area-chips area-chips--brief" aria-label="What you'll practice this week">
          {areas.map((a) => <li key={a.id} className="area-chip" title={a.practice}><AreaGlyph a={a.id} /><span>{a.short}</span></li>)}
        </ul>
      )}
      <div className="brief-actions">
        <span className="muted" aria-hidden="true">{i + 1} / {week.briefing.length}</span>
        <VoiceButton speaker="coach" text={week.briefing[i]} label="Replay" />
        {i > 0 && <button className="btn btn--ghost" onClick={() => setI(i - 1)}>Back</button>}
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
