"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fila horizontal con scroll nativo y snap. En celular se desliza con el dedo; en escritorio
 * aparecen flechas solo si las tarjetas no caben.
 */
export default function HScroll({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const go = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="min-w-0">
      {/* py/px: margen para que las láminas en abanico no se recorten */}
      <ol
        ref={ref}
        aria-label={label}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-8 overflow-x-auto px-5 py-8 [scrollbar-width:none] md:-mx-8 md:scroll-px-10 md:px-10 lg:mx-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ol>
      {!(edge.start && edge.end) && (
        <div className="hidden justify-end gap-2 md:flex">
          <button type="button" onClick={() => go(-1)} disabled={edge.start} aria-label="Anteriores" className="tag px-4 transition-opacity disabled:opacity-30">
            ←
          </button>
          <button type="button" onClick={() => go(1)} disabled={edge.end} aria-label="Siguientes" className="tag px-4 transition-opacity disabled:opacity-30">
            →
          </button>
        </div>
      )}
    </div>
  );
}
