import { motion } from 'motion/react';
import { useState } from 'react';
import { department, payroll, period } from '../content';
import { monthDayLabel } from '../engine/clock';
import { useGame } from '../store/game';
import { BlurText, asset } from './common';
import { Icon } from './icons';

export function Title() {
  const { startRun, resumeRun, hasSavedRun, settings, setSettings, progress } = useGame();
  const [code, setCode] = useState('');
  const reduced = settings.reducedMotion;
  const fade = (d: number) => (reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d } });
  return (
    <div className="title-screen">
      <header className="title-top">
        <img src={asset('vu-lockup-white.png')} alt="Vanderbilt University" className="lockup" />
        <span className="pill liquid-glass"><span className="dot" aria-hidden="true" />HCM Academy simulation</span>
      </header>
      <main className="title-main" id="main">
        <motion.p className="eyebrow" {...fade(0.1)}>{department.name} · Pay period {period.number}, {monthDayLabel(period.begin)} to {monthDayLabel(period.end)}</motion.p>
        <BlurText text="Pay Period." italic="Period" className="display" />
        <motion.p className="lede" {...fade(0.55)}>Real deadlines from the 2026 payroll calendar. Eight requests. One pay day where every decision shows up on someone's check.</motion.p>
        <motion.div className="title-card liquid-glass-strong" {...fade(0.75)}>
          <div className="mission-line">
            <span className="tag">Mission 01</span>
            <span><strong>{payroll.title}.</strong> {payroll.tagline}</span>
          </div>
          <fieldset className="modes">
            <legend className="sr-only">Mode</legend>
            {(['training', 'certification'] as const).map((m) => (
              <label key={m} className={`mode ${settings.mode === m ? 'is-on' : ''}`}>
                <input type="radio" name="mode" value={m} checked={settings.mode === m} onChange={() => setSettings({ mode: m })} />
                <span className="mode-name">{m === 'training' ? 'Training' : 'Certification'}</span>
                <span className="mode-desc">{m === 'training' ? 'A quick tour first. The clock pauses while you read. Feedback after every decision, and hints from your mentor.' : 'The clock keeps running. No hints. Feedback waits for the debrief.'}</span>
              </label>
            ))}
          </fieldset>
          <div className="title-actions">
            <button className="btn btn--gold" onClick={() => startRun({ seed: code })} data-testid="start">Start the period <Icon.arrow /></button>
            {hasSavedRun && <button className="btn btn--ghost" onClick={resumeRun}>Resume saved run</button>}
          </div>
          <details className="group-session">
            <summary>Running a group session?</summary>
            <label className="seed">
              <span>Run code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Leave blank for a fresh run" aria-describedby="code-help" spellCheck={false} data-testid="run-code" />
            </label>
            <p id="code-help" className="fine">Give everyone the same code and the whole group plays an identical run: same request times, same answer order. Then compare debriefs together. Your code appears in your debrief.</p>
          </details>
          {progress.runs > 0 && <p className="fine">Runs played: {progress.runs}. Best rating: {progress.best}.</p>}
        </motion.div>
        <motion.div className="title-foot" {...fade(1)}>
          <button className="link-btn" onClick={() => setSettings({ view: settings.view === '3d' ? '2d' : '3d' })} aria-pressed={settings.view === '2d'}>
            {settings.view === '3d' ? <><Icon.list /> Play in List view (no 3D)</> : <><Icon.cube /> Play in 3D view</>}
          </button>
          <span>A Futures Learning Hub simulation. Fictional department, people, and HR system; real payroll calendar dates.</span>
        </motion.div>
      </main>
    </div>
  );
}
