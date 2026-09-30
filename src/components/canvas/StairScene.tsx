"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, Object3D, type Group, type InstancedMesh } from "three";
import { HatchMaterial } from "@/shaders/hatchMaterial";
import { scrollState } from "@/lib/scroll-state";
import { Door } from "./HeroScene";

/**
 * Info: escalera de caracol infinita a plumilla (1 draw call con InstancedMesh)
 * que gira con el scroll y termina en una puerta suspendida en el aire.
 */
const STEPS = 90;

export default function StairScene() {
  const stairs = useRef<InstancedMesh>(null);
  const root = useRef<Group>(null);

  useLayoutEffect(() => {
    const m = stairs.current;
    if (!m) return;
    const o = new Object3D();
    for (let i = 0; i < STEPS; i++) {
      const a = i * 0.32;
      o.position.set(Math.cos(a) * 1.1, i * 0.11 - 5, Math.sin(a) * 1.1);
      o.rotation.set(0, -a, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, dt) => {
    if (!root.current) return;
    const target = scrollState.offset * 0.0025 + state.clock.elapsedTime * 0.05;
    root.current.rotation.y = MathUtils.damp(root.current.rotation.y, target, 4, dt);
    root.current.position.y = MathUtils.damp(root.current.position.y, -scrollState.offset * 0.0012, 4, dt);
  });

  return (
    <group ref={root} rotation={[0.08, 0, 0]}>
      <instancedMesh ref={stairs} args={[undefined, undefined, STEPS]}>
        <boxGeometry args={[1.2, 0.08, 0.42]} />
        <hatchMaterial key={HatchMaterial.key} uSpacing={4} />
      </instancedMesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 10.5, 16]} />
        <hatchMaterial key={HatchMaterial.key} uSpacing={4} uTone={0.8} />
      </mesh>
      <group position={[Math.cos(STEPS * 0.32) * 1.1, STEPS * 0.11 - 4.2, Math.sin(STEPS * 0.32) * 1.1]} scale={0.7}>
        <Door />
      </group>
    </group>
  );
}
