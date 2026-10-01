import "server-only";
import { cache } from "react";
import catalog from "./catalog.json";
import overrides from "./overrides.json";
import { timelapsesOf, type ImageMedia, type PlateMedia, type Project, type ProjectKind, type ResultMedia } from "./types";

/**
 * Catálogo = catalog.json (generado por `npm run ingest` desde contenido/)
 *          + overrides.json (títulos, descripciones, destacados — editable a mano)
 *          + catálogo demo mientras DEMO_CATALOG !== "false" (ver .env).
 */

type Raw = Omit<Project, "n" | "cover"> & { cover: ResultMedia | null; dateKey?: string };
type Override = Partial<Pick<Project, "title" | "year" | "kind" | "medium" | "description" | "tags" | "featured">> & { hidden?: boolean };

const KINDS: ProjectKind[] = ["ilustracion", "animacion", "poster", "boceto"];

/** Proyectos solo-vídeo: el póster hace de portada. */
function withCover(p: Raw): Raw & { cover: ResultMedia } {
  if (p.cover) return p as Raw & { cover: ResultMedia };
  const v = p.process.find((m) => m.type === "video");
  const cover: ImageMedia = v?.type === "video" && v.poster
    ? { type: "image", src: v.poster, tex: v.poster, width: v.width, height: v.height, accent: v.accent, colorAmount: v.colorAmount, spot: v.spot }
    : { type: "image", src: "", width: 4, height: 3 };
  return { ...p, cover };
}

/* ---------- Catálogo demo ---------- */

const DEMO_TITLES = ["El ojo del pozo", "Escalera sin piso", "Luna mordida", "Casa de manos", "Pez reloj", "Puerta al techo", "Respiración", "Cuervo interior", "La sal del sueño", "Vigilia", "Nudo de agua", "El que duerme de pie"];
const DEMO_MEDIUMS = ["Tinta china sobre papel", "Grafito y carbón", "Linóleo, tinta negra", "Plumilla", "Digital, pincel de tinta seca", "Aguada"];

function demoCatalog(count = 64): Raw[] {
  const plate = (seed: number, w: number, h: number, label?: string): PlateMedia => ({ type: "plate", seed, width: w, height: h, label });
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 1;
    const [w, h] = [[1200, 1600], [1200, 1200], [1600, 1200], [1200, 1500]][seed % 4];
    const results = Array.from({ length: 1 + (seed % 4) }, (_, k) => plate(seed * 100 + k, w, h));
    return {
      slug: `demo-${String(seed).padStart(3, "0")}`,
      title: seed % 3 === 0 ? DEMO_TITLES[(seed / 3) % DEMO_TITLES.length | 0] : undefined,
      year: 2018 + (seed % 8),
      dateKey: `${2018 + (seed % 8)}0101`,
      kind: KINDS[seed % KINDS.length],
      medium: DEMO_MEDIUMS[seed % DEMO_MEDIUMS.length],
      tags: ["demo"],
      featured: seed % 9 === 0,
      cover: results[0],
      results,
      process: seed % 2 === 0 ? [plate(seed * 100, w, h, "timelapse")] : [],
    };
  });
}

/* ---------- API ---------- */

export const getProjects = cache((): Project[] => {
  const ov = overrides as Record<string, Override | string>;
  const real = (catalog.projects as unknown as Raw[])
    .map((p) => {
      const o = typeof ov[p.slug] === "object" ? (ov[p.slug] as Override) : {};
      return { ...p, ...o };
    })
    .filter((p) => !(p as Override).hidden);

  const useDemo = process.env.DEMO_CATALOG !== "false" || real.length === 0;
  const list = (useDemo ? [...real, ...demoCatalog()] : real).map(withCover);

  // Nº de catálogo cronológico (el más antiguo = 1). Se listan del más reciente al más antiguo.
  const chrono = [...list].sort((a, b) => (a.dateKey ?? `${a.year}`).localeCompare(b.dateKey ?? `${b.year}`) || a.slug.localeCompare(b.slug));
  return chrono
    .map(({ dateKey: _d, ...p }, i) => ({ ...p, n: i + 1 }) as Project)
    .reverse();
});

export const getProject = (slug: string) => getProjects().find((p) => p.slug === slug);

export function getNeighbors(slug: string) {
  const all = getProjects();
  const i = all.findIndex((p) => p.slug === slug);
  return { prev: all[(i - 1 + all.length) % all.length], next: all[(i + 1) % all.length] };
}

export function getStats() {
  const all = getProjects();
  const years = all.map((p) => p.year).filter((y) => y > 0);
  return {
    total: all.length,
    untitled: all.filter((p) => !p.title).length,
    timelapses: all.reduce((n, p) => n + timelapsesOf(p).length, 0),
    from: Math.min(...years),
    to: Math.max(...years),
  };
}
