import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { live, liveFor, personById } from '../content';
import { resolveOutcome, startLive, type LiveMessage, type LiveMode, type LiveOutcomeT, type LiveSession, type LiveStatus } from '../audio/live';
import { voicePlayer } from '../audio/voice';
import { useGame } from '../store/game';
import type { ActiveStep } from '../engine/game';
import type { DecisionT, LiveConversationT } from '../../content/schemas';
import { Dialog } from './common';
import { Icon } from './icons';
import { SpeakingAvatar, useLevel } from './Voice';

const micAvailable = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/** Turn SDK and browser errors into something a player can act on. */
function friendly(err: unknown): string {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
  if (/NotAllowed|Permission|denied/i.test(text)) return 'Your microphone is blocked for this site. Allow it in your browser, or type instead.';
  if (/NotFound|no.*device|Requested device/i.test(text)) return "We couldn't find a microphone. You can type instead.";
  if (/limit|quota|concurren|busy|429/i.test(text)) return "Live practice is busy or has reached today's limit. Try again later, or choose your answer from the options.";
  if (/origin|allowlist|forbidden|403/i.test(text)) return "Live practice only runs on the game's own site. You can still choose your answer from the options.";
  return "The conversation couldn't connect or continue. You can try again, type instead, or choose your answer from the options.";
}

/** Shown with a decision that has a live conversation. Talking is optional; the options below still work. */
export function LiveOffer({ step, d, disabled }: { step: ActiveStep; d: DecisionT; disabled: boolean }) {
  const conv = liveFor(step.id, d.id);
  const enabled = useGame((s) => s.settings.live);
  const [mode, setMode] = useState<LiveMode | null>(null);
  if (!conv || !enabled) return null;
  const first = personById(conv.speaker).name.split(' ')[0];
  const mic = micAvailable();
  return (
    <div className="live-offer">
      <SpeakingAvatar id={conv.speaker} size={44} />
      <div className="live-offer-body">
        <p className="eyebrow"><Icon.chat /> Live practice, optional</p>
        <h3>{conv.title}</h3>
        <p className="muted">{conv.pitch}</p>
        <div className="live-offer-actions">
          <button type="button" className="btn btn--ghost btn--sm" disabled={disabled || !mic} onClick={() => setMode('voice')} data-testid="live-voice"><Icon.mic /> Talk out loud</button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={disabled} onClick={() => setMode('text')} data-testid="live-text"><Icon.keyboard /> Type to {first}</button>
        </div>
        {!mic && <p className="fine">This browser can't share a microphone here, so typing is the way in.</p>}
        <p className="fine">Uses an outside voice service; you'll see what's shared before anything connects. Or choose your answer below. Talking to {first} is never required.</p>
      </div>
      {mode && createPortal(<><div className="live-backdrop" aria-hidden="true" /><LiveDialog conv={conv} step={step} d={d} initialMode={mode} onClose={() => setMode(null)} /></>, document.body)}
    </div>
  );
}

type Phase = 'consent' | 'connecting' | 'talking' | 'outcome' | 'unresolved' | 'error';

function LiveDialog({ conv, step, d, initialMode, onClose }: { conv: LiveConversationT; step: ActiveStep; d: DecisionT; initialMode: LiveMode; onClose: () => void }) {
  const consented = useGame((s) => s.settings.liveConsent);
  const setSettings = useGame((s) => s.setSettings);
  const setPanel = useGame((s) => s.setPanel);
  const recordLive = useGame((s) => s.recordLive);
  const person = personById(conv.speaker);
  const first = person.name.split(' ')[0];
  const [mode, setMode] = useState<LiveMode>(initialMode);
  const [attempt, setAttempt] = useState(consented ? 1 : 0);
  const [phase, setPhase] = useState<Phase>(consented ? 'connecting' : 'consent');
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [outcome, setOutcome] = useState<LiveOutcomeT | null>(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [left, setLeft] = useState(conv.maxSeconds);
  const [draft, setDraft] = useState('');
  const session = useRef<LiveSession | null>(null);
  const settled = useRef(false);
  const nextId = useRef(1);
  const lastTyped = useRef('');
  const logRef = useRef<HTMLOListElement>(null);
  const micRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // The sim clock waits while you talk, and no recorded line talks over the conversation.
  useEffect(() => { voicePlayer.stop(); setPanel({ liveOpen: true }); return () => setPanel({ liveOpen: false }); }, [setPanel]);

  useEffect(() => {
    if (attempt === 0) return;
    let cancelled = false;
    settled.current = false;
    startLive(conv, mode, {
      onStatus: (s) => { if (cancelled) return; setStatus(s); if (s !== 'connecting') setPhase((p) => (p === 'connecting' ? 'talking' : p)); },
      onMessage: (m) => {
        if (cancelled) return;
        // Typed messages are shown on send; skip the server's echo of the same words.
        if (m.role === 'user' && lastTyped.current && m.text === lastTyped.current) { lastTyped.current = ''; return; }
        setMessages((list) => [...list, { ...m, id: nextId.current++ }]);
      },
      onOutcome: (o) => {
        if (cancelled || settled.current) return;
        settled.current = true;
        setOutcome(o);
        setPhase('outcome');
        void session.current?.end();
      },
      onEnd: (reason, message) => {
        if (cancelled) return;
        setStatus('ended');
        if (settled.current) return;
        settled.current = true;
        if (reason === 'error') { setError(friendly(message)); setPhase('error'); } else setPhase('unresolved');
      },
    }).then((s) => {
      if (cancelled) void s.end(); else session.current = s;
    }).catch((e: unknown) => {
      if (cancelled) return;
      settled.current = true;
      setError(friendly(e));
      setPhase('error');
    });
    return () => { cancelled = true; void session.current?.end(); session.current = null; };
  }, [attempt, conv, mode]);

  // The service stops each conversation at the cap; the countdown shows how long is left.
  useEffect(() => {
    if (phase !== 'talking') return;
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => { if (left === 0) void session.current?.end(); }, [left]);

  // Each new stage puts focus on its main control, so keyboard and screen reader users land in the right place,
  // and a result scrolls into view.
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    bodyRef.current?.querySelector('.live-result')?.scrollIntoView({ block: 'start' });
  }, [phase]);

  useEffect(() => { logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  const outputLevel = useCallback(() => session.current?.outputLevel() ?? 0, []);
  const inputLevel = useCallback(() => session.current?.inputLevel() ?? 0, []);
  useLevel(micRef, 'you', phase === 'talking' && mode === 'voice' && !muted ? inputLevel : undefined);

  const agree = (m: LiveMode) => { setSettings({ liveConsent: true }); setMode(m); setPhase('connecting'); setAttempt((n) => n + 1); };
  const retry = (m: LiveMode) => { setMessages([]); setOutcome(null); setError(''); setLeft(conv.maxSeconds); setMode(m); setPhase('connecting'); setStatus('connecting'); setAttempt((n) => n + 1); };
  const send = () => {
    const text = draft.trim();
    if (!text || !session.current) return;
    lastTyped.current = text;
    setMessages((list) => [...list, { id: nextId.current++, role: 'user', text }]);
    session.current.send(text);
    setDraft('');
  };
  const close = () => { void session.current?.end(); onClose(); };

  const resolved = outcome ? resolveOutcome(conv, outcome) : null;
  const choice = resolved?.choiceId ? d.choices.find((c) => c.id === resolved.choiceId) : undefined;
  const talking = phase === 'talking' || phase === 'connecting';
  const statusText = status === 'connecting' ? `Connecting to ${first}…` : status === 'speaking' ? `${first} is talking` : status === 'listening' ? (mode === 'voice' ? 'Your turn. Speak, or type below.' : 'Your turn. Type your reply.') : 'Conversation ended';
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <Dialog labelId="live-h" onClose={close} className="modal modal--wide liquid-glass-strong live" modal>
      <div ref={bodyRef}>
      <div className="live-head">
        <SpeakingAvatar id={conv.speaker} size={64} level={talking && mode === 'voice' ? outputLevel : undefined} speaking={status === 'speaking'} />
        <div>
          <p className="eyebrow">Live practice · {person.name}, {person.title}</p>
          <h2 id="live-h">{phase === 'consent' ? <>Talk it through, <em>live</em>.</> : <>{conv.title.replace(/ with .*$/, '')} with <em>{first}</em>.</>}</h2>
          {phase !== 'consent' && (
            <p className={`live-status st-${status}`} role="status">
              {status === 'speaking' ? <Icon.volume /> : status === 'listening' ? (mode === 'voice' ? <Icon.mic /> : <Icon.keyboard />) : <Icon.clock />}
              {statusText}
              {phase === 'talking' && <span className="live-timer" aria-label={`${mm} left`}>{mm} left</span>}
            </p>
          )}
        </div>
      </div>

      {phase === 'consent' && (
        <div className="live-consent">
          <p>{conv.pitch}</p>
          <h3>Before you start</h3>
          <ul className="live-points">{live.privacy.points.map((p) => <li key={p}><Icon.check />{p}</li>)}</ul>
          <div className="live-actions">
            {mode === 'voice' ? <>
              <button className="btn btn--gold" onClick={() => agree('voice')} data-testid="live-agree" data-autofocus><Icon.mic /> I agree. Talk out loud</button>
              <button className="btn btn--ghost" onClick={() => agree('text')}><Icon.keyboard /> I agree. Type instead</button>
            </> : <>
              <button className="btn btn--gold" onClick={() => agree('text')} data-testid="live-agree" data-autofocus><Icon.keyboard /> I agree. Start typing</button>
              {micAvailable() && <button className="btn btn--ghost" onClick={() => agree('voice')}><Icon.mic /> I agree. Talk out loud</button>}
            </>}
            <button className="btn btn--ghost" onClick={close}>Not now</button>
          </div>
        </div>
      )}

      {phase !== 'consent' && (
        <ol ref={logRef} className={`live-log ${talking ? '' : 'is-done'}`} role="log" aria-live="polite" aria-label={`Conversation with ${person.name}`}>
          {messages.map((m) => (
            <li key={m.id} className={`msg msg--${m.role}`}><span className="msg-who">{m.role === 'agent' ? first : 'You'}</span><p>{m.text}</p></li>
          ))}
          {messages.length === 0 && phase === 'connecting' && <li className="msg msg--system"><p>Connecting. {first} will open the conversation.</p></li>}
        </ol>
      )}

      {phase === 'talking' && (
        <div className="live-controls">
          {/* The dialog is portaled out of the decision form, but React events still bubble to it: stop them here. */}
          <form className="live-input" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); send(); }}>
            <label htmlFor="live-text" className="sr-only">Your reply to {first}</label>
            <input id="live-text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={mode === 'voice' ? 'Or type a reply' : `Type your reply to ${first}`} autoComplete="off" data-autofocus={mode === 'text' ? true : undefined} data-testid="live-input" />
            <button className="btn btn--gold btn--sm" type="submit" disabled={!draft.trim()}>Send</button>
          </form>
          <div className="live-buttons">
            {mode === 'voice' && (
              <button className="btn btn--ghost btn--sm" aria-pressed={muted} data-autofocus onClick={() => { const m = !muted; setMuted(m); session.current?.setMuted(m); }}>
                {muted ? <Icon.micOff /> : <Icon.mic />}{muted ? 'Mic off' : 'Mic on'}
                <span ref={micRef} className="mic-meter" aria-hidden="true"><span /></span>
              </button>
            )}
            <button className="btn btn--ghost btn--sm" onClick={() => { void session.current?.end(); }} data-testid="live-end"><Icon.stop /> End conversation</button>
          </div>
        </div>
      )}

      {phase === 'outcome' && resolved && (
        <div className="live-result" data-testid="live-result">
          <h3>{first}'s takeaway</h3>
          {outcome?.summary && <p className="live-summary">{outcome.summary}</p>}
          {choice ? (
            <div className="live-choice"><p className="fine">This records your answer as</p><p>{choice.text}</p></div>
          ) : <p>You and {first} didn't settle it. Choose your answer from the options.</p>}
          {resolved.notes.length > 0 && (
            <ul className="live-notes">{resolved.notes.map((n) => <li key={n.text} className={n.good ? 'is-good' : 'is-bad'}>{n.good ? <Icon.check /> : <Icon.alert />}<span><span className="sr-only">{n.good ? 'Strength: ' : 'Next time: '}</span>{n.text}</span></li>)}</ul>
          )}
          <div className="live-actions">
            {choice && <button className="btn btn--gold" data-autofocus data-testid="live-record" onClick={() => {
              onClose();
              recordLive(step.id, d.id, choice.id, resolved.extra, { summary: outcome?.summary ?? '', notes: resolved.notes.map((n) => ({ good: n.good, text: n.text })) });
            }}>Record this answer</button>}
            <button className="btn btn--ghost" onClick={close}>{choice ? 'Choose my answer instead' : 'Back to the options'}</button>
          </div>
        </div>
      )}

      {phase === 'unresolved' && (
        <div className="live-result">
          <h3>No decision yet</h3>
          <p>The conversation ended before you and {first} settled what happens to the time card. Choose your answer from the options, or try the conversation again.</p>
          <div className="live-actions">
            <button className="btn btn--gold" onClick={close} data-autofocus>Back to the options</button>
            <button className="btn btn--ghost" onClick={() => retry(mode)}>Talk again</button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="live-result" role="alert">
          <h3><Icon.alert /> Live practice isn't available right now</h3>
          <p>{error}</p>
          <div className="live-actions">
            <button className="btn btn--gold" onClick={close} data-autofocus>Back to the options</button>
            {mode === 'voice' && <button className="btn btn--ghost" onClick={() => retry('text')}><Icon.keyboard /> Type instead</button>}
            <button className="btn btn--ghost" onClick={() => retry(mode)}>Try again</button>
          </div>
        </div>
      )}
      </div>
    </Dialog>
  );
}

/** Under a decision's feedback: what the live conversation settled. */
export function LiveRecap({ stepId, decisionId }: { stepId: string; decisionId: string }) {
  const r = useGame((s) => s.liveResults[`${stepId}.${decisionId}`]);
  if (!r) return null;
  return (
    <div className="live-recap">
      <p className="fb-head"><Icon.chat /> From your live conversation</p>
      {r.summary && <p>{r.summary}</p>}
      {r.notes.length > 0 && <ul className="live-notes">{r.notes.map((n) => <li key={n.text} className={n.good ? 'is-good' : 'is-bad'}>{n.good ? <Icon.check /> : <Icon.alert />}<span><span className="sr-only">{n.good ? 'Strength: ' : 'Next time: '}</span>{n.text}</span></li>)}</ul>}
    </div>
  );
}
