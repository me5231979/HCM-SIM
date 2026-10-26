import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { department } from '../content';
import { clockLabel, countdownLabel, dayOf, urgency, workMinutesBetween } from '../engine/clock';
import { METERS } from '../engine/scoring';
import { inboxItems, useGame } from '../store/game';
import { Icon, MeterGlyph } from './icons';
import { activateHotspot } from '../scene/actions';
import type { MeterKey } from '../../content/schemas';

export const dayLabel = (t: number) => department.payPeriod.days[dayOf(t) - 1] ?? department.payPeriod.payDate;

const PLACES: { id: string; label: string }[] = [
  { id: 'terminal', label: 'Your desk' },
  { id: 'board', label: 'Bulletin board' },
  { id: 'office_a', label: "Dana's office" },
  { id: 'office_b', label: "Marcus's office" },
  { id: 'office_c', label: "Director's office" },
];

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
      <span className="meter-label">{label}{lowerIsBetter && <span className="meter-hint"> (low is good)</span>}</span>
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

export function HUD({ zoomStep, setZoom }: { zoomStep: number; setZoom: (n: number) => void }) {
  const s = useGame();
  const { snap, game, settings } = s;
  if (!snap || !game) return null;
  const u = urgency(snap.time, snap.cutoff);
  const left = workMinutesBetween(snap.time, snap.cutoff);
  const items = inboxItems(s);
  const unread = items.filter((i) => i.unread).length;
  const openCount = (loc: string) => snap.steps.filter((st) => st.location === loc && game.status(st) === 'open').length;
  const uText = { normal: 'On track', warning: 'Under 24 hours', critical: 'Final 4 hours', closed: 'Closed' }[u];
  const timed = !(settings.mode === 'training' && (s.openStepId || s.binderOpen || s.settingsOpen || s.openNoiseId));

  return (
    <>
      <header className="hud-top">
        <div className="hud-clock liquid-glass" aria-label={`${dayLabel(snap.time)}, ${clockLabel(snap.time)}. Day ${dayOf(snap.time)} of 10.`}>
          <span className="hud-day">{dayLabel(snap.time)}</span>
          <span className="hud-time">{clockLabel(snap.time)}</span>
          <span className="hud-sub">Day {dayOf(snap.time)} of 10{!timed && ' · clock paused while you read'}{s.paused && ' · paused'}</span>
        </div>
        <div className={`hud-cutoff liquid-glass u-${u}`} aria-label={`Payroll cutoff Friday 5:00 PM. ${countdownLabel(left)} of work time left. ${uText}.`}>
          <span className="hud-cut-label">Payroll cutoff · Fri 5:00 PM</span>
          <span className="hud-count">{countdownLabel(left)}</span>
          <span className="hud-ustate">{u === 'normal' ? <Icon.clock /> : <Icon.alert />}{uText}</span>
        </div>
        <div className="hud-meters liquid-glass" aria-label="Meters">
          {METERS.map((m) => <Meter key={m.key} k={m.key} label={m.short} value={snap.meters[m.key]} lowerIsBetter={m.lowerIsBetter} />)}
        </div>
      </header>

      <nav className="hud-bottom" aria-label="Game controls">
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
        <div className="hud-tools liquid-glass">
          <button className="icon-btn" onClick={s.skipToNext} aria-label="Skip ahead to the next arrival" title="Skip ahead to the next arrival" data-testid="skip"><Icon.skip /></button>
          <button className="icon-btn" onClick={s.togglePause} aria-label={s.paused ? 'Resume clock' : 'Pause clock'} aria-pressed={s.paused} title={settings.mode === 'certification' ? 'Pause (logged, not penalized)' : 'Pause'}>{s.paused ? <Icon.play /> : <Icon.pause />}</button>
          {settings.view === '3d' && <>
            <button className="icon-btn" onClick={() => setZoom(Math.max(0, zoomStep - 1))} disabled={zoomStep === 0} aria-label="Zoom out"><Icon.minus /></button>
            <button className="icon-btn" onClick={() => setZoom(Math.min(2, zoomStep + 1))} disabled={zoomStep === 2} aria-label="Zoom in"><Icon.plus /></button>
          </>}
          <button className="icon-btn" onClick={() => s.setSettings({ view: settings.view === '3d' ? '2d' : '3d' })} aria-label={settings.view === '3d' ? 'Switch to List view' : 'Switch to 3D view'}>{settings.view === '3d' ? <Icon.list /> : <Icon.cube />}</button>
          <button className="icon-btn" onClick={() => s.setPanel({ binderOpen: true })} aria-label="Policy Binder"><Icon.book /></button>
          <button className="icon-btn" onClick={() => s.setPanel({ settingsOpen: true })} aria-label="Settings"><Icon.gear /></button>
        </div>
      </nav>
    </>
  );
}
