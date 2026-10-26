import { assign, setup } from 'xstate';

/**
 * Mission flow for Payroll. The world simulation (clock, decisions, meters) lives in engine/game.ts;
 * this machine owns which phase the player is in and which transitions are legal.
 */
export type EndReason = 'approved' | 'cutoff';
export const payrollMachine = setup({
  types: {
    context: {} as { endReason: EndReason | null; beat: number; beats: number },
    events: {} as
      | { type: 'START' }
      | { type: 'BEGIN' }
      | { type: 'END'; reason: EndReason; beats: number }
      | { type: 'NEXT_BEAT' }
      | { type: 'SKIP_PAYDAY' }
      | { type: 'RESTART' },
  },
  guards: {
    moreBeats: ({ context }) => context.beat + 1 < context.beats,
  },
}).createMachine({
  id: 'payroll',
  initial: 'title',
  context: { endReason: null, beat: 0, beats: 0 },
  states: {
    title: { on: { START: 'briefing' } },
    briefing: { on: { BEGIN: 'playing', RESTART: 'title' } },
    playing: {
      on: {
        END: { target: 'payday', actions: assign(({ event }) => ({ endReason: event.reason, beats: event.beats, beat: 0 })) },
        RESTART: 'title',
      },
    },
    payday: {
      on: {
        NEXT_BEAT: [
          { guard: 'moreBeats', actions: assign(({ context }) => ({ beat: context.beat + 1 })) },
          { target: 'debrief' },
        ],
        SKIP_PAYDAY: 'debrief',
      },
    },
    debrief: { on: { RESTART: { target: 'title', actions: assign({ endReason: null, beat: 0, beats: 0 }) } } },
  },
});
export type PayrollPhase = 'title' | 'briefing' | 'playing' | 'payday' | 'debrief';
