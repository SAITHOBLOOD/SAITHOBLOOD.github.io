"use client";

import { useEffect, useRef } from "react";
import { extend, useFrame, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import { MathUtils, type Mesh, Vector2 } from "three";
import { InkPlaneMaterial, type InkPlaneMaterialImpl } from "@/shaders/inkPlaneMaterial";
import { scrollState } from "@/lib/scroll-state";
import { useQuality } from "@/lib/quality";
import { loadMediaTexture } from "@/lib/textures";
import type { ResultMedia } from "@/content/types";

extend({ InkPlaneMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    inkPlaneMaterial: import("@react-three/fiber").ThreeElement<typeof InkPlaneMaterial>;
  }
}

export interface WorkPlaneProps {
  media: ResultMedia;
  /** Caja máxima en unidades de mundo; el plano conserva el aspecto de la obra. */
  maxW?: number;
  maxH?: number;
  threshold?: number;
  bleed?: number;
  delay?: number;
  onHover?: (hovered: boolean) => void;
  onSelect?: () => void;
  /** Usa la velocidad de scroll para curvar/estirar la lámina. */
  scrollReactive?: boolean;
}

/**
 * Plano de obra con el material «Tinta Líquida». La textura se carga de forma
 * imperativa (caché LRU), así el mismo plano puede cambiar de obra sin desmontarse:
 * cada cambio vuelve a "imprimir" la lámina con el revelado de tinta.
 */
export default function WorkPlane({ media, maxW = 2, maxH = 2.4, threshold = 0.5, bleed = 0.8, delay = 0, onHover, onSelect, scrollReactive = true }: WorkPlaneProps) {
  const mesh = useRef<Mesh>(null);
  const mat = useRef<InkPlaneMaterialImpl>(null);
  const hovered = useRef(false);
  const { vertexWaves } = useQuality();

  const aspect = media.width / media.height;
  const h = Math.min(maxH, maxW / aspect);
  const w = h * aspect;
  const mediaKey = media.type === "image" ? (media.tex ?? media.src) : `plate:${media.seed}`;

  useEffect(() => {
    const m = mat.current;
    if (!m) return;
    let alive = true;
    let tween: gsap.core.Tween | undefined;
    (m.uniforms.uReveal as { value: number }).value = 0;
    loadMediaTexture(media).then((tex) => {
      if (!alive || !mat.current) return;
      const u = mat.current.uniforms;
      u.uTexture.value = tex;
      (u.uImageSize.value as Vector2).set(media.width, media.height);
      tween = gsap.to(u.uReveal, { value: 1, duration: 1.8, delay, ease: "power2.out" });
    });
    return () => {
      alive = false;
      tween?.kill();
    };
    // mediaKey identifica la obra; media puede ser un objeto nuevo con el mismo contenido
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey, delay]);

  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    const u = m.uniforms as Record<string, { value: number }>;
    u.uTime.value = state.clock.elapsedTime;
    u.uHover.value = MathUtils.damp(u.uHover.value, hovered.current ? 1 : 0, 5, dt);
    if (scrollReactive) u.uScrollVelocity.value = MathUtils.damp(u.uScrollVelocity.value, scrollState.velocity, 8, dt);
    (m.uniforms.uPlaneSize.value as Vector2).set(w, h);
  });

  const setHover = (v: boolean) => {
    hovered.current = v;
    if (onSelect) document.body.style.cursor = v ? "pointer" : "";
    onHover?.(v);
  };

  return (
    <mesh
      ref={mesh}
      scale={[w, h, 1]}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => e.uv && mat.current && (mat.current.uniforms.uMouse.value as Vector2).copy(e.uv)}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={onSelect}
    >
      <planeGeometry args={[1, 1, vertexWaves ? 48 : 1, vertexWaves ? 48 : 1]} />
      <inkPlaneMaterial ref={mat} key={InkPlaneMaterial.key} uThreshold={threshold} uBleed={bleed} uWaves={vertexWaves ? 1 : 0} />
    </mesh>
  );
}
