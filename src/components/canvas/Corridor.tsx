"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { MathUtils, type Group, type Mesh, type PerspectiveCamera } from "three";
import { lerp, portraitFactor } from "@/lib/responsive";
import { scrollState } from "@/lib/scroll-state";
import { uiStore } from "@/lib/ui-store";
import type { CoverItem } from "@/content/types";
import WorkPlane from "./WorkPlane";
import { Door } from "./HeroScene";

/**
 * «El Pasillo de las Puertas» — recorre TODO el catálogo con coste constante.
 *
 * SLOTS mallas fijas se reciclan al quedar detrás de la cámara. Cada slot calcula su
 * índice virtual (idx = i + ciclo·SLOTS) y muestra projects[idx mod N]: al avanzar,
 * el slot que vuelve al fondo carga el SIGUIENTE proyecto (no repite los mismos 10).
 * Con 20 o 2.000 obras: los mismos draw calls y ≤ 48 texturas en memoria (LRU).
 */

const SLOTS = 10;
const SPACING = 4.5;
const LENGTH = SLOTS * SPACING;
const PX_TO_WORLD = 0.008;
const BEHIND = 2;

const wrap = (rel: number) => ((((rel - BEHIND) % LENGTH) + LENGTH) % LENGTH) - LENGTH + BEHIND;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export default function Corridor({ projects, onIndex }: { projects: CoverItem[]; onIndex?: (i: number) => void }) {
  const router = useRouter();
  const [assign, setAssign] = useState(() => Array.from({ length: SLOTS }, (_, i) => i));
  const assignRef = useRef(assign);
  const slotRefs = useRef<(Group | null)[]>([]);
  const artRefs = useRef<(Group | null)[]>([]);
  const moon = useRef<Mesh>(null);
  const lastNearest = useRef(-1);
  const count = projects.length;

  useFrame((state, dt) => {
    const cam = state.camera;
    cam.position.z = 5 - scrollState.offset * PX_TO_WORLD;
    // Responsive: en vertical se abre el campo de visión y las obras se acercan al centro
    const pf = portraitFactor(state.size.width, state.size.height);
    const fov = lerp(50, 64, pf);
    const pcam = cam as PerspectiveCamera;
    if (Math.abs(pcam.fov - fov) > 0.1) {
      pcam.fov = fov;
      pcam.updateProjectionMatrix();
    }
    const offset = lerp(1.25, 0.72, pf);
    cam.position.x = MathUtils.damp(cam.position.x, state.pointer.x * 0.5, 3, dt);
    cam.position.y = MathUtils.damp(cam.position.y, state.pointer.y * 0.3, 3, dt);
    cam.rotation.z = MathUtils.damp(cam.rotation.z, -scrollState.velocity * 0.0015, 4, dt);

    let changed = false;
    let nearest = { d: Infinity, idx: 0 };
    const next = assignRef.current.slice();

    for (let i = 0; i < SLOTS; i++) {
      const g = slotRefs.current[i];
      if (!g) continue;
      const rel = wrap(-i * SPACING - cam.position.z);
      const worldZ = cam.position.z + rel;
      g.position.z = worldZ;

      const idx = Math.round(-worldZ / SPACING); // índice virtual, crece al avanzar
      const pi = mod(idx, count);
      if (next[i] !== pi) {
        next[i] = pi;
        changed = true;
      }
      if (rel < -1 && -rel < nearest.d) nearest = { d: -rel, idx: pi };

      const art = artRefs.current[i];
      if (art) {
        const side = idx % 2 === 0 ? -1 : 1;
        const open = MathUtils.smoothstep(rel, -4.5, -0.5);
        art.position.x = side * (offset + open * 1.6);
        art.rotation.y = -side * (0.28 + open * 0.9);
      }
    }

    if (changed) {
      assignRef.current = next;
      setAssign(next);
    }
    if (nearest.idx !== lastNearest.current) {
      lastNearest.current = nearest.idx;
      onIndex?.(nearest.idx);
    }
    if (moon.current) moon.current.position.z = cam.position.z - 40;
  });

  if (!count) return null;

  return (
    <>
      {assign.map((pi, i) => {
        const proj = projects[pi % count];
        return (
          <group key={i} ref={(el) => void (slotRefs.current[i] = el)}>
            <group position={[0, 0.5, -SPACING / 2]} scale={[5, 2.6, 2.6]}>
              <Door leaf={false} />
            </group>
            <group ref={(el) => void (artRefs.current[i] = el)} position={[0, (i % 3) * 0.15 - 0.1, 0]}>
              <WorkPlane
                media={proj.cover}
                threshold={proj.ink?.threshold}
                bleed={proj.ink?.bleed}
                onHover={(v) => uiStore.set({ hoveredId: v ? proj.slug : null })}
                onSelect={() => router.push(`/proyecto/${proj.slug}`)}
              />
            </group>
          </group>
        );
      })}

      <mesh ref={moon} position={[7, 6, -35]}>
        <circleGeometry args={[3, 64]} />
        <meshBasicMaterial color="#f7f7f5" fog={false} />
      </mesh>
    </>
  );
}
