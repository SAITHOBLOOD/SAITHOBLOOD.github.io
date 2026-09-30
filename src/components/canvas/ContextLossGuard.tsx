"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Escucha pérdida/restauración del contexto WebGL (GPU reseteada, pestaña en
 * segundo plano en móvil, demasiados contextos abiertos...).
 * Three.js ya llama a preventDefault() en `webglcontextlost`, lo que permite la
 * restauración; aquí solo informamos a la UI para mostrar estado o degradar.
 */
export default function ContextLossGuard({
  onLost,
  onRestored,
}: {
  onLost: () => void;
  onRestored: () => void;
}) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl, onLost, onRestored]);

  return null;
}
