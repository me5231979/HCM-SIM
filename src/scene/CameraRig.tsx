import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGame } from '../store/game';
import { FOCUS } from './layout';

const BASE_AZ = Math.PI / 4;
const POLAR = 0.96;
const RADIUS = 40;
export const ZOOM_STEPS = [1, 1.4, 2];
/** World direction that reads as screen-right from the default iso angle. */
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();

/** Orthographic isometric camera. Orbit limited to 45 degrees each side, three zoom levels, eased focus. */
export function CameraRig({ cinematic, reduced, zoomStep }: { cinematic: boolean; reduced: boolean; zoomStep: number }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const cam = useRef<THREE.OrthographicCamera>(null);
  const { size } = useThree();
  const pan = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const baseZoom = Math.min(size.width / 25, size.height / 17.5);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (cinematic || t.closest('input, textarea, select, [role="dialog"], .panel')) return;
      const step = 1;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, step], ArrowRight: [step, -step], ArrowUp: [-step, -step], ArrowDown: [step, step] };
      const m = moves[e.key];
      if (m && e.altKey === false && (t === document.body || t.closest('.scene'))) {
        e.preventDefault();
        pan.current.x = THREE.MathUtils.clamp(pan.current.x + m[0], -8, 8);
        pan.current.z = THREE.MathUtils.clamp(pan.current.z + m[1], -6, 6);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cinematic]);

  useFrame(({ clock }, dt) => {
    const c = cam.current;
    const ctl = controls.current;
    if (!c || !ctl) return;
    const st = useGame.getState();
    const focus = st.focus;
    goal.current.set(...(FOCUS[focus ?? 'overview'] ?? FOCUS.overview)).add(pan.current);
    // Keep the subject in the visible part of the screen: slide right of a right drawer, left of the inbox, right of the title copy.
    const slide = cinematic ? -5.5 : st.openStepId ? (size.width > 980 ? 4.2 : 0) : st.inboxOpen && size.width > 980 ? -2.6 : 0;
    goal.current.addScaledVector(SCREEN_RIGHT, slide);
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    ctl.target.lerp(goal.current, k);
    const zoomGoal = baseZoom * (cinematic ? 0.86 : ZOOM_STEPS[zoomStep] * (focus ? 1.25 : 1));
    c.zoom = reduced ? zoomGoal : THREE.MathUtils.lerp(c.zoom, zoomGoal, k);
    c.updateProjectionMatrix();
    if (cinematic) {
      const az = BASE_AZ + (reduced ? 0 : Math.sin(clock.elapsedTime * 0.12) * 0.42);
      c.position.setFromSphericalCoords(RADIUS, POLAR, az).add(ctl.target);
      c.lookAt(ctl.target);
    }
    ctl.update();
  });

  return (
    <>
      <OrthographicCamera ref={cam} makeDefault position={new THREE.Vector3().setFromSphericalCoords(RADIUS, POLAR, BASE_AZ)} zoom={baseZoom} near={0.1} far={200} />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={!cinematic}
        enablePan={false}
        enableZoom={false}
        enableDamping={!reduced}
        minAzimuthAngle={BASE_AZ - Math.PI / 4}
        maxAzimuthAngle={BASE_AZ + Math.PI / 4}
        minPolarAngle={0.7}
        maxPolarAngle={1.1}
      />
    </>
  );
}
