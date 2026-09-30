"use client";

import { useMemo, useState } from "react";
import { catalogCode, displayTitle, KIND_LABEL, type CoverItem, type ProjectKind } from "@/content/types";
import { PasilloStage } from "@/components/stages";
import SmoothScroll from "./SmoothScroll";
import HoverCaption from "./HoverCaption";

/** El pasillo infinito + filtros por tipo + contador de posición en el catálogo. */
export default function PasilloClient({ projects }: { projects: CoverItem[] }) {
  const [kind, setKind] = useState<ProjectKind | "all">("all");
  const [index, setIndex] = useState(0);
  const list = useMemo(() => (kind === "all" ? projects : projects.filter((p) => p.kind === kind)), [projects, kind]);
  const kinds = useMemo(() => [...new Set(projects.map((p) => p.kind))], [projects]);
  const current = list[index % Math.max(1, list.length)];

  return (
    <SmoothScroll infinite>
      <PasilloStage key={kind} projects={list} onIndex={setIndex} />

      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end p-5 text-paper mix-blend-difference md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em]">
            <p className="opacity-70">desplaza para atravesar las puertas ↓</p>
            {current && (
              <p className="mt-2">
                {catalogCode(current)} · {displayTitle(current)} — {(index % list.length) + 1} / {list.length}
              </p>
            )}
          </div>
          <HoverCaption items={projects} className="text-right" />
        </div>
        <div className="pointer-events-auto mt-4 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
          {(["all", ...kinds] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`border border-paper px-2.5 py-1 ${kind === k ? "bg-paper text-ink" : ""}`}>
              {k === "all" ? "Todo" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Pista de scroll para Lenis (modo infinito: envuelve al llegar al final) */}
      <div aria-hidden className="h-[1000vh]" />
    </SmoothScroll>
  );
}
