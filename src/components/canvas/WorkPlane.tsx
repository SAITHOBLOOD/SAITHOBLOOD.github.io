"use client";

import { useEffect, useRef } from "react";
import { extend, useFrame, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import { Color, MathUtils, type Mesh, Vector2 } from "three";
import { InkPlaneMaterial, type InkPlaneMaterialImpl } from "@/shaders/inkPlaneMaterial";
import { scrollState } from "@/lib/scroll-state";
import { useQuality } from "@/lib/quality";
import { loadMediaTexture, mediaTextureUrl, type TexSize } from "@/lib/textures";
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
  /** Resolución de textura según el tamaño en pantalla (ahorra megas y VRAM). */
  texSize?: TexSize;
  /** Piezas con color: revela el color completo (0 → 1, animado). */
  colorReveal?: boolean;
}

/**
 * Plano de obra con el material «Tinta Líquida». La textura se carga de forma
 * imperativa (caché LRU), así el mismo plano puede cambiar de obra sin desmontarse:
 * cada cambio vuelve a "imprimir" la lámina con el revelado de tinta.
 */
export default function WorkPlane({ media, maxW = 2, maxH = 2.4, threshold = 0.5, bleed = 0.8, delay = 0, onHover, onSelect, scrollReactive = true, texSize = "md", colorReveal = false }: WorkPlaneProps) {
  const mesh = useRef<Mesh>(null);
  const mat = useRef<InkPlaneMaterialImpl>(null);
  const hovered = useRef(false);
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const { vertexWaves } = useQuality();

  // Al hacer clic se navega y el plano se desmonta SIN onPointerOut: soltar cursor y leyenda aquí
  useEffect(
    () => () => {
      if (!hovered.current) return;
      hovered.current = false;
      document.body.style.cursor = "";
      onHoverRef.current?.(false);
    },
    [],
  );

  const aspect = media.width / media.height;
  const h = Math.min(maxH, maxW / aspect);
  const w = h * aspect;
  const mediaKey = mediaTextureUrl(media, texSize);
  const accent = media.type === "image" ? media.accent : undefined;

  // Segunda tinta: color dominante de la pieza (si tiene color)
  useEffect(() => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uSpot.value = accent ? 1 : 0;
    if (accent) (u.uAccent.value as Color).set(accent);
  }, [accent]);

  useEffect(() => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const tw = gsap.to(u.uColorReveal, { value: colorReveal ? 1 : 0, duration: colorReveal ? 1.6 : 0.8, ease: "power2.inOut" });
    return () => void tw.kill();
  }, [colorReveal]);

  useEffect(() => {
    const m = mat.current;
    if (!m) return;
    let alive = true;
    let tween: gsap.core.Tween | undefined;
    (m.uniforms.uReveal as { value: number }).value = 0;
    loadMediaTexture(media, texSize)
      .then((tex) => {
        if (!alive || !mat.current) return;
        const u = mat.current.uniforms;
        u.uTexture.value = tex;
        (u.uImageSize.value as Vector2).set(media.width, media.height);
        tween = gsap.to(u.uReveal, { value: 1, duration: 1.8, delay, ease: "power2.out" });
      })
      .catch(() => {}); // red caída: la lámina queda en papel; el próximo montaje reintenta
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
