import { useEffect, useRef, useState } from 'react';
import { matchAny } from '../audio/match';
import { listen, speechSupported, type ListenError, type Listening } from '../audio/speech';
import { voicePlayer } from '../audio/voice';
import { useGame } from '../store/game';
import { Icon } from './icons';

const PROBLEM: Record<ListenError, string> = {
  'not-allowed': 'Your microphone is blocked for this site. Allow it in your browser, or click an option.',
  'no-speech': "I didn't hear anything. Try again, or click an option.",
  network: "Your browser's speech service isn't reachable right now. Click an option instead.",
  unsupported: "This browser can't listen for answers. Click an option instead.",
  other: "Listening stopped unexpectedly. Try again, or click an option.",
};

/**
 * Opt-in: say an option number or the answer itself. A match only selects the option;
 * the player still confirms with Decide, so a misheard word never records a decision.
 */
export function SayAnswer({ options, onPick, disabled }: { options: { id: string; text: string }[]; onPick: (id: string) => void; disabled: boolean }) {
  const enabled = useGame((s) => s.settings.speakBack);
  const [state, setState] = useState<'idle' | 'listening' | 'heard' | 'missed' | 'error'>('idle');
  const [interim, setInterim] = useState('');
  const [heard, setHeard] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [problem, setProblem] = useState('');
  const session = useRef<Listening | null>(null);
  useEffect(() => () => session.current?.stop(), []);
  if (!enabled || !speechSupported()) return null;

  const start = () => {
    voicePlayer.stop();
    setState('listening');
    setInterim('');
    const s = listen(setInterim);
    session.current = s;
    s.result.then((alternatives) => {
      const m = matchAny(alternatives, options.map((o) => o.text));
      setHeard(m?.heard ?? alternatives[0] ?? '');
      if (!m) { setState('missed'); return; }
      setPicked(m.match.index);
      setState('heard');
      onPick(options[m.match.index].id);
    }).catch((code: ListenError) => { setProblem(PROBLEM[code] ?? PROBLEM.other); setState('error'); });
  };

  return (
    <div className="say-answer">
      <button type="button" className={`btn btn--sm ${state === 'listening' ? 'btn--gold' : 'btn--ghost'}`} disabled={disabled} data-testid="say-answer"
        onClick={state === 'listening' ? () => session.current?.stop() : start}>
        {state === 'listening' ? <><Icon.stop /> Stop listening</> : <><Icon.mic /> Say your answer</>}
      </button>
      <p className="say-status" role="status">
        {state === 'idle' && <span className="muted">Say an option number, like "option two", or the answer in your own words.</span>}
        {state === 'listening' && <><span className="listening-dot" aria-hidden="true" />Listening{interim ? <>: <q>{interim}</q></> : '...'}</>}
        {state === 'heard' && picked !== null && <><Icon.check /> Heard <q>{heard}</q>. Option {picked + 1} is selected. Press Decide to confirm.</>}
        {state === 'missed' && <><Icon.alert /> {heard ? <>Heard <q>{heard}</q>, but it didn't match an option.</> : "I didn't catch that."} Try again, or say an option number.</>}
        {state === 'error' && <><Icon.alert /> {problem}</>}
      </p>
    </div>
  );
}
