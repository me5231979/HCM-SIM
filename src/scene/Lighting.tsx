import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { minuteOfDay } from '../engine/clock';

/** Sun arcs across the window wall from 8:00 to 18:00: warm low morning, white noon, amber evening. */
const MORNING = new THREE.Color('#FFD8A8');
const NOON = new THREE.Color('#FFF6EA');
const EVENING = new THREE.Color('#F2A65A');

export function dayProgress(time: number | undefined): number {
  if (time === undefined) return 0.42;
  return Math.min(1, Math.max(0, (minuteOfDay(time) - 480) / 600));
}

export function sunColor(p: number, out = new THREE.Color()): THREE.Color {
  return p < 0.5 ? out.copy(MORNING).lerp(NOON, p * 2) : out.copy(NOON).lerp(EVENING, (p - 0.5) * 2);
}

export function Lighting() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const tmp = useRef(new THREE.Color());
  useFrame(() => {
    const p = dayProgress(useGame.getState().snap?.time);
    const l = sun.current;
    if (!l) return;
    const angle = Math.PI * (0.12 + 0.76 * p);
    l.position.set(Math.cos(angle) * -18, 6 + Math.sin(angle) * 12, -14);
    l.color.copy(sunColor(p, tmp.current));
    l.intensity = 2.1 + Math.sin(angle) * 0.9;
  });
  return (
    <>
      <hemisphereLight args={['#FFF7EC', '#3A3226', 1.15]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={sun}
        castShadow
        position={[-10, 14, -14]}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      {/* Warm key from the front so faces read in the iso view */}
      <directionalLight position={[12, 10, 14]} intensity={0.55} color="#FFE9C9" />
    </>
  );
}
