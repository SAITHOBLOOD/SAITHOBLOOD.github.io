"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { DefaultLoadingManager } from "three";
import { done, pending } from "@/lib/loading";
import { PerformanceMonitor } from "@react-three/drei";
import { QualityProvider, qualityPreset, useDetectedQuality } from "@/lib/quality";
import ContextLossGuard from "./ContextLossGuard";
import PostFX, { type PostFXProps } from "./PostFX";

type GLStatus = "ok" | "lost" | "dead";
const RESTORE_TIMEOUT_MS = 4000;

// Texturas (TextureLoader usa el DefaultLoadingManager) → tarea "assets" del loader.
let assetsHooked = false;
function hookAssets() {
  if (assetsHooked) return;
  assetsHooked = true;
  DefaultLoadingManager.onStart = () => pending("assets");
  DefaultLoadingManager.onLoad = () => done("assets");
  DefaultLoadingManager.onError = () => done("assets");
}

/** Marca WebGL como listo cuando ya se dibujaron 2 frames (shaders compilados, escena montada). */
function GLReady() {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 2) done("gl");
  });
  return null;
}

export interface GLStageProps {
  children: ReactNode;
  /** Qué mostrar sin WebGL / reduced-motion / contexto perdido. */
  fallback: ReactNode;
  className?: string;
  camera?: { fov?: number; position?: [number, number, number]; near?: number; far?: number };
  background?: string;
  fog?: [string, number, number];
  /** false = sin post-procesado (p. ej. para mostrar la obra fiel). */
  post?: PostFXProps | false;
}

/**
 * Escenario WebGL reutilizable: tier de calidad, DPR adaptativo, pérdida de contexto
 * y pausa del render loop cuando el lienzo sale de pantalla (IntersectionObserver).
 */
export default function GLStage({ children, fallback, className = "fixed inset-0", camera, background = "#bdbcb8", fog, post = {} }: GLStageProps) {
  const tier = useDetectedQuality();
  const [status, setStatus] = useState<GLStatus>("ok");
  const [dpr, setDpr] = useState(1);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    pending("gl");
    hookAssets();
  }, []);
  useEffect(() => {
    if (tier !== "pending" && tier !== "none") setDpr(qualityPreset(tier).dpr[1]);
    if (tier === "none") done("gl"); // sin WebGL: el fallback ya está listo
  }, [tier]);
  useEffect(() => {
    if (status === "dead") done("gl");
  }, [status]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [tier]);

  const onLost = useCallback(() => {
    setStatus("lost");
    timer.current = setTimeout(() => setStatus("dead"), RESTORE_TIMEOUT_MS);
  }, []);
  const onRestored = useCallback(() => {
    clearTimeout(timer.current);
    setStatus("ok");
  }, []);

  if (tier === "pending") return <div className={className} style={{ background }} aria-hidden />;
  if (tier === "none" || status === "dead") return <>{fallback}</>;

  const q = qualityPreset(tier);

  return (
    <QualityProvider tier={tier}>
      <div ref={box} className={className} aria-hidden>
        <Canvas
          eventSource={typeof document !== "undefined" ? document.body : undefined}
          eventPrefix="client"
          dpr={dpr}
          flat
          frameloop="always"
          gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false }}
          camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, 6], ...camera }}
        >
          <color attach="background" args={[background]} />
          {fog && <fog attach="fog" args={fog} />}
          <ContextLossGuard onLost={onLost} onRestored={onRestored} />
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(q.dpr[1])} flipflops={3} onFallback={() => setDpr(1)} />
          <Suspense fallback={null}>{children}</Suspense>
          <GLReady />
          {q.postprocessing && post && <PostFX {...post} />}
        </Canvas>
        {status === "lost" && (
          <div className="absolute inset-0 grid place-items-center bg-paper/90 font-mono text-xs uppercase tracking-[0.3em] text-ink">revelando de nuevo…</div>
        )}
      </div>
    </QualityProvider>
  );
}
