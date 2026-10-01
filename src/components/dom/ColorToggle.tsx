"use client";

import { useEffect } from "react";
import { uiStore, useUI } from "@/lib/ui-store";

/**
 * «Tinta / Color» para piezas con color. En tinta se ven en negro + segunda tinta;
 * en color la obra se revela entera (portada 3D y galería a la vez).
 */
export default function ColorToggle({ accent }: { accent: string }) {
  const on = useUI((s) => s.colorMode);
  useEffect(() => {
    uiStore.set({ colorMode: false }); // cada ficha empieza en tinta
    return () => uiStore.set({ colorMode: false });
  }, []);

  return (
    <div className="tag gap-0 p-0" role="group" aria-label="Ver la obra en tinta o en color">
      <button type="button" aria-pressed={!on} onClick={() => uiStore.set({ colorMode: false })} className={`px-3 py-2 uppercase transition-colors ${!on ? "bg-paper text-ink" : "hover:bg-paper/15"}`}>
        Tinta
      </button>
      <button type="button" aria-pressed={on} onClick={() => uiStore.set({ colorMode: true })} className={`flex items-center gap-2 border-l border-paper/25 px-3 py-2 uppercase transition-colors ${on ? "bg-paper text-ink" : "hover:bg-paper/15"}`}>
        <span className="color-dot" style={{ background: accent }} /> Color
      </button>
    </div>
  );
}
