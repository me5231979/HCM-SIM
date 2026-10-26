import { useSyncExternalStore } from 'react';
import { envelopes, voiceLine } from '../content';
import { useGame } from '../store/game';

/**
 * One shared audio element plays every recorded line, so only one character talks at a time.
 * Captions are always on screen; audio is an extra layer and never blocks progress.
 */
export type VoiceStatus = 'idle' | 'playing' | 'blocked';
export interface VoiceState { lineId: string | null; speaker: string | null; status: VoiceStatus }

const IDLE: VoiceState = { lineId: null, speaker: null, status: 'idle' };
// 10 ms of silent WAV, played inside the first tap to unlock the element (iOS Safari needs it).
const SILENCE = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

class VoicePlayer {
  private el: HTMLAudioElement | null = null;
  private state: VoiceState = IDLE;
  private listeners = new Set<() => void>();
  private done: (() => void) | null = null;
  private unlocked = false;
  private heard = new Set<string>();

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getState = () => this.state;

  private set(next: VoiceState) { this.state = next; this.listeners.forEach((fn) => fn()); }

  private element(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.el) {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.addEventListener('ended', () => this.finish());
      this.el.addEventListener('error', () => { if (this.state.status === 'playing') this.finish(); });
    }
    return this.el;
  }

  /** Call from the first tap or key press so later lines can start on their own. */
  unlock() {
    if (this.unlocked) return;
    const el = this.element();
    if (!el) return;
    this.unlocked = true;
    if (this.state.status === 'playing') return;
    el.src = SILENCE;
    el.play().then(() => el.pause()).catch(() => { this.unlocked = false; });
  }

  /**
   * Play the recording of a caption. Resolves when it ends, is stopped, or can't play.
   * once: a key that plays only the first time (reopening a request doesn't replay its opener).
   */
  say(speaker: string, text: string, opts: { once?: string } = {}): Promise<void> {
    const line = voiceLine(speaker, text);
    const { voices, voiceVolume } = useGame.getState().settings;
    if (!line || !voices) return Promise.resolve();
    if (opts.once) {
      if (this.heard.has(opts.once)) return Promise.resolve();
      this.heard.add(opts.once);
    }
    const el = this.element();
    if (!el) return Promise.resolve();
    this.finish();
    return new Promise<void>((resolve) => {
      this.done = resolve;
      el.src = `${import.meta.env.BASE_URL}audio/${line.id}.mp3`;
      el.volume = Math.max(0, Math.min(1, voiceVolume));
      this.set({ lineId: line.id, speaker, status: 'playing' });
      el.play().catch(() => {
        // Autoplay was refused (no tap yet). Keep the line so a Play button can start it.
        if (this.state.lineId === line.id) this.set({ lineId: line.id, speaker, status: 'blocked' });
        this.done = null;
        resolve();
      });
    });
  }

  /** Replay a line on request (always plays, even if heard before). */
  replay(speaker: string, text: string) { return this.say(speaker, text); }

  stop() {
    if (this.el && !this.el.paused) this.el.pause();
    this.finish();
  }

  private finish() {
    const done = this.done;
    this.done = null;
    if (this.state !== IDLE) this.set(IDLE);
    done?.();
  }

  /** Loudness of the current line right now, 0 to 1, read from its precomputed envelope. */
  level(): number {
    if (this.state.status !== 'playing' || !this.el || !this.state.lineId) return 0;
    const env = envelopes.lines[this.state.lineId];
    if (!env) return 0;
    const i = Math.floor(this.el.currentTime * envelopes.rate);
    const d = env.charCodeAt(Math.min(env.length - 1, Math.max(0, i))) - 48;
    return d / 9;
  }

  /** Let a once-only line play again, for example when it was cut off before anyone heard it. */
  forget(key: string) { this.heard.delete(key); }

  /** Forget which lines were heard (new run). */
  reset() { this.heard.clear(); this.stop(); }
}

export const voicePlayer = new VoicePlayer();

export function useVoice(): VoiceState {
  return useSyncExternalStore(voicePlayer.subscribe, voicePlayer.getState, voicePlayer.getState);
}
