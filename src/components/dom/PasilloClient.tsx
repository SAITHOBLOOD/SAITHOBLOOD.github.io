"use client";

import { useMemo, useState } from "react";
import { catalogCode, displayTitle, KIND_LABEL, type CoverItem, type ProjectKind } from "@/content/types";
import { PasilloStage } from "@/components/stages";
import SmoothScroll from "./SmoothScroll";
import HoverCaption from "./HoverCaption";

/** El pasillo infinito + filtros por tipo + contador de posición en el catálogo. */
export default function PasilloClient({ projects }: { projects: CoverItem[] }) {
  // «Selección» = obras de la carpeta Pasillo en Drive (curadas por el artista); por defecto si existen
  const hasSelection = projects.some((p) => p.pasillo);
  const [kind, setKind] = useState<ProjectKind | "all" | "seleccion">(hasSelection ? "seleccion" : "all");
  const [index, setIndex] = useState(0);
  const list = useMemo(
    () => (kind === "all" ? projects : kind === "seleccion" ? projects.filter((p) => p.pasillo) : projects.filter((p) => p.kind === kind)),
    [projects, kind],
  );
  const kinds = useMemo(() => [...new Set(projects.map((p) => p.kind))], [projects]);
  const current = list[index % Math.max(1, list.length)];

  return (
    <SmoothScroll infinite>
      <PasilloStage key={kind} projects={list} onIndex={setIndex} />

      {/* Velo inferior para que la interfaz siempre se lea sobre la niebla */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-64 bg-gradient-to-t from-ink/85 to-transparent" />

      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-end p-4 text-paper md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col items-start gap-2">
            <span className="tag opacity-80">
              <span className="md:hidden">desliza para avanzar ↓</span>
              <span className="hidden md:inline">desplaza para atravesar las puertas ↓</span>
            </span>
            {current && (
              <span className="tag tag-invert">
                {catalogCode(current)} · {displayTitle(current)}
                <span className="opacity-50">
                  {(index % list.length) + 1}/{list.length}
                </span>
              </span>
            )}
          </div>
          <HoverCaption items={projects} />
        </div>
        <div className="tag pointer-events-auto mt-3 max-w-full gap-0 self-start overflow-x-auto p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar por tipo">
          {([...(hasSelection ? (["seleccion"] as const) : []), "all", ...kinds] as const).map((k, i) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`shrink-0 whitespace-nowrap px-3 py-2.5 uppercase transition-colors ${i ? "border-l border-paper/25" : ""} ${kind === k ? "bg-paper text-ink" : "hover:bg-paper/15"}`}
            >
              {k === "all" ? "Todo" : k === "seleccion" ? "✶ Selección" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Pista de scroll para Lenis (modo infinito: envuelve al llegar al final) */}
      <div aria-hidden className="h-[1000vh]" />
    </SmoothScroll>
  );
}
