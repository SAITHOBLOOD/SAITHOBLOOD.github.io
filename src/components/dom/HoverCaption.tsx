"use client";

import { useUI } from "@/lib/ui-store";
import { catalogCode, displayTitle, displayYear, KIND_LABEL, type ProjectKind } from "@/content/types";

export interface CaptionItem {
  slug: string;
  n: number;
  title?: string;
  year: number;
  kind: ProjectKind;
}

/**
 * Ficha de la obra bajo el cursor en las escenas 3D (WebGL → DOM vía ui-store).
 * Va en una tarjeta de tinta para leerse sobre cualquier fondo.
 */
export default function HoverCaption({ items, className = "" }: { items: CaptionItem[]; className?: string }) {
  const id = useUI((s) => s.hoveredId);
  const item = items.find((i) => i.slug === id);
  return (
    <div className={`min-h-[4.5rem] ${className}`} aria-live="polite">
      {item && (
        <div className="inline-block border border-paper/30 bg-ink/90 px-4 py-3 text-left text-paper shadow-[4px_4px_0_rgb(10_10_10/0.4)] backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
            {catalogCode(item)} · {KIND_LABEL[item.kind]} · {displayYear(item.year)}
          </p>
          <p className={`mt-1 font-display text-3xl leading-none ${item.title ? "" : "italic opacity-80"}`}>{displayTitle(item)}</p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] opacity-50">clic para abrir →</p>
        </div>
      )}
    </div>
  );
}
