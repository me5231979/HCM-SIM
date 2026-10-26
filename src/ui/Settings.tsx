import { SPEEDS, type Speed } from '../engine/clock';
import { useGame } from '../store/game';
import { Dialog } from './common';

export function Settings() {
  const { settings, setSettings, setPanel, clearData, phase, restart, pauses } = useGame();
  return (
    <Dialog labelId="settings-h" onClose={() => setPanel({ settingsOpen: false })} className="modal liquid-glass-strong">
      <p className="eyebrow">Settings</p>
      <h2 id="settings-h">Play your <em>way</em>.</h2>
      <fieldset className="set-row"><legend>View</legend>
        {(['3d', '2d'] as const).map((v) => <label key={v} className="radio"><input type="radio" name="view" checked={settings.view === v} onChange={() => setSettings({ view: v })} />{v === '3d' ? '3D office' : 'List view (no 3D, same game)'}</label>)}
      </fieldset>
      <fieldset className="set-row"><legend>Clock speed</legend>
        {(Object.keys(SPEEDS) as (keyof typeof SPEEDS)[]).map((k) => <label key={k} className="radio"><input type="radio" name="speed" checked={settings.speed === k} onChange={() => setSettings({ speed: k })} />{k[0].toUpperCase() + k.slice(1)} <span className="muted">({SPEEDS[k]} sec per sim hour)</span></label>)}
        <label className="radio"><input type="radio" name="speed" checked={settings.speed === 'manual'} onChange={() => setSettings({ speed: 'manual' as Speed })} />Manual <span className="muted">(time moves only when you act or press Skip)</span></label>
      </fieldset>
      <fieldset className="set-row"><legend>Text size</legend>
        {[1, 1.25, 1.5, 2].map((n) => <label key={n} className="radio"><input type="radio" name="text" checked={settings.textScale === n} onChange={() => setSettings({ textScale: n })} />{n * 100}%</label>)}
      </fieldset>
      <label className="check"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => setSettings({ reducedMotion: e.target.checked })} />Reduce motion <span className="muted">(no camera easing, pulses, or figure animation)</span></label>
      {settings.mode === 'certification' && phase === 'playing' && <p className="fine">Certification mode: pause is available and logged ({pauses} so far), never penalized.</p>}
      <div className="set-actions">
        {phase !== 'title' && <button className="btn btn--ghost" onClick={() => { setPanel({ settingsOpen: false }); restart(); }}>Quit to title</button>}
        <button className="btn btn--ghost" onClick={clearData}>Clear my data</button>
        <button className="btn btn--gold" onClick={() => setPanel({ settingsOpen: false })}>Done</button>
      </div>
      <p className="fine">Saved only in this browser (pp_settings, pp_progress, pp_current_run). No cookies, no analytics, no network calls.</p>
    </Dialog>
  );
}
