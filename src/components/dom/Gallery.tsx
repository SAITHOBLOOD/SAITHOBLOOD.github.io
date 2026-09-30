"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResultMedia } from "@/content/types";
import Thumb, { PlateCanvas } from "./Thumb";

/** Fotos del resultado + visor a pantalla completa (←/→, Esc, swipe). */
export default function Gallery({ items, title }: { items: ResultMedia[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef(0);

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const dlg = dialog.current;
    if (!dlg) return;
    if (open !== null && !dlg.open) dlg.showModal();
    if (open === null && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const cur = open !== null ? items[open] : null;
  const single = items.length === 1;

  return (
    <>
      <ul className={single ? "" : "columns-1 gap-6 sm:columns-2"}>
        {items.map((m, i) => (
          <li key={i} className="mb-6 break-inside-avoid">
            <button type="button" onClick={() => setOpen(i)} className="block w-full cursor-zoom-in" aria-label={`Ampliar foto ${i + 1} de ${title}`}>
              <Thumb media={m} alt={`${title} — foto ${i + 1}`} sizes={single ? "100vw" : "50vw"} />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink/95 p-0 text-paper backdrop:bg-ink/80"
      >
        {cur && (
          <div className="grid h-full grid-rows-[auto_1fr_auto] p-4 md:p-8" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.25em]">
              <span>
                {title} · {open! + 1}/{items.length}
              </span>
              <button type="button" onClick={() => setOpen(null)} autoFocus>
                Cerrar ✕
              </button>
            </div>
            <div className="relative flex min-h-0 items-center justify-center py-4">
              {cur.type === "image" ? (
                <img src={cur.srcSet?.lg ?? cur.src} alt={`${title} — foto ${open! + 1}`} className="max-h-full max-w-full object-contain" />
              ) : (
                <PlateCanvas seed={cur.seed} width={cur.width} height={cur.height} maxSide={1400} className="max-h-full max-w-full object-contain" />
              )}
            </div>
            {items.length > 1 && (
              <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.25em]">
                <button type="button" onClick={() => go(-1)}>← Anterior</button>
                <button type="button" onClick={() => go(1)}>Siguiente →</button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
