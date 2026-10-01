import Link from "next/link";
import { getProjects, getStats } from "@/content/projects";
import { site } from "@/content/site";
import { accentOf, animationsOf, displayTitle, isCollection, timelapsesOf, toCoverItem, type ResultMedia } from "@/content/types";
import ProjectsShowcase, { type ShowcaseItem } from "@/components/dom/ProjectsShowcase";
import { HomeStage } from "@/components/stages";
import SmoothScroll from "@/components/dom/SmoothScroll";
import Archive, { type ArchiveItem } from "@/components/dom/Archive";
import HoverCaption from "@/components/dom/HoverCaption";
import SiteFooter from "@/components/dom/SiteFooter";
import Marquee from "@/components/dom/Marquee";

export default function Home() {
  const projects = getProjects();
  const stats = getStats();
  const videos = { eye: site.hero.eye, backdrop: site.hero.backdrop, eyePoster: site.hero.eye, backdropPoster: site.hero.backdropPoster };
  const orbit = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 7).map(toCoverItem);
  // Proyectos agrupados (carpetas «Proyecto X»): tira con sus piezas (fotos + pósters de vídeo)
  const showcase: ShowcaseItem[] = projects.filter(isCollection).map((p) => {
    const posters: ResultMedia[] = p.process.flatMap((v) =>
      v.type === "video" && v.poster ? [{ type: "image", src: v.poster, width: v.width, height: v.height, accent: v.accent, spot: v.spot }] : [],
    );
    const strip = [...p.results, ...posters];
    return {
      slug: p.slug,
      title: displayTitle(p),
      kind: p.kind,
      year: p.year,
      pieces: strip.length,
      photos: p.results.length,
      videos: p.process.length,
      accent: accentOf(p) ?? strip.map((m) => (m.type === "image" ? m.accent : undefined)).find(Boolean),
      description: p.description,
      strip: strip.slice(0, 6),
    };
  });
  const archive: ArchiveItem[] = projects.map((p) => ({
    slug: p.slug,
    n: p.n,
    title: p.title,
    year: p.year,
    kind: p.kind,
    medium: p.medium,
    cover: p.cover,
    photos: p.results.length,
    timelapses: timelapsesOf(p).length,
    animations: animationsOf(p).length,
    accent: accentOf(p),
  }));

  return (
    <SmoothScroll>
      {/* HERO 3D */}
      <section className="relative h-[100svh] overflow-hidden bg-ink">
        <HomeStage projects={orbit} videos={videos} />

        {/* Velos de tinta: el texto siempre descansa sobre oscuro, sin tapar el ojo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-36 bg-gradient-to-b from-ink/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[58%] bg-gradient-to-t from-ink via-ink/75 to-transparent" />

        {/* Marcas de registro de imprenta + texto vertical */}
        <div className="pointer-events-none absolute inset-y-0 left-3 z-10 hidden items-center text-paper/60 md:flex">
          <span className="reg-mark" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 z-10 hidden flex-col items-center justify-center gap-6 text-paper/60 md:flex">
          <span className="reg-mark" />
          <span className="tag text-[10px] [writing-mode:vertical-rl]">
            {site.city} · Nº 001—{String(stats.total).padStart(3, "0")}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end px-5 pb-5 text-paper md:px-12 md:pb-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="tag mb-4">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-paper" /> {site.role}
              </p>
              <h1 className="text-halo font-display text-[21vw] italic leading-[0.8] md:text-[12.5vw]">{site.name}</h1>
            </div>
            <HoverCaption items={orbit} className="md:mb-6" />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-paper/40 pt-4">
            <span className="tag">
              {stats.total} obras · {stats.from}–{stats.to}
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-paper/80 md:pointer-fine:block">mueve el cursor — el ojo te sigue</span>
            <a href="#archivo" className="tag tag-invert pointer-events-auto transition-transform hover:-translate-y-0.5">
              Ver archivo ↓
            </a>
          </div>
        </div>
      </section>

      <Marquee items={["Ilustración", "Animación", "Bocetos", "Tinta sobre papel", site.city, `${stats.total} obras`, site.name]} />

      {/* STATEMENT + PUERTA AL PASILLO */}
      <section className="paper-grain relative z-10 grid gap-10 bg-paper px-5 py-24 text-ink md:grid-cols-[1fr_auto] md:items-end md:px-8">
        <p className="max-w-4xl font-display text-3xl leading-tight md:text-5xl">{site.statement}</p>
        <Link href="/pasillo" className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.25em]">
          <span className="relative block h-28 w-16 border-2 border-ink transition-transform duration-500 group-hover:[transform:perspective(300px)_rotateY(-35deg)]" style={{ transformOrigin: "left" }} />
          Entrar al pasillo →
        </Link>
      </section>

      <ProjectsShowcase items={showcase} />
      <Archive items={archive} />
      <SiteFooter />
    </SmoothScroll>
  );
}
