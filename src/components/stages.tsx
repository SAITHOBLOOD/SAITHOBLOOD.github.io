"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { pending } from "@/lib/loading";

/**
 * Three.js no existe en el servidor: cada escenario se carga solo en cliente y
 * en su propio chunk, así el HTML (SEO, LCP) no espera al 3D.
 */
/** Mientras baja el chunk 3D, el loader sabe que falta WebGL. */
function Placeholder({ className = "absolute inset-0 bg-paper" }: { className?: string }) {
  useEffect(() => pending("gl"), []);
  return <div className={className} aria-hidden />;
}

export const HomeStage = dynamic(() => import("./canvas/stages/HomeStage"), { ssr: false, loading: () => <Placeholder className="absolute inset-0 bg-ink" /> });
export const PasilloStage = dynamic(() => import("./canvas/stages/PasilloStage"), { ssr: false, loading: () => <Placeholder className="fixed inset-0 bg-fog" /> });
export const CoverStage = dynamic(() => import("./canvas/stages/CoverStage"), { ssr: false, loading: () => <Placeholder /> });
export const InfoStage = dynamic(() => import("./canvas/stages/InfoStage"), { ssr: false, loading: () => <Placeholder /> });
