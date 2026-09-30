import type { Metadata } from "next";
import { getStats } from "@/content/projects";
import { site } from "@/content/site";
import { InfoStage } from "@/components/stages";
import SmoothScroll from "@/components/dom/SmoothScroll";
import SiteFooter from "@/components/dom/SiteFooter";

export const metadata: Metadata = { title: "Info" };

export default function Info() {
  const stats = getStats();

  return (
    <SmoothScroll>
      <main className="relative grid bg-paper text-ink md:grid-cols-2">
        {/* Escalera 3D fija a la izquierda (arriba en móvil) */}
        <div className="relative h-[60svh] md:sticky md:top-0 md:h-[100svh]">
          <InfoStage />
          <p className="pointer-events-none absolute bottom-5 left-5 font-mono text-[10px] uppercase tracking-[0.25em] md:left-8">subir no lleva a ningún lado — y aun así</p>
        </div>

        <div className="paper-grain px-5 pb-24 pt-10 md:px-10 md:pt-32">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em]">{site.role} · {site.city}</p>
          <h1 className="mt-4 font-display text-[18vw] italic leading-[0.8] md:text-[8vw]">{site.name}</h1>

          <p className="mt-12 font-display text-3xl leading-tight md:text-4xl">{site.statement}</p>

          <div className="mt-12 space-y-4 text-lg leading-relaxed">
            {site.bio.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </div>

          <dl className="mt-16 grid grid-cols-3 border-y border-ink py-6 text-center">
            {[
              [stats.total, "obras"],
              [stats.timelapses, "timelapses"],
              [`${stats.to - stats.from + 1}`, "años dibujando"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="font-display text-5xl italic">{v}</dt>
                <dd className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">{l}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">Encargos</h2>
            <ul className="mt-4 border-t border-ink">
              {site.services.map((s) => (
                <li key={s} className="border-b border-ink/30 py-3 font-display text-2xl">
                  {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">Recorrido</h2>
            <ol className="mt-4 border-t border-ink">
              {site.timeline.map((t) => (
                <li key={t.text} className="grid grid-cols-[5rem_1fr] border-b border-ink/30 py-3">
                  <span className="font-mono text-sm">{t.year}</span>
                  <span className="text-lg">{t.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">Contacto</h2>
            <a href={`mailto:${site.email}`} className="ink-link mt-4 inline-block font-display text-4xl italic">
              {site.email}
            </a>
            <div className="mt-4 flex gap-6 font-mono text-[11px] uppercase tracking-[0.25em]">
              {site.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="ink-link">
                  {l.label} ↗
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </SmoothScroll>
  );
}
