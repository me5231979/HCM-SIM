import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { useGame } from '../store/game';
import { minuteOfDay } from '../engine/clock';
import { C } from './palette';

/** Gold analog clock on the bulletin board, driven by sim time. Turns red past the last four hours. */
export function WallClock({ position }: { position: [number, number, number] }) {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const face = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const s = useGame.getState().snap;
    const m = s ? minuteOfDay(s.time) : 600;
    if (hour.current) hour.current.rotation.z = -((m / 60) % 12) / 12 * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m % 60) / 60 * Math.PI * 2;
    if (face.current && s) face.current.color.set(s.cutoff - s.time <= 240 ? '#F3D9CF' : C.cream);
  });
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.36, 0.36, 0.04, 40]} /><meshStandardMaterial ref={face} color={C.cream} /></mesh>
      <mesh><torusGeometry args={[0.37, 0.035, 10, 48]} /><meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.3} /></mesh>
      <Instances limit={12}>
        <boxGeometry args={[0.02, 0.06, 0.01]} />
        <meshBasicMaterial color={C.black} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <Instance key={i} position={[Math.sin(a) * 0.29, Math.cos(a) * 0.29, 0.025]} rotation={[0, 0, -a]} />;
        })}
      </Instances>
      <group ref={hour} position={[0, 0, 0.03]}><mesh position={[0, 0.09, 0]}><boxGeometry args={[0.03, 0.18, 0.01]} /><meshBasicMaterial color={C.black} /></mesh></group>
      <group ref={minute} position={[0, 0, 0.035]}><mesh position={[0, 0.12, 0]}><boxGeometry args={[0.02, 0.25, 0.01]} /><meshBasicMaterial color={C.oak} /></mesh></group>
      <mesh position={[0, 0, 0.04]}><circleGeometry args={[0.025, 12]} /><meshBasicMaterial color={C.gold} /></mesh>
    </group>
  );
}
