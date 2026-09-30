"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollState } from "@/lib/scroll-state";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis con GSAP como ÚNICO reloj (un solo rAF para scroll, tweens y ScrollTrigger).
 * `infinite` solo en el pasillo: el scroll no tiene fin y la profundidad es continua.
 */
export default function SmoothScroll({ children, infinite = false }: { children: React.ReactNode; infinite?: boolean }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    scrollState.offset = 0;
    scrollState.velocity = 0;
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false, infinite, syncTouch: infinite, lerp: 0.09 }}>
      <ScrollBridge />
      {children}
    </ReactLenis>
  );
}

function ScrollBridge() {
  useLenis((lenis) => {
    scrollState.offset = lenis.animatedScroll; // sin envolver en modo infinito
    scrollState.velocity = lenis.velocity;
    ScrollTrigger.update();
  });
  return null;
}
