import { z } from 'zod';
import type { LiveConversationT } from '../../content/schemas';

/**
 * Opt-in live conversation with an ElevenLabs agent. The SDK is loaded only when a player starts one,
 * after the consent screen, so nothing reaches the network until then.
 */
export type LiveMode = 'voice' | 'text';
export type LiveStatus = 'connecting' | 'listening' | 'speaking' | 'ended';
export interface LiveMessage { id: number; role: 'user' | 'agent'; text: string }

/** What the agent's record_outcome tool reports. Extra fields drive coaching notes. */
export const LiveOutcome = z.object({ outcome: z.string(), summary: z.string().default('') }).catchall(z.union([z.string(), z.boolean(), z.number()]));
export type LiveOutcomeT = z.infer<typeof LiveOutcome>;

export interface LiveHandlers {
  onStatus(s: LiveStatus): void;
  onMessage(m: Omit<LiveMessage, 'id'>): void;
  onOutcome(o: LiveOutcomeT): void;
  onEnd(reason: 'agent' | 'user' | 'error', message?: string): void;
}

export interface LiveSession {
  end(): Promise<void>;
  send(text: string): void;
  setMuted(muted: boolean): void;
  /** Agent and microphone loudness, 0 to 1 (always 0 in text mode). */
  outputLevel(): number;
  inputLevel(): number;
}

/** Captions follow the house style: no em or en dashes. */
export const tidy = (text: string) => text.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();

export async function startLive(conv: LiveConversationT, mode: LiveMode, h: LiveHandlers): Promise<LiveSession> {
  const { Conversation } = await import('@elevenlabs/client');
  h.onStatus('connecting');
  const session = await Conversation.startSession({
    agentId: conv.agentId,
    // The agents only accept connections that carry the site's Origin header, and only the WebSocket transport
    // sends it. The SDK would pick WebRTC for voice, which ElevenLabs refuses with "Client did not provide the origin header".
    connectionType: 'websocket',
    textOnly: mode === 'text',
    stripAudioTags: true,
    clientTools: {
      record_outcome: (params: unknown) => {
        const parsed = LiveOutcome.safeParse(params);
        if (parsed.success) h.onOutcome(parsed.data);
        return 'Recorded.';
      },
    },
    onConnect: () => h.onStatus('listening'),
    onModeChange: ({ mode: m }) => h.onStatus(m === 'speaking' ? 'speaking' : 'listening'),
    onMessage: ({ role, message }) => { const text = tidy(message); if (text) h.onMessage({ role, text }); },
    onDisconnect: (d) => h.onEnd(d.reason, d.reason === 'error' ? d.message : undefined),
  });
  return {
    end: () => session.endSession(),
    send: (text) => session.sendUserMessage(text),
    setMuted: (muted) => { if (mode === 'voice') session.setMicMuted(muted); },
    outputLevel: () => Math.min(1, session.getOutputVolume() * 1.6),
    inputLevel: () => Math.min(1, session.getInputVolume() * 1.6),
  };
}

/** Map the agent's report onto the decision: a choice id, or null when nothing was settled. */
export function resolveOutcome(conv: LiveConversationT, o: LiveOutcomeT) {
  const choiceId = conv.outcomes[o.outcome] ?? null;
  const notes = conv.coaching.filter((n) => o[n.field] === n.is);
  const extra: Record<string, number> = {};
  for (const n of notes) for (const [k, v] of Object.entries(n.deltas ?? {})) extra[k] = (extra[k] ?? 0) + (v ?? 0);
  return { choiceId, notes, extra: Object.keys(extra).length ? extra : undefined };
}
