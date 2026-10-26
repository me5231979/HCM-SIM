import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { calendarFor } from '../content';
import { clockLabel, countdownLabel, dateLabel, urgency, workMinutesBetween } from '../engine/clock';
import { METERS } from '../engine/scoring';
import { caughtUp, inboxItems, useGame } from '../store/game';
import { Icon, MeterGlyph } from './icons';
import { Dialog } from './common';
import { activateHotspot } from '../scene/actions';
import { voicePlayer } from '../audio/voice';
import type { MeterKey } from '../../content/schemas';

const PLACES: { id: string; label: string }[] = [
  { id: 'terminal', label: 'Your desk' },
  { id: 'board', label: 'Bulletin board' },
  { id: 'office_a', label: "Dana's office" },
  { id: 'office_b', label: "Marcus's office" },
  { id: 'office_c', label: "Director's office" },
];

const U_TEXT = { normal: 'On track', warning: 'Last workday', critical: 'Final 4 hours', closed: 'Deadline passed' } as const;

function Meter({ k, label, value, lowerIsBetter }: { k: MeterKey; label: string; value: number; lowerIsBetter: boolean }) {
  const prev = useRef(value);
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    if (value !== prev.current) { setDelta(value - prev.current); prev.current = value; const t = setTimeout(() => setDelta(null), 1800); return () => clearTimeout(t); }
  }, [value]);
  const good = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
  return (
    <div className="meter" role="group" aria-label={`${label}: ${value}${lowerIsBetter ? ', lower is better' : ''}`}>
      <span className="meter-icon"><MeterGlyph k={k} /></span>
      <span className="meter-num">{value}</span>
      <span className="meter-label">{label}</span>
      <span className="meter-bar" aria-hidden="true"><span style={{ width: `${value}%` }} /></span>
      <AnimatePresence>
        {delta !== null && (
          <motion.span className={`meter-delta ${good ? 'is-good' : 'is-bad'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} aria-hidden="true">
            {good ? <Icon.check /> : <Icon.alert />}{delta > 0 ? `+${delta}` : delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A labeled tool button: the visible label is also its accessible name. Secondary tools move into More on phones. */
function Tool({ icon, label, onClick, pressed, disabled, testId, title, secondary, expanded }: { icon: ReactNode; label: string; onClick: () => void; pressed?: boolean; disabled?: boolean; testId?: string; title?: string; secondary?: boolean; expanded?: boolean }) {
  return (
    <button className={`tool ${secondary ? 'tool--secondary' : ''}`} onClick={onClick} aria-pressed={pressed} aria-expanded={expanded} disabled={disabled} data-testid={testId} title={title}>
      {icon}<span className="tool-label">{label}</span>
    </button>
  );
}

/** Shown when nothing is waiting, so the player is never left wondering what to do. One overlay at a time. */
export function CaughtUp() {
  const s = useGame();
  const { caughtUp: idle, more } = caughtUp(s);
  if (!idle || s.phase !== 'playing' || s.openStepId || s.openNoiseId || s.inboxOpen || s.dayNotice || s.liveOpen) return null;
  const manual = s.settings.speed === 'manual';
  const unreadFyi = inboxItems(s).filter((i) => i.kind === 'noise' && i.unread).length;
  const skip = () => { s.skipToNext(); s.setPanel({ inboxOpen: true }); };
  return (
    <div className="caught-up liquid-glass" role="status">
      <Icon.check />
      {more ? (
        <>
          <span>{unreadFyi > 0 ? `No requests waiting. ${unreadFyi} unread FYI in your inbox.` : manual ? "You're caught up. Press Skip to move to the next request." : "You're caught up. Time is moving faster until the next request."}</span>
          {unreadFyi > 0 && <button className="btn btn--ghost btn--sm" onClick={() => s.setPanel({ inboxOpen: true })}>Open inbox</button>}
          <button className="btn btn--ghost btn--sm" onClick={skip} data-testid="skip-next">Skip to next request</button>
        </>
      ) : (
        <>
          <span>That's everything for this week. Payroll signs off when time cards are due.</span>
          <button className="btn btn--gold btn--sm" onClick={s.finishPeriod} data-testid="finish">Finish the week</button>
        </>
      )}
    </div>
  );
}

/** A new workday: how yesterday went, what's due today, and a natural place to stop. The clock waits for it. */
export function DayNotice() {
  const notice = useGame((s) => s.dayNotice);
  if (!notice) return null;
  const close = () => useGame.getState().setPanel({ dayNotice: null });
  return (
    <Dialog labelId="day-h" onClose={close} className="modal liquid-glass-strong day-recap">
      <p className="eyebrow">{notice.weekend ? 'The weekend passes' : 'A new day'}</p>
      <h2 id="day-h">{notice.today}</h2>
      <p className="day-yesterday">{notice.yesterday}: <strong>{notice.handled}</strong> {notice.handled === 1 ? 'request' : 'requests'} handled{notice.missed > 0 && <>, <strong className="is-bad"><Icon.clock /> {notice.missed} missed</strong></>}.</p>
      {notice.deadlines.length > 0 && <p className="day-deadlines"><Icon.alert /> {notice.deadlines.join(' ')}</p>}
      {notice.dueToday.length > 0 ? (
        <>
          <h3>Due today</h3>
          <ul className="day-due">{notice.dueToday.map((d) => <li key={d.id}><span className="dd-time">{clockLabel(d.at)}</span>{d.title}</li>)}</ul>
        </>
      ) : <p className="muted">Nothing is due today yet. New requests will arrive through the day.</p>}
      <p className="fine">Your progress is saved. You can stop here and resume from the title screen.</p>
      <button className="btn btn--gold" onClick={close} data-autofocus data-testid="start-day">Start the day <Icon.arrow /></button>
    </Dialog>
  );
}

export function HUD({ zoomStep, setZoom }: { zoomStep: number; setZoom: (n: number) => void }) {
  const s = useGame();
  const { snap, game, settings } = s;
  const [more, setMore] = useState(false);
  if (!snap || !game) return null;
  const items = inboxItems(s);
  const unread = items.filter((i) => i.unread).length;
  const openCount = (loc: string) => snap.steps.filter((st) => st.location === loc && game.status(st) === 'open').length;
  const timed = !s.liveOpen && !(settings.mode === 'training' && (s.openStepId || s.binderOpen || s.settingsOpen || s.helpOpen || s.openNoiseId));
  const { caughtUp: idle } = caughtUp(s);
  const clockNote = s.liveOpen ? 'Clock paused while you talk' : settings.speed === 'manual' ? 'Manual clock: Skip moves ahead' : s.paused ? 'Paused' : !timed ? 'Clock paused while you read' : idle ? 'Caught up: time is moving faster' : null;
  const inert = s.phase === 'tour';
  const biweekly = calendarFor('biweekly');

  return (
    <>
      <header className="hud-top" inert={inert || undefined}>
        <div className="hud-clock liquid-glass" aria-label={`${dateLabel(snap.time)}, ${clockLabel(snap.time)}. Week of Oct 19, biweekly ${biweekly.period}.`}>
          <span className="hud-day">{dateLabel(snap.time)}</span>
          <span className="hud-time">{clockLabel(snap.time)}</span>
          <span className="hud-sub">Week of Oct 19 · {biweekly.period}</span>
          {clockNote && <span className="hud-sub hud-note">{clockNote}</span>}
        </div>
        <div className="hud-deadlines">
          {snap.deadlines.filter((d) => d.hud).map((d) => {
            const u = urgency(snap.time, d.time);
            const left = workMinutesBetween(snap.time, d.time);
            return (
              <div key={d.key} className={`hud-cutoff liquid-glass u-${u}`} aria-label={`${d.label}: ${dateLabel(d.time)} at ${clockLabel(d.time)}. ${u === 'closed' ? 'Closed' : `${countdownLabel(left)} of work time left`}. ${U_TEXT[u]}.`}>
                <span className="hud-cut-label">{d.label}</span>
                <span className="hud-cut-when">{dateLabel(d.time)}, {clockLabel(d.time)}</span>
                <span className="hud-count">{countdownLabel(left)}</span>
                <span className="hud-ustate">{u === 'normal' || u === 'closed' ? <Icon.clock /> : <Icon.alert />}{U_TEXT[u]}</span>
              </div>
            );
          })}
        </div>
        <div className="hud-meters liquid-glass" aria-label="Meters">
          {METERS.map((m) => <Meter key={m.key} k={m.key} label={m.short} value={snap.meters[m.key]} lowerIsBetter={m.lowerIsBetter} />)}
        </div>
      </header>

      <nav className="hud-bottom" aria-label="Game controls" inert={inert || undefined}>
        <button className="btn btn--glass inbox-btn" onClick={() => s.setPanel({ inboxOpen: !s.inboxOpen })} aria-expanded={s.inboxOpen} data-testid="inbox">
          <Icon.inbox /> Inbox {unread > 0 && <span className="badge">{unread}<span className="sr-only"> unread</span></span>}
        </button>
        {settings.view === '3d' && (
          <ul className="places liquid-glass" aria-label="Places">
            {PLACES.map((p) => {
              const n = openCount(p.id);
              return (
                <li key={p.id}>
                  <button className={`place ${n ? 'has-task' : ''}`} onClick={() => activateHotspot(p.id)}>
                    {n > 0 && <Icon.pin />}{p.label}{n > 0 && <span className="badge">{n}<span className="sr-only"> waiting</span></span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={`hud-tools liquid-glass ${more ? 'is-more' : ''}`} onKeyDown={(e) => { if (e.key === 'Escape' && more) { e.stopPropagation(); setMore(false); } }}>
          <Tool icon={<Icon.skip />} label="Skip" onClick={s.skipToNext} testId="skip" title="Skip ahead to the next request" />
          <Tool icon={s.paused ? <Icon.play /> : <Icon.pause />} label={s.paused ? 'Play' : 'Pause'} onClick={s.togglePause} pressed={s.paused} title={settings.mode === 'certification' ? 'Pause (logged, not penalized)' : 'Pause the clock'} />
          {settings.view === '3d' && <>
            <Tool icon={<Icon.minus />} label="Zoom out" onClick={() => setZoom(Math.max(0, zoomStep - 1))} disabled={zoomStep === 0} secondary />
            <Tool icon={<Icon.plus />} label="Zoom in" onClick={() => setZoom(Math.min(2, zoomStep + 1))} disabled={zoomStep === 2} secondary />
          </>}
          <Tool icon={settings.view === '3d' ? <Icon.list /> : <Icon.cube />} label={settings.view === '3d' ? 'List view' : '3D view'} onClick={() => s.setSettings({ view: settings.view === '3d' ? '2d' : '3d' })} secondary />
          <Tool icon={<Icon.book />} label="Binder" onClick={() => s.setPanel({ binderOpen: true })} title="Policy Binder" secondary />
          <Tool icon={settings.voices ? <Icon.volume /> : <Icon.mute />} label="Voices" pressed={settings.voices} testId="voices" secondary
            onClick={() => { if (settings.voices) voicePlayer.stop(); s.setSettings({ voices: !settings.voices }); }} title={settings.voices ? 'Character voices are on. Captions always show.' : 'Character voices are off. Captions always show.'} />
          <Tool icon={<Icon.gear />} label="Settings" onClick={() => s.setPanel({ settingsOpen: true })} secondary />
          <Tool icon={<Icon.help />} label="Help" onClick={() => s.setPanel({ helpOpen: true })} testId="help" title="Symbols, controls, and the tour" />
          <button className="tool tool--more" aria-expanded={more} onClick={() => setMore(!more)} data-testid="more"><Icon.more /><span className="tool-label">{more ? 'Less' : 'More'}</span></button>
        </div>
      </nav>
    </>
  );
}
