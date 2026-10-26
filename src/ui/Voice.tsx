import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import { personById, voiceLine } from '../content';
import { useVoice, voicePlayer } from '../audio/voice';
import { useGame } from '../store/game';
import { Avatar } from './common';
import { Icon } from './icons';

/**
 * While `speaker` talks, writes their loudness (0 to 1) to the --level CSS variable on `ref` every frame.
 * `source` reads loudness from somewhere else, such as a live conversation. Returns whether they're talking.
 */
export function useLevel(ref: RefObject<HTMLElement | null>, speaker: string, source?: () => number): boolean {
  const { speaker: current, status } = useVoice();
  const reduced = useGame((s) => s.settings.reducedMotion);
  const active = source ? true : current === speaker && status === 'playing';
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active || reduced) { el.style.setProperty('--level', active ? '0.35' : '0'); return; }
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      const target = source ? source() : voicePlayer.level();
      smooth += (target - smooth) * 0.35;
      el.style.setProperty('--level', smooth.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); el.style.setProperty('--level', '0'); };
  }, [active, reduced, ref, source]);
  return active;
}

/** Avatar with a gold halo that breathes with the voice. With reduced motion the halo holds still. */
export function SpeakingAvatar({ id, size = 40, level, speaking }: { id: string; size?: number; level?: () => number; speaking?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const talking = useLevel(ref, id, level);
  const on = speaking ?? talking;
  return (
    <span ref={ref} className={`speaker ${on ? 'is-speaking' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className="halo" />
      <Avatar id={id} size={size} />
    </span>
  );
}

/** Play or stop the recording of one caption. Hidden when voices are off or the line has no recording. */
export function VoiceButton({ speaker, text, label = 'Hear it' }: { speaker: string; text: string; label?: string }) {
  const v = useVoice();
  const voices = useGame((s) => s.settings.voices);
  const line = voiceLine(speaker, text);
  if (!line || !voices) return null;
  const mine = v.lineId === line.id;
  const playing = mine && v.status === 'playing';
  const blocked = mine && v.status === 'blocked';
  return (
    <button type="button" className={`voice-btn ${blocked ? 'is-blocked' : ''}`} onClick={() => (playing ? voicePlayer.stop() : void voicePlayer.replay(speaker, text))}>
      {playing ? <Icon.stop /> : <Icon.volume />}{playing ? 'Stop' : blocked ? 'Tap to hear' : label}
    </button>
  );
}

/** Plays a caption when it appears, and stops it if the caption goes away first. */
export function useSay(speaker: string | null | undefined, text: string | null | undefined, opts: { auto?: boolean; once?: string } = {}) {
  const { auto = true, once } = opts;
  useEffect(() => {
    if (!auto || !speaker || !text) return;
    void voicePlayer.say(speaker, text, { once });
    const id = voiceLine(speaker, text)?.id;
    return () => {
      if (!id || voicePlayer.getState().lineId !== id) return;
      // Cut off before it finished: stop it, and let a once-only line play again next time.
      voicePlayer.stop();
      if (once) voicePlayer.forget(once);
    };
  }, [speaker, text, auto, once]);
}

/** A voiced quote: who said it, the caption, and a play button. The note variant is a compact voice message. */
export function Quote({ speaker, text, auto = false, once, className = '', note = false }: { speaker: string; text: string; auto?: boolean; once?: string; className?: string; note?: boolean }) {
  const p = personById(speaker);
  useSay(speaker, text, { auto, once });
  return (
    <figure className={`quote ${note ? 'quote--note' : ''} ${className}`}>
      <SpeakingAvatar id={speaker} size={note ? 32 : 40} />
      <div className="quote-body">
        <figcaption className="quote-name">{note ? <>Voice note · {p.name}</> : <>{p.name} <span className="muted">· {p.title}</span></>}</figcaption>
        <blockquote>"{text}"</blockquote>
        <VoiceButton speaker={speaker} text={text} />
      </div>
    </figure>
  );
}

/** Someone says hello when you click them with nothing waiting. Shown briefly near the bottom; the store announces it. */
export function Bubble() {
  const bubble = useGame((s) => s.bubble);
  const reduced = useGame((s) => s.settings.reducedMotion);
  useSay(bubble?.speaker, bubble?.text);
  useEffect(() => {
    if (!bubble) return;
    const t = setTimeout(() => useGame.getState().setPanel({ bubble: null }), 6000);
    return () => clearTimeout(t);
  }, [bubble]);
  return (
    <AnimatePresence>
      {bubble && (
        <motion.div key={bubble.id} className="bubble liquid-glass-strong" aria-hidden="true"
          initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }}>
          <SpeakingAvatar id={bubble.speaker} size={36} />
          <p><strong>{personById(bubble.speaker).name}:</strong> "{bubble.text}"</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
