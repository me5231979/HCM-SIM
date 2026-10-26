import { Instance, Instances, RoundedBox } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { C } from './palette';
import { OFFICE, OFFICES, PLINTH, PODS, SPOTS, type Vec3 } from './layout';
import { WallClock } from './WallClock';
import { dayProgress, sunColor } from './Lighting';

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => ({ color, roughness: 0.82, metalness: 0.02, flatShading: true, ...extra });

/** Clickable zone. Hover lifts the label; click opens the waiting task, or just focuses the camera. */
export function Hotspot({ id, children, onActivate }: { id: string; children: React.ReactNode; onActivate: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <group
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onActivate(id); }}
    >
      {children}
      {hover && <HoverRing pos={SPOTS[id]} />}
    </group>
  );
}

function HoverRing({ pos }: { pos: Vec3 }) {
  return (
    <mesh position={[pos[0], 0.015, pos[2] + (pos[1] > 1 ? 0.9 : 0)]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[1.05, 1.18, 48]} />
      <meshBasicMaterial color={C.gold} transparent opacity={0.9} />
    </mesh>
  );
}

/** Gold pulse on the floor where a task is waiting. Disabled with reduced motion (static ring instead). */
export function PendingPulse({ pos, reduced }: { pos: Vec3; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = (clock.elapsedTime % 1.8) / 1.8;
    ref.current.scale.setScalar(0.7 + t * 0.7);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - t);
  });
  return (
    <mesh ref={ref} position={[pos[0], 0.02, pos[2] + (pos[1] > 1 ? 0.9 : 0)]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.8, 0.95, 48]} />
      <meshBasicMaterial color={C.gold} transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

function Plinth() {
  const { w, d, h } = PLINTH;
  return (
    <group>
      <mesh position={[0, -h / 2 - 0.04, 0]} receiveShadow>
        <boxGeometry args={[w + 0.5, h, d + 0.5]} />
        <meshStandardMaterial {...std(C.ink, { roughness: 0.55 })} />
      </mesh>
      {/* Gold band at the top edge of the plinth */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[w + 0.56, 0.06, d + 0.56]} />
        <meshStandardMaterial color={C.gold} metalness={0.75} roughness={0.32} emissive={C.goldDeep} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial {...std(C.floor, { roughness: 0.9 })} />
      </mesh>
      {/* Pod rug */}
      <mesh position={[-2.2, 0.002, 1.3]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[9.6, 5.2]} />
        <meshStandardMaterial {...std('#DCD4C4')} />
      </mesh>
    </group>
  );
}

function Walls() {
  const time = useGame((s) => s.snap?.time);
  const sky = useMemo(() => sunColor(dayProgress(time)).clone().lerp(new THREE.Color('#9FC2D6'), 0.45), [time]);
  const H = 2.8;
  const z = -PLINTH.d / 2 + 0.08;
  return (
    <group>
      {/* Back wall, solid on the office side */}
      <mesh position={[-5.6, H / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[10.8, H, 0.16]} />
        <meshStandardMaterial {...std(C.wall)} />
      </mesh>
      {/* Window wall: sill, header, mullions, sky glow */}
      <mesh position={[5.5, 0.45, z]} castShadow receiveShadow><boxGeometry args={[11, 0.9, 0.16]} /><meshStandardMaterial {...std(C.wall)} /></mesh>
      <mesh position={[5.5, H - 0.2, z]} castShadow><boxGeometry args={[11, 0.4, 0.16]} /><meshStandardMaterial {...std(C.wall)} /></mesh>
      <mesh position={[5.5, 1.5, z - 0.12]}><planeGeometry args={[11, 1.4]} /><meshBasicMaterial color={sky} toneMapped={false} /></mesh>
      <Instances limit={8}>
        <boxGeometry args={[0.08, 1.5, 0.12]} />
        <meshStandardMaterial color={C.black} metalness={0.4} roughness={0.4} />
        {[0.2, 3.9, 6.2, 8.5, 10.9].map((x) => <Instance key={x} position={[x, 1.5, z]} />)}
      </Instances>
      {/* Left wall, low cutaway so the iso camera sees in */}
      <mesh position={[-PLINTH.w / 2 + 0.08, 0.6, -3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 1.2, 8.6]} />
        <meshStandardMaterial {...std(C.wall)} />
      </mesh>
      <mesh position={[-PLINTH.w / 2 + 0.08, H / 2, -6.4]} castShadow><boxGeometry args={[0.16, H, 2.2]} /><meshStandardMaterial {...std(C.wall)} /></mesh>
    </group>
  );
}

function GlassOffices({ onActivate }: { onActivate: (id: string) => void }) {
  const { w, d, h, z } = OFFICE;
  const posts: Vec3[] = [];
  OFFICES.forEach(({ x }) => {
    [-w / 2, w / 2].forEach((dx) => [z - d / 2 + 0.05, z + d / 2].forEach((dz) => posts.push([x + dx, h / 2, dz])));
  });
  return (
    <group>
      <Instances limit={24} castShadow>
        <boxGeometry args={[0.07, h, 0.07]} />
        <meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} />
        {posts.map((p, i) => <Instance key={i} position={p} />)}
      </Instances>
      {OFFICES.map(({ id, x }) => (
        <Hotspot key={id} id={id} onActivate={onActivate}>
          {/* Front glass with a door gap, side glass */}
          <mesh position={[x - 0.55, h / 2, z + d / 2]}>
            <boxGeometry args={[w - 1.2, h, 0.04]} />
            <meshStandardMaterial color={C.glass} transparent opacity={0.22} roughness={0.08} metalness={0.1} depthWrite={false} />
          </mesh>
          <mesh position={[x + w / 2, h / 2, z]}>
            <boxGeometry args={[0.04, h, d]} />
            <meshStandardMaterial color={C.glass} transparent opacity={0.18} roughness={0.08} depthWrite={false} />
          </mesh>
          {/* Header rail */}
          <mesh position={[x, h, z + d / 2]}><boxGeometry args={[w, 0.08, 0.08]} /><meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} /></mesh>
          {/* Desk, chair, plant */}
          <mesh position={[x, 0.74, z - 0.9]} castShadow receiveShadow><boxGeometry args={[1.8, 0.06, 0.8]} /><meshStandardMaterial {...std(C.wood)} /></mesh>
          <mesh position={[x, 0.37, z - 0.9]} castShadow><boxGeometry args={[1.6, 0.7, 0.6]} /><meshStandardMaterial {...std(C.woodDark)} /></mesh>
          <mesh position={[x + 0.4, 0.98, z - 1.1]} castShadow><boxGeometry args={[0.6, 0.38, 0.04]} /><meshStandardMaterial color={C.black} /></mesh>
          <mesh position={[x - 1.2, 0.45, z - 1.3]} castShadow><cylinderGeometry args={[0.2, 0.16, 0.5, 10]} /><meshStandardMaterial {...std(C.cream)} /></mesh>
          <mesh position={[x - 1.2, 0.95, z - 1.3]} castShadow><icosahedronGeometry args={[0.38, 0]} /><meshStandardMaterial {...std(C.plant)} /></mesh>
          {/* Floor hit area so the whole office is clickable */}
          <mesh position={[x, 0.01, z]} rotation-x={-Math.PI / 2} visible={false}><planeGeometry args={[w, d]} /><meshBasicMaterial /></mesh>
        </Hotspot>
      ))}
    </group>
  );
}

function Pods() {
  const desks = Object.values(PODS);
  return (
    <group>
      <Instances limit={8} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.06, 0.85]} />
        <meshStandardMaterial {...std(C.cream, { roughness: 0.6 })} />
        {desks.map((p, i) => <Instance key={i} position={[p[0], 0.74, p[2]]} />)}
      </Instances>
      <Instances limit={8} castShadow>
        <boxGeometry args={[1.6, 0.7, 0.06]} />
        <meshStandardMaterial {...std(C.wood)} />
        {desks.map((p, i) => <Instance key={i} position={[p[0], 0.37, p[2] - 0.38]} />)}
      </Instances>
      {/* Privacy screens between rows */}
      <Instances limit={8} castShadow>
        <boxGeometry args={[1.7, 0.4, 0.05]} />
        <meshStandardMaterial {...std(C.fabric)} />
        {desks.map((p, i) => <Instance key={i} position={[p[0], 0.97, p[2] - 0.43]} />)}
      </Instances>
      <Instances limit={8} castShadow>
        <boxGeometry args={[0.62, 0.38, 0.04]} />
        <meshStandardMaterial color={C.black} roughness={0.4} />
        {desks.map((p, i) => <Instance key={i} position={[p[0], 1.0, p[2] - 0.18]} />)}
      </Instances>
      <Instances limit={8}>
        <planeGeometry args={[0.56, 0.32]} />
        <meshBasicMaterial color="#F3E7CC" toneMapped={false} />
        {desks.map((p, i) => <Instance key={i} position={[p[0], 1.0, p[2] - 0.155]} />)}
      </Instances>
      <Chairs positions={desks.map((p) => [p[0], 0, p[2] + 0.62] as Vec3)} />
    </group>
  );
}

function Chairs({ positions }: { positions: Vec3[] }) {
  return (
    <>
      <Instances limit={12} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.5]} />
        <meshStandardMaterial {...std(C.black)} />
        {positions.map((p, i) => <Instance key={i} position={[p[0], 0.46, p[2]]} />)}
      </Instances>
      <Instances limit={12} castShadow>
        <boxGeometry args={[0.48, 0.55, 0.07]} />
        <meshStandardMaterial {...std(C.black)} />
        {positions.map((p, i) => <Instance key={i} position={[p[0], 0.78, p[2] + 0.24]} />)}
      </Instances>
      <Instances limit={12}>
        <cylinderGeometry args={[0.04, 0.04, 0.42, 6]} />
        <meshStandardMaterial color={C.steel} />
        {positions.map((p, i) => <Instance key={i} position={[p[0], 0.21, p[2]]} />)}
      </Instances>
    </>
  );
}

function HcmDesk({ onActivate, pending, reduced }: { onActivate: (id: string) => void; pending: boolean; reduced: boolean }) {
  const [x, , z] = SPOTS.terminal;
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!glow.current) return;
    const base = pending ? 1 : 0.55;
    glow.current.color.set(C.gold).multiplyScalar(reduced || !pending ? base : 0.8 + Math.sin(clock.elapsedTime * 3) * 0.25);
  });
  return (
    <group>
      <Hotspot id="terminal" onActivate={onActivate}>
        <RoundedBox args={[2.4, 0.07, 1.0]} radius={0.03} position={[x, 0.75, z]} castShadow receiveShadow>
          <meshStandardMaterial color={C.black} roughness={0.35} metalness={0.2} />
        </RoundedBox>
        <mesh position={[x, 0.37, z - 0.2]} castShadow><boxGeometry args={[2.2, 0.72, 0.5]} /><meshStandardMaterial {...std(C.woodDark)} /></mesh>
        {[-0.38, 0.38].map((dx, i) => (
          <group key={i} position={[x + dx, 1.06, z - 0.2]} rotation-y={i ? -0.16 : 0.16}>
            <mesh castShadow><boxGeometry args={[0.72, 0.44, 0.04]} /><meshStandardMaterial color={C.ink} /></mesh>
            <mesh position={[0, 0, 0.023]}><planeGeometry args={[0.66, 0.38]} /><meshBasicMaterial ref={i === 0 ? glow : undefined} color={C.gold} toneMapped={false} /></mesh>
          </group>
        ))}
        <mesh position={[x, 0.79, z + 0.15]}><boxGeometry args={[0.5, 0.02, 0.16]} /><meshStandardMaterial color={C.steel} /></mesh>
        <mesh position={[x, 0.01, z + 0.4]} rotation-x={-Math.PI / 2} visible={false}><planeGeometry args={[2.6, 2]} /><meshBasicMaterial /></mesh>
      </Hotspot>
      {/* Mentor's desk next door */}
      <mesh position={[SPOTS.hcm_2[0], 0.74, SPOTS.hcm_2[2]]} castShadow receiveShadow><boxGeometry args={[1.7, 0.06, 0.85]} /><meshStandardMaterial {...std(C.cream)} /></mesh>
      <mesh position={[SPOTS.hcm_2[0], 0.37, SPOTS.hcm_2[2] - 0.38]} castShadow><boxGeometry args={[1.6, 0.7, 0.06]} /><meshStandardMaterial {...std(C.wood)} /></mesh>
      <mesh position={[SPOTS.hcm_2[0], 1.0, SPOTS.hcm_2[2] - 0.18]} castShadow><boxGeometry args={[0.62, 0.38, 0.04]} /><meshStandardMaterial color={C.black} /></mesh>
      <Chairs positions={[[x, 0, z + 0.7], [SPOTS.hcm_2[0], 0, SPOTS.hcm_2[2] + 0.62]]} />
    </group>
  );
}

function Board({ onActivate }: { onActivate: (id: string) => void }) {
  const [x, y, z] = SPOTS.board;
  const papers: [number, number, number, string][] = [[-0.5, 0.2, 0, C.cream], [0.05, 0.25, 0.08, '#FFFFFF'], [0.5, 0.1, -0.06, C.cream], [-0.25, -0.22, 0.05, '#FFFFFF'], [0.35, -0.25, 0, C.gold]];
  return (
    <Hotspot id="board" onActivate={onActivate}>
      <group position={[x, y, z + 0.06]}>
        <mesh castShadow><boxGeometry args={[1.8, 1.1, 0.05]} /><meshStandardMaterial {...std(C.oak)} /></mesh>
        <mesh position={[0, 0, -0.01]}><boxGeometry args={[1.9, 1.2, 0.04]} /><meshStandardMaterial color={C.black} /></mesh>
        {papers.map(([px, py, r, col], i) => (
          <mesh key={i} position={[px, py, 0.03]} rotation-z={r}><planeGeometry args={[0.36, 0.42]} /><meshStandardMaterial color={col} /></mesh>
        ))}
        <WallClock position={[0, 1.05, 0.02]} />
      </group>
      <mesh position={[x, 0.01, z + 1.2]} rotation-x={-Math.PI / 2} visible={false}><planeGeometry args={[2.4, 1.6]} /><meshBasicMaterial /></mesh>
    </Hotspot>
  );
}

function BreakRoom() {
  const [x, , z] = SPOTS.break;
  return (
    <group>
      <mesh position={[x + 1.4, 0.45, z - 1.9]} castShadow receiveShadow><boxGeometry args={[3.2, 0.9, 0.7]} /><meshStandardMaterial {...std(C.woodDark)} /></mesh>
      <mesh position={[x + 1.4, 0.92, z - 1.9]} castShadow><boxGeometry args={[3.3, 0.05, 0.75]} /><meshStandardMaterial {...std(C.cream, { roughness: 0.5 })} /></mesh>
      <mesh position={[x + 0.4, 1.15, z - 2.0]} castShadow><boxGeometry args={[0.32, 0.42, 0.3]} /><meshStandardMaterial color={C.black} metalness={0.3} /></mesh>
      <mesh position={[x - 0.2, 0.74, z]} castShadow receiveShadow><cylinderGeometry args={[0.6, 0.6, 0.05, 24]} /><meshStandardMaterial {...std(C.cream)} /></mesh>
      <mesh position={[x - 0.2, 0.37, z]}><cylinderGeometry args={[0.06, 0.18, 0.72, 10]} /><meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} /></mesh>
      {[[-0.95, 0], [0.55, 0], [-0.2, 0.8]].map(([dx, dz], i) => (
        <mesh key={i} position={[x - 0.2 + dx, 0.45, z + dz]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.07, 12]} /><meshStandardMaterial {...std(C.black)} /></mesh>
      ))}
      <mesh position={[x + 2.5, 0.35, z + 0.6]} castShadow><cylinderGeometry args={[0.26, 0.2, 0.6, 10]} /><meshStandardMaterial {...std(C.black)} /></mesh>
      <mesh position={[x + 2.5, 1.05, z + 0.6]} castShadow><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial {...std(C.plant)} /></mesh>
    </group>
  );
}

function Reception() {
  const [x, , z] = SPOTS.reception;
  return (
    <group>
      <mesh position={[x, 0.55, z]} castShadow receiveShadow><boxGeometry args={[2.6, 1.1, 0.7]} /><meshStandardMaterial {...std(C.black, { roughness: 0.4 })} /></mesh>
      <mesh position={[x, 1.12, z]} castShadow><boxGeometry args={[2.7, 0.05, 0.8]} /><meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} /></mesh>
      {/* Door frame at the front-left entry */}
      <group position={[-PLINTH.w / 2 + 0.1, 0, 4.2]}>
        {[-0.8, 0.8].map((dz) => <mesh key={dz} position={[0, 1.2, dz]} castShadow><boxGeometry args={[0.14, 2.4, 0.12]} /><meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} /></mesh>)}
        <mesh position={[0, 2.4, 0]} castShadow><boxGeometry args={[0.14, 0.12, 1.72]} /><meshStandardMaterial color={C.gold} metalness={0.7} roughness={0.35} /></mesh>
      </group>
      <mesh position={[x - 1.9, 0.35, z - 0.6]} castShadow><cylinderGeometry args={[0.26, 0.2, 0.6, 10]} /><meshStandardMaterial {...std(C.cream)} /></mesh>
      <mesh position={[x - 1.9, 1.05, z - 0.6]} castShadow><icosahedronGeometry args={[0.5, 0]} /><meshStandardMaterial {...std(C.plant)} /></mesh>
      {/* Lounge bench */}
      <mesh position={[x + 0.2, 0.25, z + 1.6]} castShadow receiveShadow><boxGeometry args={[2.2, 0.4, 0.6]} /><meshStandardMaterial {...std(C.gold, { roughness: 0.7 })} /></mesh>
    </group>
  );
}

export function Office({ onActivate, pendingAt, reduced }: { onActivate: (id: string) => void; pendingAt: Set<string>; reduced: boolean }) {
  return (
    <group>
      <Plinth />
      <Walls />
      <GlassOffices onActivate={onActivate} />
      <Pods />
      <HcmDesk onActivate={onActivate} pending={pendingAt.has('terminal')} reduced={reduced} />
      <Board onActivate={onActivate} />
      <BreakRoom />
      <Reception />
      {[...pendingAt].map((id) => SPOTS[id] && <PendingPulse key={id} pos={SPOTS[id]} reduced={reduced} />)}
    </group>
  );
}
