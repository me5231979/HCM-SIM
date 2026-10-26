import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { personById } from './content';
import { urgency } from './engine/clock';
import { paydayBeats, useGame } from './store/game';
import { ListView } from './a11y/ListView';
import { Binder } from './ui/Binder';
import { Briefing } from './ui/Briefing';
import { Debrief } from './ui/Debrief';
import { CaughtUp, DayNotice, HUD } from './ui/HUD';
import { Inbox, NoiseReader } from './ui/Inbox';
import { Payday } from './ui/Payday';
import { Settings } from './ui/Settings';
import { TaskPanel } from './ui/TaskPanel';
import { Title } from './ui/Title';
import { Help, Tutorial } from './ui/Tutorial';

const Scene = lazy(() => import('./scene/Scene'));

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const s = useGame();
  const { phase, settings, snap } = s;
  const [webgl] = useState(hasWebGL);
  const [zoomStep, setZoom] = useState(0);
  const last = useRef(performance.now());
  const lastUrgency = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!webgl && settings.view === '3d') { s.setSettings({ view: '2d' }); s.announce('3D isn\'t available in this browser, so the game opened in List view.'); }
  }, [webgl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time clock loop. The store decides whether sim time actually moves.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      useGame.getState().tick(Math.min(500, now - last.current));
      last.current = now;
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  // Announce each deadline as it enters its last workday and its last 4 hours.
  useEffect(() => {
    if (!snap || phase !== 'playing') return;
    for (const d of snap.deadlines) {
      const u = urgency(snap.time, d.time);
      if (u !== lastUrgency.current[d.key]) {
        if (u === 'warning') s.announce(`${d.label}: less than one workday left.`);
        if (u === 'critical') s.announce(`${d.label}: final 4 hours.`);
        lastUrgency.current[d.key] = u;
      }
    }
  }, [snap?.time, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pay day: the camera visits each speaker.
  useEffect(() => {
    if (phase !== 'payday' || !snap) return;
    const b = paydayBeats(snap)[s.beat];
    if (!b) return;
    const desk = personById(b.speaker).desk;
    s.setPanel({ focus: desk.startsWith('office_') ? desk : desk === 'hcm_2' ? 'terminal' : 'overview' });
  }, [phase, s.beat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.textScale * 100}%`;
    document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
  }, [settings.textScale, settings.reducedMotion]);

  const show3d = settings.view === '3d' && webgl;
  const playingUi = phase === 'playing' || phase === 'tour';

  return (
    <div className={`app phase-${phase} view-${show3d ? '3d' : '2d'}`}>
      <a href="#main" className="skip">Skip to content</a>
      <div className="stage" aria-hidden={phase === 'debrief' ? true : undefined}>
        {show3d ? <Suspense fallback={<div className="scene-loading" role="status">Building the office…</div>}><Scene zoomStep={zoomStep} /></Suspense> : <div className="backdrop" />}
      </div>
      <div className="vignette" aria-hidden="true" />

      {phase === 'title' && <Title />}
      {phase === 'briefing' && <Briefing />}
      {(playingUi || phase === 'payday') && !show3d && <ListView />}
      {playingUi && (
        <>
          <HUD zoomStep={zoomStep} setZoom={setZoom} />
          {phase === 'playing' && <>
            <CaughtUp />
            <DayNotice />
            {s.inboxOpen && <Inbox />}
            <TaskPanel />
            <NoiseReader />
          </>}
        </>
      )}
      {phase === 'tour' && <Tutorial />}
      {s.helpOpen && phase === 'playing' && <Help />}
      {phase === 'payday' && <Payday />}
      {phase === 'debrief' && <Debrief />}
      {s.binderOpen && <Binder />}
      {s.settingsOpen && <Settings />}
      {show3d && playingUi && <main id="main" className="sr-only" aria-label="Office">Use the Places bar, the Inbox, or switch to List view to work through tasks.</main>}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{s.announcement}</div>
    </div>
  );
}
