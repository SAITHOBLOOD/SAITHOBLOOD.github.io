"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { catalogCode, displayTitle, displayYear, KIND_LABEL, type ProjectKind, type ResultMedia } from "@/content/types";
import Thumb from "./Thumb";

/** Versión ligera del proyecto para el cliente (sin listas de media completas). */
export interface ArchiveItem {
  slug: string;
  n: number;
  title?: string;
  year: number;
  kind: ProjectKind;
  medium?: string;
  cover: ResultMedia;
  photos: number;
  timelapses: number;
  animations: number;
}

const PAGE = 24;
type View = "grid" | "index";

/**
 * Archivo escalable: filtros (tipo, año, con proceso), búsqueda por Nº/título/técnica,
 * dos vistas (cuadrícula / índice) y carga incremental automática.
 * 20 obras o 2.000: solo se montan las que el visitante alcanza a ver.
 */
export default function Archive({ items }: { items: ArchiveItem[] }) {
  const [kind, setKind] = useState<ProjectKind | "all">("all");
  const [year, setYear] = useState<number | "all">("all");
  const [withProcess, setWithProcess] = useState(false);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("grid");
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  const kinds = useMemo(() => {
    const counts = new Map<ProjectKind, number>();
    items.forEach((i) => counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1));
    return [...counts.entries()];
  }, [items]);
  const years = useMemo(() => [...new Set(items.map((i) => i.year))].sort((a, b) => b - a), [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^n[ºo°]?\s*/, "");
    return items.filter((i) => {
      if (kind !== "all" && i.kind !== kind) return false;
      if (year !== "all" && i.year !== year) return false;
      if (withProcess && !i.timelapses) return false;
      if (!needle) return true;
      return String(i.n).padStart(3, "0").includes(needle) || displayTitle(i).toLowerCase().includes(needle) || (i.medium ?? "").toLowerCase().includes(needle);
    });
  }, [items, kind, year, withProcess, q]);

  useEffect(() => setLimit(PAGE), [kind, year, withProcess, q]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const shown = filtered.slice(0, limit);

  return (
    <section id="archivo" className="paper-grain relative z-10 min-h-screen bg-paper px-5 pb-32 pt-28 text-ink md:px-8">
      <InkFilters />
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
        <h2 className="font-display text-[18vw] italic leading-[0.8] md:text-[10vw]">Archivo</h2>
        <p className="max-w-xs font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em]">
          {items.length} obras · {items.filter((i) => !i.title).length} sin título · {items.reduce((n, i) => n + i.timelapses, 0)} timelapses
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="sticky top-0 z-20 -mx-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-ink/20 bg-paper/95 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo">
          <Chip active={kind === "all"} onClick={() => setKind("all")}>
            Todo <sup>{items.length}</sup>
          </Chip>
          {kinds.map(([k, n]) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {KIND_LABEL[k]} <sup>{n}</sup>
            </Chip>
          ))}
        </div>
        <select aria-label="Año" value={year} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))} className="border border-ink bg-transparent px-2 py-1 uppercase">
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y > 0 ? y : "Sin fecha"}
            </option>
          ))}
        </select>
        <Chip active={withProcess} onClick={() => setWithProcess((v) => !v)}>
          ▶ Con proceso
        </Chip>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar Nº, título, técnica…"
          className="min-w-[12rem] flex-1 border-b border-ink bg-transparent py-1 normal-case tracking-normal placeholder:text-ink/40 focus:outline-none"
        />
        <div className="flex gap-2" role="group" aria-label="Vista">
          <Chip active={view === "grid"} onClick={() => setView("grid")}>
            Cuadrícula
          </Chip>
          <Chip active={view === "index"} onClick={() => setView("index")}>
            Índice
          </Chip>
        </div>
      </div>

      <p className="py-4 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
        {filtered.length === items.length ? `Mostrando ${shown.length} de ${items.length}` : `${filtered.length} resultados`}
      </p>

      {filtered.length === 0 && <p className="py-24 text-center font-display text-3xl italic">Nada por aquí. Solo niebla.</p>}

      {view === "grid" ? <Grid items={shown} /> : <Index items={shown} />}

      {limit < filtered.length && (
        <div ref={sentinel} className="py-12 text-center font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">
          entintando más…
        </div>
      )}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`border border-ink px-2.5 py-1 uppercase transition-colors ${active ? "bg-ink text-paper" : "hover:bg-ink/10"}`}>
      {children}
    </button>
  );
}

function Meta({ item }: { item: ArchiveItem }) {
  return (
    <div className="mt-2 flex items-baseline justify-between gap-2">
      <p className="truncate">
        <span className="font-mono text-[10px] tracking-[0.15em]">{catalogCode(item)}</span>{" "}
        <span className={`font-display text-lg ${item.title ? "" : "italic opacity-50"}`}>{displayTitle(item)}</span>
      </p>
      <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] opacity-60">
        {item.animations > 0 && <span title="Animación">◉ · </span>}
        {item.timelapses > 0 && <span title="Timelapses de proceso">▶{item.timelapses} · </span>}
        {item.photos > 1 && <span title="Fotos">◫{item.photos} · </span>}
        {displayYear(item.year)}
      </p>
    </div>
  );
}

/** Columnas según ancho (2 / 3 / 4), sincronizadas con los breakpoints de Tailwind. */
function useColumns() {
  const [cols, setCols] = useState(2);
  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const update = () => setCols(xl.matches ? 4 : md.matches ? 3 : 2);
    update();
    md.addEventListener("change", update);
    xl.addEventListener("change", update);
    return () => {
      md.removeEventListener("change", update);
      xl.removeEventListener("change", update);
    };
  }, []);
  return cols;
}

/**
 * Masonry con reparto round-robin: el orden de lectura sigue siendo por filas
 * (Nº 145, 144, 143… de izquierda a derecha), a diferencia de CSS columns.
 */
function Grid({ items }: { items: ArchiveItem[] }) {
  const cols = useColumns();
  const columns = Array.from({ length: cols }, (_, c) => items.filter((_, i) => i % cols === c));
  return (
    <div className="flex gap-4 md:gap-6">
      {columns.map((col, c) => (
        <ul key={c} className="flex min-w-0 flex-1 flex-col gap-8">
          {col.map((item) => (
            <li key={item.slug}>
              <Link href={`/proyecto/${item.slug}`} className="card group block">
                <Thumb media={item.cover} alt={`${catalogCode(item)} ${displayTitle(item)}`} className="card-media" />
                <Meta item={item} />
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/** Vista índice: filas densas + vista previa que sigue al cursor. Ideal para cientos de obras. */
function Index({ items }: { items: ArchiveItem[] }) {
  const [hover, setHover] = useState<ArchiveItem | null>(null);
  const preview = useRef<HTMLDivElement>(null);

  return (
    <div
      onPointerMove={(e) => {
        if (preview.current) preview.current.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 120}px)`;
      }}
      onPointerLeave={() => setHover(null)}
    >
      <ul className="border-t border-ink">
        {items.map((item) => (
          <li key={item.slug} onPointerEnter={() => setHover(item)}>
            <Link href={`/proyecto/${item.slug}`} className="grid grid-cols-[4rem_1fr_auto] items-baseline gap-4 border-b border-ink/30 py-3 transition-colors hover:bg-ink hover:text-paper md:grid-cols-[5rem_1fr_10rem_6rem_4rem]">
              <span className="pl-1 font-mono text-[11px] tracking-[0.15em]">{catalogCode(item)}</span>
              <span className={`truncate font-display text-xl md:text-2xl ${item.title ? "" : "italic opacity-60"}`}>{displayTitle(item)}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] md:block">{KIND_LABEL[item.kind]}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] md:block">{item.timelapses ? `▶ ${item.timelapses}` : ""}</span>
              <span className="pr-1 text-right font-mono text-[11px]">{displayYear(item.year)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div ref={preview} className="pointer-events-none fixed left-0 top-0 z-30 hidden w-56 md:block" aria-hidden>
        {hover && <Thumb media={hover.cover} alt="" sizes="224px" className="shadow-[8px_8px_0_#0a0a0a]" />}
      </div>
    </div>
  );
}

/** Filtro SVG de "tinta líquida" para el hover de las miniaturas DOM. */
function InkFilters() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="ink-liquid">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="n">
          <animate attributeName="baseFrequency" dur="6s" values="0.012 0.02;0.02 0.012;0.012 0.02" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
