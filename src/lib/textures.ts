import { CanvasTexture, SRGBColorSpace, TextureLoader, type Texture } from "three";
import type { ResultMedia } from "@/content/types";
import { drawPlate, plateSize } from "./plate";

/**
 * Caché de texturas por URL/seed con carga imperativa (sin Suspense).
 * Permite que los slots del pasillo cambien de proyecto sin desmontar mallas:
 * se muestra la textura en cuanto llega y las antiguas se liberan con LRU.
 */

const MAX = 48;
const cache = new Map<string, Promise<Texture>>();
const loader = new TextureLoader();

/** sm 480 · ms 800 · md 1280 · tex 1600 (portada). Pedir el tamaño que realmente se ve. */
export type TexSize = "sm" | "ms" | "md" | "tex";

export function mediaTextureUrl(m: ResultMedia, size: TexSize = "md") {
  if (m.type !== "image") return `plate:${m.seed}:${m.width}x${m.height}`;
  if (size === "tex") return m.tex ?? m.src;
  return m.srcSet?.[size] ?? m.srcSet?.md ?? m.src;
}

export function loadMediaTexture(m: ResultMedia, size: TexSize = "md"): Promise<Texture> {
  const k = mediaTextureUrl(m, size);
  const hit = cache.get(k);
  if (hit) {
    cache.delete(k);
    cache.set(k, hit); // refresca posición LRU
    return hit;
  }

  const p: Promise<Texture> =
    m.type === "image"
      ? loader.loadAsync(k).then((t) => {
          t.colorSpace = SRGBColorSpace;
          t.anisotropy = 4;
          return t;
        })
      : Promise.resolve(plateTexture(m.seed, m.width, m.height));

  cache.set(k, p);
  if (cache.size > MAX) {
    const [oldKey, old] = cache.entries().next().value!;
    cache.delete(oldKey);
    old.then((t) => t.dispose());
  }
  return p;
}

export function plateTexture(seed: number, width: number, height: number) {
  const { w, h } = plateSize(width, height, 512);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  drawPlate(c.getContext("2d")!, seed, w, h, 1);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
