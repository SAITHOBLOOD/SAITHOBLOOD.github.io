/**
 * Tipos compartidos cliente/servidor. Sin imports de Node aquí:
 * este archivo lo usan componentes cliente.
 */

export type ProjectKind = "ilustracion" | "animacion" | "poster" | "boceto";

export const KIND_LABEL: Record<ProjectKind, string> = {
  ilustracion: "Ilustración",
  animacion: "Animación",
  poster: "Póster",
  boceto: "Boceto",
};

export interface ImageMedia {
  type: "image";
  /** 1280 px WebP (uso general). */
  src: string;
  /** sm 480 WebP · ms 800 WebP · md 1280 WebP · lg 2560 AVIF */
  srcSet?: { sm: string; ms?: string; md: string; lg: string };
  /** Textura WebGL (2048 px). */
  tex?: string;
  width: number;
  height: number;
  /** blurDataURL 16 px. */
  blur?: string;
  alt?: string;
  /** Piezas con color: tinta dominante (#rrggbb), proporción de píxeles saturados y plancha de «segunda tinta». */
  accent?: string;
  colorAmount?: number;
  spot?: string;
}

export interface VideoMedia {
  type: "video";
  src: string;
  poster?: string;
  width: number;
  height: number;
  duration?: number;
  label?: string;
  /** result = la animación terminada · process = timelapse / registro de proceso. */
  role?: "result" | "process";
  /** Piezas con color: tinta dominante (#rrggbb), proporción de píxeles saturados y plancha de «segunda tinta». */
  accent?: string;
  colorAmount?: number;
  spot?: string;
}

/** Lámina procedural (modo demo, sin assets). `timelapse` la anima como proceso. */
export interface PlateMedia {
  type: "plate";
  seed: number;
  width: number;
  height: number;
  label?: string;
}

export type ResultMedia = ImageMedia | PlateMedia;
export type ProcessMedia = VideoMedia | PlateMedia;

export interface Project {
  slug: string;
  /** Ruta original dentro de contenido/ (trazabilidad con Drive). */
  source?: string;
  /** Número de catálogo (orden cronológico). Identifica aunque no haya título. */
  n: number;
  title?: string;
  year: number;
  kind: ProjectKind;
  medium?: string;
  description?: string;
  tags: string[];
  cover: ResultMedia;
  /** Fotos del resultado final. */
  results: ResultMedia[];
  /** Timelapses / registros de proceso. */
  process: ProcessMedia[];
  featured?: boolean;
  /** En la carpeta «Pasillo» de Drive: selección curada para el recorrido 3D. */
  pasillo?: boolean;
  ink?: { threshold?: number; bleed?: number };
}

export const catalogCode = (p: Pick<Project, "n">) => `Nº ${String(p.n).padStart(3, "0")}`;
export const displayTitle = (p: Pick<Project, "title">) => p.title?.trim() || "Sin título";

/** Proyecto sin listas de media: lo justo para escenas 3D, leyendas y collages. */
export type CoverItem = Pick<Project, "slug" | "n" | "title" | "year" | "kind" | "cover" | "ink" | "pasillo">;
export const toCoverItem = ({ slug, n, title, year, kind, cover, ink, pasillo }: Project): CoverItem => ({ slug, n, title, year, kind, cover, ink, pasillo });

/** year = 0 → sin fecha conocida (ni en el nombre del archivo ni en EXIF). */
export const displayYear = (year: number) => (year > 0 ? String(year) : "s. f.");

export const isAnimation = (m: ProcessMedia) => m.type === "video" && m.role === "result";
export const timelapsesOf = (p: Pick<Project, "process">) => p.process.filter((m) => !isAnimation(m));
export const animationsOf = (p: Pick<Project, "process">) => p.process.filter(isAnimation);

/** Proyecto agrupado (carpeta en Drive: «Proyecto X»), no una pieza suelta. */
export const isCollection = (p: Pick<Project, "source">) => !!p.source && !/\.[a-z0-9]{2,4}$/i.test(p.source);
/** Tinta dominante de la portada, si la pieza tiene color. */
export const accentOf = (p: Pick<Project, "cover">) => (p.cover.type === "image" ? p.cover.accent : undefined);
