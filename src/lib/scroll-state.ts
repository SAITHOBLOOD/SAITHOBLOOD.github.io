/**
 * Puente DOM → WebGL sin re-renders de React.
 * Lenis escribe aquí en cada frame; useFrame lo lee. Mutar un objeto plano
 * es más barato que pasar por estado/contexto 60 veces por segundo.
 */
export const scrollState = {
  /** Scroll acumulado sin envolver (Lenis en modo infinito), en px. */
  offset: 0,
  /** Velocidad instantánea en px/frame; alimenta distorsión y estiramiento. */
  velocity: 0,
};
