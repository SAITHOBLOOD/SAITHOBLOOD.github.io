"use client";

import { useEffect, useRef, useState } from "react";
import type { ResultMedia } from "@/content/types";
import { drawPlate, plateSize } from "@/lib/plate";

/**
 * Miniatura universal: <img> responsive (srcset + blur) para obras reales,
 * <canvas> procedural para láminas demo. Todo diferido hasta entrar en vista.
 */
export default function Thumb({ media, alt, sizes = "(min-width: 768px) 25vw, 50vw", className = "", priority = false }: { media: ResultMedia; alt: string; sizes?: string; className?: string; priority?: boolean }) {
  const ratio = `${media.width} / ${media.height}`;

  if (media.type === "plate") {
    return (
      <div className={`relative overflow-hidden bg-paper ${className}`} style={{ aspectRatio: ratio }}>
        <PlateCanvas seed={media.seed} width={media.width} height={media.height} maxSide={560} className="absolute inset-0 h-full w-full" />
      </div>
    );
  }

  const set = media.srcSet;
  return (
    <div
      className={`relative overflow-hidden bg-paper ${className}`}
      style={{ aspectRatio: ratio, backgroundImage: media.blur ? `url(${media.blur})` : undefined, backgroundSize: "cover" }}
    >
      {media.src && (
        <img
          src={media.src}
          srcSet={set ? [`${set.sm} 480w`, set.ms && `${set.ms} 800w`, `${set.md} 1280w`].filter(Boolean).join(", ") : undefined}
          sizes={sizes}
          alt={alt}
          width={media.width}
          height={media.height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover grayscale"
        />
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
