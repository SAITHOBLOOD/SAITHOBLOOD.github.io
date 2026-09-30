"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { done, pending, useLoading } from "@/lib/loading";

const MIN_MS = 1600; // que el hámster alcance a dar unas vueltas
const MAX_MS = 12000; // red lenta / algo colgado: entrar igual
const FPS = 12; // "animado en dos", como las animaciones del artista

/**
 * Pantalla de carga inicial: un hámster a plumilla corriendo en su rueda.
 * Espera a fuentes, página, WebGL (primer frame) y vídeos/texturas de la portada;
 * al terminar se abre como un párpado. Solo aparece en la carga completa del sitio,
 * no en la navegación interna.
 */
export default function Loader({ name }: { name: string }) {
  const { total, done: ready } = useLoading();
  const [gone, setGone] = useState(false);
  const [minPassed, setMinPassed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const shown = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  // Tareas propias: fuentes y carga de la página
  useEffect(() => {
    pending("fonts");
    pending("page");
    document.fonts.ready.then(() => done("fonts"));
    if (document.readyState === "complete") done("page");
    else window.addEventListener("load", () => done("page"), { once: true });

    document.documentElement.style.overflow = "hidden";
    const a = setTimeout(() => setMinPassed(true), MIN_MS);
    const b = setTimeout(() => setTimedOut(true), MAX_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const progress = total ? ready / total : 0;
  // El % mostrado nunca retrocede aunque aparezcan tareas nuevas
  shown.current = Math.max(shown.current, progress);
  const allDone = (total > 0 && ready === total) || timedOut;

  useEffect(() => {
    if (!allDone || !minPassed || gone) return;
    if (new URLSearchParams(location.search).get("loader") === "hold") return; // QA: ?loader=hold
    // pequeño margen para que las tareas que se registran tarde (3D) alcancen a anotarse
    const t = setTimeout(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.style.overflow = "";
          setGone(true);
        },
      });
      tl.to(content.current, { opacity: 0, scale: 0.9, duration: 0.35, ease: "power2.in" })
        .to(top.current, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, "open")
        .to(bottom.current, { yPercent: 100, duration: 0.9, ease: "expo.inOut" }, "open");
    }, 250);
    return () => clearTimeout(t);
  }, [allDone, minPassed, gone]);

  if (gone) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100]" role="status" aria-live="polite" aria-label="Cargando">
      {/* Párpados: se abren al terminar */}
      <div ref={top} className="absolute inset-x-0 top-0 h-[62%] bg-ink" style={{ borderBottomLeftRadius: "50% 18%", borderBottomRightRadius: "50% 18%" }} />
      <div ref={bottom} className="absolute inset-x-0 bottom-0 h-[62%] bg-ink" style={{ borderTopLeftRadius: "50% 18%", borderTopRightRadius: "50% 18%" }} />

      <div ref={content} className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-paper">
        <Hamster />
        <div className="w-56 text-center font-mono text-[10px] uppercase tracking-[0.3em]">
          <div className="relative mb-3 h-px w-full bg-paper/20">
            <div className="absolute inset-y-0 left-0 bg-paper transition-[width] duration-300" style={{ width: `${Math.round(shown.current * 100)}%` }} />
          </div>
          <p>entintando · {Math.round(shown.current * 100)}%</p>
          <p className="mt-2 opacity-50">{name}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/** 4 poses del ciclo de carrera: [pata delantera A, B, trasera A, B] como segmentos. */
const LEGS: [number, number, number, number][][] = [
  [[122, 146, 130, 156], [116, 147, 112, 157], [84, 148, 74, 155], [91, 149, 98, 157]],
  [[122, 146, 126, 158], [116, 147, 116, 158], [84, 148, 80, 158], [91, 149, 93, 158]],
  [[122, 146, 114, 157], [116, 147, 124, 156], [84, 148, 94, 157], [91, 149, 82, 155]],
  [[122, 146, 118, 158], [116, 147, 120, 158], [84, 148, 88, 158], [91, 149, 86, 158]],
];

function Hamster() {
  const [frame, setFrame] = useState(0);
  const turb = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      setFrame((f) => f + 1);
      // "boiling lines": el trazo tiembla como en animación dibujada cuadro a cuadro
      turb.current?.setAttribute("seed", String(Math.floor(Math.random() * 100)));
    }, 1000 / FPS);
    return () => clearInterval(id);
  }, []);

  const pose = LEGS[frame % LEGS.length];
  const bob = frame % 2 === 0 ? 0 : -1.5;
  const spin = (frame * 11.25) % 360; // la rueda gira en sentido horario (el hámster empuja hacia atrás)

  return (
    <svg viewBox="0 0 200 200" className="h-56 w-56 md:h-64 md:w-64" aria-hidden>
      <defs>
        <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
        <clipPath id="ham-body">
          <path d="M72 138 C70 120 90 108 110 112 C122 106 142 114 142 128 C143 136 134 142 124 146 C110 152 86 152 76 146 C72 144 71 141 72 138 Z" />
        </clipPath>
        <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>

      <g filter="url(#boil)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* Soporte */}
        <path d="M100 95 L62 188 M100 95 L138 188 M48 189 L152 189" strokeWidth="2.5" />

        {/* Rueda */}
        <circle cx="100" cy="95" r="70" strokeWidth="3" />
        <circle cx="100" cy="95" r="64" strokeWidth="1" />
        <g transform={`rotate(${spin} 100 95)`} strokeWidth="1.2">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <line key={i} x1={100} y1={95} x2={100 + Math.cos(a) * 64} y2={95 + Math.sin(a) * 64} />;
          })}
          {/* marcas en el aro para que se note el giro */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <line key={`t${i}`} x1={100 + Math.cos(a) * 64} y1={95 + Math.sin(a) * 64} x2={100 + Math.cos(a) * 70} y2={95 + Math.sin(a) * 70} />;
          })}
        </g>
        <circle cx="100" cy="95" r="4" fill="currentColor" />

        {/* Líneas de velocidad */}
        <path d={`M44 ${128 + bob} l10 0 M40 ${136 + bob} l14 0 M47 ${144 + bob} l8 0`} strokeWidth="1.2" opacity="0.7" />

        {/* Hámster */}
        <g transform={`translate(100 ${153 + bob}) scale(1.18) translate(-107 -158)`}>
          {/* relleno de tinta: tapa rayos y soporte que quedan detrás */}
          <path d="M72 138 C70 120 90 108 110 112 C122 106 142 114 142 128 C143 136 134 142 124 146 C110 152 86 152 76 146 C72 144 71 141 72 138 Z" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="6" />
          <rect x="60" y="116" width="90" height="44" fill="url(#hatch)" stroke="none" clipPath="url(#ham-body)" opacity="0.45" />
          <path d="M72 138 C70 120 90 108 110 112 C122 106 142 114 142 128 C143 136 134 142 124 146 C110 152 86 152 76 146 C72 144 71 141 72 138 Z" strokeWidth="2.2" />
          {/* oreja */}
          <path d="M116 112 C113 103 123 100 126 109" strokeWidth="2" />
          <path d="M118 110 C117 106 121 104 123 108" strokeWidth="1" />
          {/* pelaje / mejilla */}
          <path d="M126 134 c3 2 7 2 10 0 M98 116 c4 -2 8 -2 12 0 M88 121 c3 -2 6 -2 9 -1" strokeWidth="1" />
          {/* ojo, nariz, bigotes */}
          <circle cx="131" cy="122" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="130.4" cy="121.3" r="0.7" fill="#0a0a0a" stroke="none" />
          <circle cx="142" cy="127" r="1.4" fill="currentColor" stroke="none" />
          <path d="M140 129 l10 -2 M140 130 l10 2 M139 131 l8 4" strokeWidth="0.8" />
          {/* cola */}
          <path d="M72 138 q-6 -3 -8 1" strokeWidth="1.8" />
          {/* patas */}
          {pose.map(([x1, y1, x2, y2], i) => (
            <path key={i} d={`M${x1} ${y1} L${x2} ${y2 - bob}`} strokeWidth={i % 2 ? 1.8 : 2.4} opacity={i % 2 ? 0.7 : 1} />
          ))}
        </g>
      </g>
    </svg>
  );
}
