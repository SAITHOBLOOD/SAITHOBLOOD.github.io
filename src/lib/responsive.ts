/**
 * Adaptación de las escenas 3D a la proporción de pantalla.
 * portrait = 0 en pantallas horizontales (≥ 1:1), 1 en un celular vertical típico (~9:19.5).
 * Las escenas usan este factor para alejar la cámara, cerrar órbitas y centrar obras,
 * en vez de depender de breakpoints de CSS (que el canvas no ve).
 */
export function portraitFactor(width: number, height: number) {
  const aspect = width / Math.max(1, height);
  return Math.min(1, Math.max(0, (1 - aspect) / 0.54));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
