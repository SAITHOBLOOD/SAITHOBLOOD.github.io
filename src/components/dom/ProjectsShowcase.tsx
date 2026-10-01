import Link from "next/link";
import { displayYear, KIND_LABEL, type ProjectKind, type ResultMedia } from "@/content/types";
import Thumb from "./Thumb";

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
  strip: ResultMedia[];
}

/**
 * Proyectos (carpetas «Proyecto X» en Drive): filas editoriales sobre tinta, cada una con
 * una tira de película de sus piezas. Crece sola con cada carpeta nueva.
 */
export default function ProjectsShowcase({ items }: { items: ShowcaseItem[] }) {
  if (!items.length) return null;
  return (
    <section id="proyectos" className="relative z-10 bg-ink px-5 pb-24 pt-20 text-paper md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-paper/30 pb-6">
        <h2 className="font-display text-[18vw] italic leading-[0.8] md:text-[10vw]">Proyectos</h2>
        <span className="tag">
          {items.length} proyecto{items.length === 1 ? "" : "s"} · {items.reduce((n, i) => n + i.pieces, 0)} piezas
        </span>
      </div>

      <ol>
        {items.map((p, i) => (
          <li key={p.slug} className="border-b border-paper/20">
            <Link href={`/proyecto/${p.slug}`} className="card group grid gap-6 py-10 md:grid-cols-[5rem_minmax(0,1fr)] md:gap-10">
              <span className="font-mono text-sm tracking-[0.2em] text-paper/50">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h3 className="font-display text-5xl leading-none transition-transform duration-500 group-hover:translate-x-2 md:text-7xl">{p.title}</h3>
                  <p className="flex flex-wrap items-center gap-2">
                    {p.accent && <span className="color-dot" style={{ background: p.accent }} title="Proyecto con color" />}
                    <span className="tag">{KIND_LABEL[p.kind]}</span>
                    <span className="tag">
                      {p.photos > 0 && `${p.photos} foto${p.photos === 1 ? "" : "s"}`}
                      {p.photos > 0 && p.videos > 0 && " · "}
                      {p.videos > 0 && `${p.videos} video${p.videos === 1 ? "" : "s"}`}
                    </span>
                    {p.year > 0 && <span className="tag">{displayYear(p.year)}</span>}
                  </p>
                </div>
                {p.description && <p className="mt-4 max-w-2xl font-display text-xl leading-snug text-paper/80">{p.description}</p>}

                {/* Tira de película: se desliza con el dedo en celular */}
                <div className="-mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
                  {p.strip.map((m, k) => (
                    <div key={k} className="w-40 shrink-0 transition-transform duration-500 md:w-52" style={{ transitionDelay: `${k * 40}ms` }}>
                      <Thumb media={m} alt="" sizes="(min-width: 768px) 13rem, 10rem" className="card-media border border-paper/10" />
                    </div>
                  ))}
                  {p.pieces > p.strip.length && (
                    <div className="grid w-28 shrink-0 place-items-center border border-dashed border-paper/30 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/60">
                      +{p.pieces - p.strip.length}
                    </div>
                  )}
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-paper/60 transition-colors group-hover:text-paper">Abrir proyecto →</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
