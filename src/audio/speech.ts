/**
 * Opt-in "Answer out loud": the browser's own speech recognition turns one short answer into text.
 * The browser decides where recognition runs (Chrome uses Google's service, Safari uses Apple's), and
 * Settings says so. The game never sends or stores the audio itself; matching runs locally (match.ts).
 * We don't probe for on-device recognition: SpeechRecognition.available() crashes some Chromium builds.
 */
interface RecognitionAlternative { transcript: string }
interface RecognitionResult { readonly length: number; readonly isFinal: boolean; [i: number]: RecognitionAlternative }
interface RecognitionEvent { readonly resultIndex: number; readonly results: { readonly length: number; [i: number]: RecognitionResult } }
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface RecognitionCtor { new (): Recognition }

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechSupported = () => !!ctor();

export type ListenError = 'not-allowed' | 'no-speech' | 'network' | 'unsupported' | 'other';
export interface Listening {
  /** Final alternatives, best first; empty if nothing was heard. */
  result: Promise<string[]>;
  stop(): void;
}

export function listen(onInterim: (text: string) => void): Listening {
  const C = ctor();
  if (!C) return { result: Promise.reject<string[]>('unsupported' satisfies ListenError), stop: () => {} };
  const rec = new C();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let finals: string[] = [];
  const result = new Promise<string[]>((resolve, reject) => {
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals = Array.from({ length: r.length }, (_, k) => r[k].transcript.trim()).filter(Boolean);
        else onInterim(r[0]?.transcript ?? '');
      }
    };
    rec.onerror = (e) => {
      const code: ListenError = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'not-allowed'
        : e.error === 'no-speech' ? 'no-speech' : e.error === 'network' ? 'network' : 'other';
      reject(code);
    };
    rec.onend = () => resolve(finals);
  });
  try { rec.start(); } catch { /* already started or blocked: onerror reports it */ }
  return { result, stop: () => { try { rec.stop(); } catch { /* not started */ } } };
}
