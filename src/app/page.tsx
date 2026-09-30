import Link from "next/link";
import { getProjects, getStats } from "@/content/projects";
import { site } from "@/content/site";
import { animationsOf, timelapsesOf, toCoverItem } from "@/content/types";
import { HomeStage } from "@/components/stages";
import SmoothScroll from "@/components/dom/SmoothScroll";
import Archive, { type ArchiveItem } from "@/components/dom/Archive";
import HoverCaption from "@/components/dom/HoverCaption";
import SiteFooter from "@/components/dom/SiteFooter";

export default function Home() {
  const projects = getProjects();
  const stats = getStats();
  const heroVideo = (slug: string) => {
    const v = projects.find((p) => p.slug === slug)?.process.find((m) => m.type === "video");
    return v?.type === "video" ? v : undefined;
  };
  const bgV = heroVideo(site.hero.backdrop);
  const videos = { eye: site.hero.eye, backdrop: bgV?.src, eyePoster: site.hero.eye, backdropPoster: bgV?.poster };
  const orbit = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 7).map(toCoverItem);
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
  }));

  return (
    <SmoothScroll>
      {/* HERO 3D */}
      <section className="relative h-[100svh] overflow-hidden bg-ink">
        <HomeStage projects={orbit} videos={videos} />
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-5 text-paper md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em]">{site.role}</p>
              <h1 className="font-display text-[22vw] italic leading-[0.78] md:text-[13vw]">{site.name}</h1>
            </div>
            <HoverCaption items={orbit} className="text-right" />
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-paper/60 pt-3 font-mono text-[10px] uppercase tracking-[0.25em]">
            <span>
              {stats.total} obras · {stats.from}–{stats.to}
            </span>
            <a href="#archivo" className="pointer-events-auto ink-link">
              Archivo ↓
            </a>
          </div>
        </div>
      </section>

      {/* STATEMENT + PUERTA AL PASILLO */}
      <section className="paper-grain relative z-10 grid gap-10 border-t border-ink bg-paper px-5 py-24 text-ink md:grid-cols-[1fr_auto] md:items-end md:px-8">
        <p className="max-w-4xl font-display text-3xl leading-tight md:text-5xl">{site.statement}</p>
        <Link href="/pasillo" className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.25em]">
          <span className="relative block h-28 w-16 border-2 border-ink transition-transform duration-500 group-hover:[transform:perspective(300px)_rotateY(-35deg)]" style={{ transformOrigin: "left" }} />
          Entrar al pasillo →
        </Link>
      </section>

      <Archive items={archive} />
      <SiteFooter />
    </SmoothScroll>
  );
}
