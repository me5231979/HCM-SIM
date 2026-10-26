import { speechSupported } from '../audio/speech';
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
      <fieldset className="set-row set-sound"><legend>Sound and voice</legend>
        <label className="check"><input type="checkbox" checked={settings.voices} onChange={(e) => setSettings({ voices: e.target.checked })} data-testid="set-voices" />Character voices <span className="muted">(captions always show)</span></label>
        <label className="range"><span>Voice volume</span>
          <input type="range" min={0} max={100} step={5} value={Math.round(settings.voiceVolume * 100)} disabled={!settings.voices} onChange={(e) => setSettings({ voiceVolume: Number(e.target.value) / 100 })} />
          <span className="range-val" aria-hidden="true">{Math.round(settings.voiceVolume * 100)}%</span>
        </label>
        {speechSupported() ? (
          <label className="check"><input type="checkbox" checked={settings.speakBack} onChange={(e) => setSettings({ speakBack: e.target.checked })} data-testid="set-speak" />Answer out loud <span className="muted">(say an option instead of clicking; your browser's speech service turns it into text, which can mean sending it to Google or Apple)</span></label>
        ) : <p className="fine">Answer out loud isn't supported in this browser. Every answer can be clicked or chosen with the keyboard.</p>}
        <label className="check"><input type="checkbox" checked={settings.live} onChange={(e) => setSettings({ live: e.target.checked })} />Offer live conversations <span className="muted">(opt in each time; uses ElevenLabs)</span></label>
        {settings.liveConsent && <button type="button" className="link-btn" onClick={() => setSettings({ liveConsent: false })}>Show the live conversation privacy notice again</button>}
      </fieldset>
      {settings.mode === 'certification' && phase === 'playing' && <p className="fine">Certification mode: pause is available and logged ({pauses} so far), never penalized.</p>}
      <div className="set-actions">
        {phase !== 'title' && <button className="btn btn--ghost" onClick={() => { setPanel({ settingsOpen: false }); restart(); }}>Quit to title</button>}
        <button className="btn btn--ghost" onClick={clearData}>Clear my data</button>
        <button className="btn btn--gold" onClick={() => setPanel({ settingsOpen: false })}>Done</button>
      </div>
      <p className="fine">Saved only in this browser (pp_settings, pp_progress, pp_current_run). No cookies, no analytics. The game makes no network calls unless you start a live conversation or turn on Answer out loud in a browser that recognizes speech online.</p>
    </Dialog>
  );
}
