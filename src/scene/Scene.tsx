import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { useGame, paydayBeats } from '../store/game';
import { useVoice } from '../audio/voice';
import { activateHotspot, activatePerson } from './actions';
import { CameraRig } from './CameraRig';
import { Figures } from './Figures';
import { Lighting } from './Lighting';
import { Office } from './Office';

export default function Scene({ zoomStep }: { zoomStep: number }) {
  const phase = useGame((s) => s.phase);
  const beat = useGame((s) => s.beat);
  const snap = useGame((s) => s.snap);
  const game = useGame((s) => s.game);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const cinematic = phase === 'title';

  const pendingAt = useMemo(() => {
    const set = new Set<string>();
    if (game && snap && phase === 'playing') snap.steps.forEach((st) => game.status(st) === 'open' && set.add(st.location));
    return set;
  }, [game, snap, phase]);

  const voice = useVoice();
  const talking = voice.status === 'playing' ? voice.speaker : null;
  const speaker = talking ?? (phase === 'payday' && snap ? paydayBeats(snap)[beat]?.speaker ?? null : null);

  return (
    <div className="scene" role="img" aria-label="3D office diorama of the Office of Learning Operations. Every place and person here is also reachable from the Places bar and the List view.">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onPointerMissed={() => useGame.getState().setPanel({ focus: null })}>
        <Suspense fallback={null}>
          <CameraRig cinematic={cinematic} reduced={reduced} zoomStep={zoomStep} />
          <Lighting />
          <Office onActivate={activateHotspot} pendingAt={pendingAt} reduced={reduced} />
          <Figures reduced={reduced} onActivate={activatePerson} speaker={speaker} />
        </Suspense>
      </Canvas>
    </div>
  );
}
