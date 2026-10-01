import Link from "next/link";
import { displayYear, KIND_LABEL, type ProjectKind, type ResultMedia } from "@/content/types";
import Thumb from "./Thumb";
import HScroll from "./HScroll";

export interface ShowcaseItem {
  slug: string;
  title: string;
  kind: ProjectKind;
  year: number;
  pieces: number;
  photos: number;
  videos: number;
  accent?: string;
  description?: string;
  /** Portada primero; las siguientes se asoman detrás como láminas apiladas. */
  strip: ResultMedia[];
}

/**
 * Proyectos (carpetas «Proyecto X» en Drive): una fila compacta de tarjetas. Cada tarjeta es
 * la portada con un par de piezas asomando detrás; el resto se ve al abrir el proyecto.
 * Con muchos proyectos la fila se desliza (dedo, trackpad o flechas) en vez de crecer hacia abajo.
 */
export default function ProjectsShowcase({ items }: { items: ShowcaseItem[] }) {
  if (!items.length) return null;
  const pieces = items.reduce((n, i) => n + i.pieces, 0);
  return (
    <section id="proyectos" className="relative z-10 bg-ink px-5 py-16 text-paper md:px-8 md:py-20">
      <div className="grid gap-6 lg:grid-cols-[minmax(13rem,1fr)_minmax(0,3fr)] lg:gap-12">
        <header className="flex flex-col justify-between gap-6 lg:border-r lg:border-paper/20 lg:py-8 lg:pr-10">
          <div>
            <h2 className="font-display text-6xl italic leading-[0.85] md:text-7xl">Proyectos</h2>
            <p className="mt-5 max-w-xs font-display text-xl leading-snug text-paper/75">Series completas: ábrelas para ver todas sus piezas.</p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-paper/60">
            {items.length} proyecto{items.length === 1 ? "" : "s"} · {pieces} piezas
          </p>
        </header>

        <HScroll label="Proyectos">
          {items.map((p, i) => (
            <ProjectCard key={p.slug} p={p} i={i} />
          ))}
        </HScroll>
      </div>
    </section>
  );
}

function ProjectCard({ p, i }: { p: ShowcaseItem; i: number }) {
  const [cover, ...rest] = p.strip;
  if (!cover) return null;
  return (
    <li className="relative w-[68vw] max-w-[17rem] shrink-0 snap-start hover:z-10 sm:w-60">
      <Link href={`/proyecto/${p.slug}`} className="card group block">
        <div className="relative aspect-[4/5]">
          {rest.slice(0, 2).map((m, k) => (
            <div key={k} aria-hidden className={`deck-card deck-${k} absolute inset-0`}>
              <Thumb media={m} alt="" sizes="15rem" className="h-full w-full border border-paper/15" />
            </div>
          ))}
          <div className="absolute inset-0 shadow-[6px_6px_0_rgba(0,0,0,0.55)]">
            <Thumb media={cover} alt="" sizes="(min-width: 640px) 15rem, 68vw" className="card-media h-full w-full border border-paper/25" />
          </div>
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="font-mono text-xs tracking-[0.2em] text-paper/50">{String(i + 1).padStart(2, "0")}</span>
          <h3 className="min-w-0 truncate font-display text-3xl leading-tight transition-transform duration-500 group-hover:translate-x-1 md:text-4xl">{p.title}</h3>
          {p.accent && <span className="color-dot shrink-0" style={{ background: p.accent }} title="Contiene piezas a color" />}
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/60 transition-colors group-hover:text-paper">
          {KIND_LABEL[p.kind]} · {p.pieces} pieza{p.pieces === 1 ? "" : "s"}
          {p.year > 0 && ` · ${displayYear(p.year)}`}
        </p>
      </Link>
    </li>
  );
}
