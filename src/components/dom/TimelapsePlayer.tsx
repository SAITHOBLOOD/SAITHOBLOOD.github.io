"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProcessMedia } from "@/content/types";
import { PlateCanvas } from "./Thumb";

const RATES = [1, 2, 4];
const PLATE_DURATION = 14; // s, duración del timelapse simulado (modo demo)

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Reproductor de proceso: se arrastra la barra para "rebobinar el dibujo".
 * Vídeos reales (timelapse) o láminas demo que se dibujan boceto → entintado.
 * Autoplay silencioso solo mientras está en pantalla.
 */
export default function TimelapsePlayer({ media, title }: { media: ProcessMedia; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(media.type === "video" ? (media.duration ?? 0) : PLATE_DURATION);
  const [rate, setRate] = useState(1);
  const [inView, setInView] = useState(false);
  const scrubbing = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay en vista / pausa fuera
  useEffect(() => setPlaying(inView), [inView]);

  // Vídeo: sincroniza estado
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.playbackRate = rate;
    if (playing) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [playing, rate]);

  // Lámina demo: reloj propio
  useEffect(() => {
    if (media.type !== "plate" || !playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!scrubbing.current) setProgress((p) => (p + (dt * rate) / PLATE_DURATION) % 1.0001);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [media.type, playing, rate]);

  const seek = useCallback(
    (p: number) => {
      const c = Math.min(1, Math.max(0, p));
      setProgress(c);
      if (video.current && video.current.duration) video.current.currentTime = c * video.current.duration;
    },
    [],
  );

  const onTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek((e.clientX - r.left) / r.width);
  };

  const phase = progress < 0.3 ? "boceto" : progress < 0.95 ? "entintado" : "final";

  return (
    <figure ref={box} className="group">
      <div className="relative overflow-hidden bg-ink" style={{ aspectRatio: `${media.width} / ${media.height}` }}>
        {media.type === "video" ? (
          <video
            ref={video}
            src={inView || progress > 0 ? media.src : undefined}
            poster={media.poster}
            muted
            loop
            playsInline
            preload="none"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => !scrubbing.current && setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
            className="absolute inset-0 h-full w-full object-contain grayscale"
          />
        ) : (
          <PlateCanvas seed={media.seed} width={media.width} height={media.height} maxSide={900} progress={progress} className="absolute inset-0 h-full w-full" />
        )}
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="absolute inset-0 grid place-items-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-paper bg-ink/70 font-mono text-paper">{playing ? "❚❚" : "▶"}</span>
        </button>
      </div>

      {/* Controles */}
      <div className="mt-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
        <button type="button" onClick={() => setPlaying((p) => !p)} className="w-6 text-left" aria-label={playing ? "Pausar" : "Reproducir"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Progreso del timelapse de ${title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seek(progress + 0.05);
            if (e.key === "ArrowLeft") seek(progress - 0.05);
          }}
          onPointerDown={(e) => {
            scrubbing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onTrack(e);
          }}
          onPointerMove={(e) => scrubbing.current && onTrack(e)}
          onPointerUp={() => (scrubbing.current = false)}
          className="relative h-5 flex-1 cursor-ew-resize"
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-ink/30" />
          <div className="ink-track absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-ink" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${progress * 100}%` }} />
        </div>
        <span className="tabular-nums">
          {fmt(progress * duration)} / {fmt(duration)}
        </span>
        <div className="flex gap-1">
          {RATES.map((r) => (
            <button key={r} type="button" onClick={() => setRate(r)} className={`px-1.5 ${rate === r ? "bg-ink text-paper" : ""}`}>
              {r}×
            </button>
          ))}
        </div>
      </div>
      <figcaption className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
        {media.label ?? "Proceso"}
        {media.type === "plate" && ` · ${phase}`}
      </figcaption>
    </figure>
  );
}
