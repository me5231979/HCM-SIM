import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { people } from '../content';
import { useGame } from '../store/game';
import { personStatus, type PersonStatusKind } from '../status';
import { facesGlass, seatFor } from './layout';
import { C, OUTFIT, SKIN } from './palette';
import { StatusGlyph } from '../ui/icons';
import { voicePlayer } from '../audio/voice';

const mat = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true });

function Figure({ id, outfit, skin, desk, status, statusLabel, speaking, reduced, onActivate, index }: {
  id: string; outfit: keyof typeof OUTFIT; skin: string; desk: string; status: PersonStatusKind; statusLabel: string; speaking: boolean; reduced: boolean; onActivate: (personId: string) => void; index: number;
}) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const standing = status === 'talk' || speaking;
  const pos = seatFor(desk);
  const facing = facesGlass(desk) ? 0 : Math.PI;
  const mats = useMemo(() => ({ cloth: mat(OUTFIT[outfit]), skin: mat(skin), legs: mat(outfit === 'black' ? '#3A3A3A' : C.black), shoe: mat(C.ink) }), [outfit, skin]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime + index * 1.7;
    if (torso.current) torso.current.rotation.z = Math.sin(t * 0.8) * 0.025;
    if (!standing) {
      // Typing: small alternating forearm bob.
      if (armL.current) armL.current.rotation.x = -1.15 + Math.sin(t * 9) * 0.06;
      if (armR.current) armR.current.rotation.x = -1.15 + Math.cos(t * 9) * 0.06;
    } else if (armR.current) {
      // Talking: the gesture and a small nod follow the loudness of the recorded line.
      const lv = speaking ? voicePlayer.level() : 0;
      armR.current.rotation.x = speaking ? -0.35 - lv * 0.45 + Math.sin(t * 3) * 0.08 : -0.15;
      if (armL.current) armL.current.rotation.x = -0.1 - lv * 0.15;
      if (head.current) head.current.rotation.x = -lv * 0.18;
    }
    if (root.current) root.current.position.y = standing ? Math.abs(Math.sin(t * 1.2)) * 0.015 : 0;
  });

  const hipY = standing ? 0.86 : 0.5;
  return (
    <group position={[pos[0], 0, pos[2] + (standing && !facesGlass(desk) ? 0.35 : 0)]} rotation-y={facing}>
      <group
        ref={root}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onActivate(id); }}
      >
        {/* Legs */}
        {[-0.1, 0.1].map((x) => (
          <group key={x} position={[x, hipY, 0]}>
            {standing ? (
              <mesh position={[0, -0.42, 0]} material={mats.legs} castShadow><boxGeometry args={[0.13, 0.84, 0.15]} /></mesh>
            ) : (
              <>
                <mesh position={[0, 0, -0.2]} material={mats.legs} castShadow><boxGeometry args={[0.14, 0.13, 0.42]} /></mesh>
                <mesh position={[0, -0.24, -0.4]} material={mats.legs} castShadow><boxGeometry args={[0.12, 0.48, 0.13]} /></mesh>
              </>
            )}
          </group>
        ))}
        <group ref={torso} position={[0, hipY, 0]}>
          <mesh position={[0, 0.3, 0]} material={mats.cloth} castShadow><capsuleGeometry args={[0.17, 0.3, 4, 10]} /></mesh>
          <mesh position={[0, 0.6, 0]} material={mats.skin}><cylinderGeometry args={[0.05, 0.06, 0.08, 8]} /></mesh>
          <mesh ref={head} position={[0, 0.77, 0]} material={mats.skin} castShadow><sphereGeometry args={[0.135, 14, 12]} /></mesh>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? armL : armR} position={[side * 0.22, 0.47, 0]} rotation-x={standing ? -0.1 : -1.15}>
              <mesh position={[0, -0.2, 0]} material={mats.cloth} castShadow><capsuleGeometry args={[0.055, 0.3, 3, 8]} /></mesh>
              <mesh position={[0, -0.41, 0]} material={mats.skin}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
            </group>
          ))}
        </group>
        {(hover || speaking) && (
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.42, 0.5, 32]} /><meshBasicMaterial color={C.gold} /></mesh>
        )}
      </group>
      {status !== 'none' && (
        <Html position={[0, standing ? 2.15 : 1.75, 0]} center zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`chip chip--${status}`} aria-hidden="true"><StatusGlyph kind={status} /><span>{hover ? statusLabel : ''}</span></div>
        </Html>
      )}
    </group>
  );
}

export function Figures({ reduced, onActivate, speaker }: { reduced: boolean; onActivate: (personId: string) => void; speaker: string | null }) {
  const game = useGame((s) => s.game);
  const snap = useGame((s) => s.snap);
  return (
    <group>
      {people.map((p, i) => {
        const st = personStatus(p.id, game, snap);
        return (
          <Figure key={p.id} id={p.id} index={i} outfit={p.outfit} skin={SKIN[i % SKIN.length]} desk={p.desk}
            status={st.kind} statusLabel={st.label} speaking={speaker === p.id} reduced={reduced} onActivate={onActivate} />
        );
      })}
    </group>
  );
}
