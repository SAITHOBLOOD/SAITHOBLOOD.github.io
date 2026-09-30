"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getGPUTier } from "detect-gpu";

/**
 * Niveles de calidad (graceful degradation):
 *  high → DPR hasta 2, post-procesado completo, ondas en vértices.
 *  mid  → DPR ≤1.5, post-procesado completo.
 *  low  → DPR 1, sin post-procesado (el halftone se simula en el material), menos obras.
 *  none → sin WebGL: grid estático en DOM.
 */
export type Quality = "high" | "mid" | "low" | "none";

export interface QualitySettings {
  tier: Quality;
  dpr: [number, number];
  postprocessing: boolean;
  vertexWaves: boolean;
  maxWorks: number;
}

const PRESETS: Record<Quality, QualitySettings> = {
  high: { tier: "high", dpr: [1, 2], postprocessing: true, vertexWaves: true, maxWorks: 64 },
  mid: { tier: "mid", dpr: [1, 1.5], postprocessing: true, vertexWaves: true, maxWorks: 32 },
  low: { tier: "low", dpr: [1, 1], postprocessing: false, vertexWaves: false, maxWorks: 12 },
  none: { tier: "none", dpr: [1, 1], postprocessing: false, vertexWaves: false, maxWorks: 0 },
};

function hasWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

const TIERS: Quality[] = ["high", "mid", "low", "none"];

export async function detectQuality(): Promise<Quality> {
  // Override para QA: ?quality=high|mid|low|none
  const forced = new URLSearchParams(location.search).get("quality") as Quality | null;
  if (forced && TIERS.includes(forced)) return forced;

  if (!hasWebGL2()) return "none";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (reducedMotion) return "none";

  try {
    // En producción: auto-hospedar los benchmarks (`benchmarksURL: "/gpu-benchmarks"`)
    // para no depender de unpkg.
    const gpu = await getGPUTier();
    if (gpu.tier <= 1) return "low";
    if (gpu.isMobile || saveData) return gpu.tier >= 3 ? "mid" : "low";
    return gpu.tier >= 3 ? "high" : "mid";
  } catch {
    return saveData ? "low" : "mid";
  }
}

let detection: Promise<Quality> | null = null; // una sola detección por sesión
let detected: Quality | null = null;

export function useDetectedQuality(): Quality | "pending" {
  const [q, setQ] = useState<Quality | "pending">(detected ?? "pending");
  useEffect(() => {
    let alive = true;
    detection ??= detectQuality().then((r) => (detected = r));
    detection.then((r) => alive && setQ(r));
    return () => {
      alive = false;
    };
  }, []);
  return q;
}

const QualityContext = createContext<QualitySettings>(PRESETS.mid);

export function QualityProvider({ tier, children }: { tier: Quality; children: React.ReactNode }) {
  return <QualityContext.Provider value={PRESETS[tier]}>{children}</QualityContext.Provider>;
}

export const useQuality = () => useContext(QualityContext);
export const qualityPreset = (tier: Quality) => PRESETS[tier];
