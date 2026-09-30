"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { ResultMedia } from "@/content/types";
import WorkPlane from "./WorkPlane";

/**
 * Portada del proyecto: la obra ocupa el lienzo, se inclina con el cursor como una
 * lámina sostenida en la mano y la tinta se vuelve líquida bajo el puntero.
 */
export default function CoverScene({ media }: { media: ResultMedia }) {
  const g = useRef<Group>(null);
  const { viewport } = useThree();

  useFrame((state, dt) => {
    if (!g.current) return;
    g.current.rotation.y = MathUtils.damp(g.current.rotation.y, state.pointer.x * 0.12, 3, dt);
    g.current.rotation.x = MathUtils.damp(g.current.rotation.x, -state.pointer.y * 0.08, 3, dt);
  });

  return (
    <group ref={g}>
      <WorkPlane media={media} maxW={viewport.width * 0.92} maxH={viewport.height * 0.92} bleed={0.4} scrollReactive={false} />
    </group>
  );
}
