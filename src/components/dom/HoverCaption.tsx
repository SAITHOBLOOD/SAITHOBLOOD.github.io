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

/** Leyenda de la obra bajo el cursor en las escenas 3D (WebGL → DOM vía ui-store). */
export default function HoverCaption({ items, className = "" }: { items: CaptionItem[]; className?: string }) {
  const id = useUI((s) => s.hoveredId);
  const item = items.find((i) => i.slug === id);
  return (
    <p className={`min-h-[3.2em] font-mono text-[11px] uppercase tracking-[0.2em] ${className}`} aria-live="polite">
      {item && (
        <>
          <span className="block font-display text-3xl normal-case italic tracking-normal">{displayTitle(item)}</span>
          {catalogCode(item)} · {KIND_LABEL[item.kind]} · {displayYear(item.year)}
        </>
      )}
    </p>
  );
}
