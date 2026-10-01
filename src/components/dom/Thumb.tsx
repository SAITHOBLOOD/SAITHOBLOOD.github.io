"use client";

import { useEffect, useRef, useState } from "react";
import type { ResultMedia } from "@/content/types";
import { drawPlate, plateSize } from "@/lib/plate";

/**
 * Miniatura universal: <img> responsive (srcset + blur) para obras reales,
 * <canvas> procedural para láminas demo. Todo diferido hasta entrar en vista.
 *
 * Piezas con color («segunda tinta»): 1) la obra en tinta (gris), 2) la plancha de color
 * plana en multiplicar con registro desalineado, 3) el color real, que florece desde el
 * cursor como acuarela (máscara radial animada). `colorOn` lo muestra entero.
 */
export default function Thumb({
  media,
  alt,
  sizes = "(min-width: 768px) 25vw, 50vw",
  className = "",
  priority = false,
  colorOn = false,
}: {
  media: ResultMedia;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  colorOn?: boolean;
}) {
  const ratio = `${media.width} / ${media.height}`;

  if (media.type === "plate") {
    return (
      <div className={`relative overflow-hidden bg-paper ${className}`} style={{ aspectRatio: ratio }}>
        <PlateCanvas seed={media.seed} width={media.width} height={media.height} maxSide={560} className="absolute inset-0 h-full w-full" />
      </div>
    );
  }

  const set = media.srcSet;
  // Los tamaños son del lado LARGO (sm 480 · ms 800 · md 1280) y width/height son los del md:
  // el descriptor «w» debe ser el ancho real, si no las obras verticales se piden pequeñas y salen borrosas.
  const long = Math.max(media.width, media.height);
  const wOf = (side: number) => Math.round((media.width * side) / long);
  const srcSet = set ? [`${set.sm} ${wOf(480)}w`, set.ms && `${set.ms} ${wOf(Math.min(800, long))}w`, `${set.md} ${media.width}w`].filter(Boolean).join(", ") : undefined;
  const hasColor = !!media.accent;
  // Posición del cursor para que el color florezca desde ahí
  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--cx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--cy", `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <div
      className={`relative overflow-hidden bg-paper ${hasColor ? "has-color" : ""} ${colorOn ? "color-on" : ""} ${className}`}
      style={{ aspectRatio: ratio, backgroundImage: media.blur ? `url(${media.blur})` : undefined, backgroundSize: "cover" }}
      onPointerEnter={hasColor ? track : undefined}
      onPointerMove={hasColor ? track : undefined}
    >
      {media.src && (
        <img
          src={media.src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={media.width}
          height={media.height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover grayscale"
        />
      )}
      {hasColor && media.spot && (
        <img src={media.spot} alt="" aria-hidden loading="lazy" decoding="async" className="spot-plate pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
      {hasColor && media.src && (
        <img src={media.src} srcSet={srcSet} sizes={sizes} alt="" aria-hidden loading="lazy" decoding="async" className="color-bloom pointer-events-none absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}

export function PlateCanvas({ seed, width, height, maxSide = 560, progress = 1, className }: { seed: number; width: number; height: number; maxSide?: number; progress?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(false);
  const { w, h } = plateSize(width, height, maxSide);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !ref.current) return;
    drawPlate(ref.current.getContext("2d")!, seed, w, h, progress);
  }, [inView, seed, w, h, progress]);

  return <canvas ref={ref} width={w} height={h} className={className} />;
}
