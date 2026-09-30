import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNeighbors, getProject, getProjects } from "@/content/projects";
import { animationsOf, catalogCode, displayTitle, displayYear, KIND_LABEL, timelapsesOf } from "@/content/types";
import { CoverStage } from "@/components/stages";
import SmoothScroll from "@/components/dom/SmoothScroll";
import Gallery from "@/components/dom/Gallery";
import TimelapsePlayer from "@/components/dom/TimelapsePlayer";
import SiteFooter from "@/components/dom/SiteFooter";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  const title = `${catalogCode(p)} ${displayTitle(p)}`;
  const image = p.cover.type === "image" ? p.cover.srcSet?.md ?? p.cover.src : undefined;
  return { title, description: p.description ?? `${KIND_LABEL[p.kind]}, ${displayYear(p.year)}`, openGraph: image ? { images: [image] } : undefined };
}

export default async function ProjectPage({ params }: Params) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const { prev, next } = getNeighbors(p.slug);
  const title = displayTitle(p);
  const coverRatio = p.cover.width / p.cover.height;
  const anims = animationsOf(p);
  const timelapses = timelapsesOf(p);
  const sections = [anims.length && "anim", timelapses.length && "proc", p.results.length && "res"].filter(Boolean) as string[];
  const roman = (k: string) => ["I", "II", "III"][sections.indexOf(k)];

  return (
    <SmoothScroll>
      <main className="paper-grain relative min-h-screen bg-paper text-ink">
        {/* Cabecera: ficha + portada WebGL */}
        <section className="grid gap-8 px-5 pb-16 pt-28 md:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)] md:px-8">
          <div className="flex flex-col justify-between gap-10 md:sticky md:top-28 md:h-[calc(100svh-9rem)]">
            <div>
              <Link href="/#archivo" className="ink-link font-mono text-[11px] uppercase tracking-[0.25em]">
                ← Archivo
              </Link>
              <p className="mt-10 font-mono text-sm tracking-[0.2em]">{catalogCode(p)}</p>
              <h1 className={`mt-2 font-display text-6xl leading-[0.9] md:text-7xl ${p.title ? "" : "italic opacity-60"}`}>{title}</h1>
              {p.description && <p className="mt-6 max-w-md font-display text-xl leading-snug">{p.description}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-y-3 border-t border-ink pt-4 font-mono text-[11px] uppercase tracking-[0.18em]">
              <dt className="opacity-50">Tipo</dt>
              <dd>{KIND_LABEL[p.kind]}</dd>
              <dt className="opacity-50">Año</dt>
              <dd>{displayYear(p.year)}</dd>
              {p.medium && (
                <>
                  <dt className="opacity-50">Técnica</dt>
                  <dd className="normal-case tracking-normal">{p.medium}</dd>
                </>
              )}
              <dt className="opacity-50">Material</dt>
              <dd>
                {[
                  p.results.length && `${p.results.length} foto${p.results.length === 1 ? "" : "s"}`,
                  anims.length && `${anims.length} animación${anims.length === 1 ? "" : "es"}`,
                  timelapses.length && `${timelapses.length} timelapse${timelapses.length === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </dd>
            </dl>
          </div>

          <div className="relative mx-auto w-full min-w-0 overflow-hidden" style={{ aspectRatio: `${coverRatio}`, maxHeight: "85svh", maxWidth: `calc(85svh * ${coverRatio})` }}>
            <CoverStage media={p.cover} alt={title} />
          </div>
        </section>

        {/* Animación terminada */}
        {anims.length > 0 && (
          <section className="border-t border-ink px-5 py-16 md:px-8">
            <SectionTitle n={roman("anim")} label="Animación" />
            <div className={`grid gap-10 ${anims.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-4xl"}`}>
              {anims.map((m, i) => (
                <TimelapsePlayer key={i} media={m} title={title} />
              ))}
            </div>
          </section>
        )}

        {/* Proceso */}
        {timelapses.length > 0 && (
          <section className="border-t border-ink px-5 py-16 md:px-8">
            <SectionTitle n={roman("proc")} label="Proceso" hint="Arrastra la barra para rebobinar el dibujo" />
            <div className={`grid gap-10 ${timelapses.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-4xl"}`}>
              {timelapses.map((m, i) => (
                <TimelapsePlayer key={i} media={m} title={title} />
              ))}
            </div>
          </section>
        )}

        {/* Resultado */}
        {p.results.length > 0 && (
          <section className="border-t border-ink px-5 py-16 md:px-8">
            <SectionTitle n={roman("res")} label="Resultado" hint={`${p.results.length} foto${p.results.length === 1 ? "" : "s"}`} />
            <div className={p.results.length === 1 ? "mx-auto max-w-4xl" : ""}>
              <Gallery items={p.results} title={title} />
            </div>
          </section>
        )}

        {/* Anterior / siguiente */}
        <nav className="grid grid-cols-2 border-t border-ink" aria-label="Más obras">
          {[
            { p: prev, dir: "← Anterior" },
            { p: next, dir: "Siguiente →" },
          ].map(({ p: q, dir }, i) => (
            <Link key={dir} href={`/proyecto/${q.slug}`} className={`group px-5 py-12 transition-colors hover:bg-ink hover:text-paper md:px-8 ${i ? "border-l border-ink text-right" : ""}`}>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em]">{dir}</span>
              <span className="mt-2 block font-mono text-xs tracking-[0.2em] opacity-60">{catalogCode(q)}</span>
              <span className={`block font-display text-3xl md:text-5xl ${q.title ? "" : "italic"}`}>{displayTitle(q)}</span>
            </Link>
          ))}
        </nav>
      </main>
      <SiteFooter />
    </SmoothScroll>
  );
}

function SectionTitle({ n, label, hint }: { n: string; label: string; hint?: string }) {
  return (
    <div className="mb-10 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-5xl italic md:text-6xl">
        <span className="mr-4 font-mono text-sm not-italic tracking-[0.2em]">{n}.</span>
        {label}
      </h2>
      {hint && <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">{hint}</p>}
    </div>
  );
}
