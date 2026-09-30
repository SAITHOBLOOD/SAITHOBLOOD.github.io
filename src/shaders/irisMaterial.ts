import { shaderMaterial } from "@react-three/drei";
import { Color } from "three";
import { fbm, hash } from "./noise.glsl";

/**
 * Iris a plumilla sobre un casquete esférico: fibras radiales entintadas,
 * anillo límbico, pupila que se dilata (uPupil) y brillo húmedo.
 */
export const IrisMaterial = shaderMaterial(
  { uPupil: 0.38, uTime: 0, uInk: new Color("#0a0a0a"), uPaper: new Color("#ecebe6") },
  /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  /* glsl */ `
  uniform float uPupil;
  uniform float uTime;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  varying vec2 vUv;
  ${hash}
  ${fbm}
  void main() {
    float r = 1.0 - vUv.y;               // 0 en el centro del casquete, 1 en el borde
    float a = vUv.x * 6.28318;
    float ink = 0.0;

    // Fibras radiales con temblor
    float fib = abs(fract(vUv.x * 90.0 + fbm(vec2(a * 2.0, r * 6.0)) * 1.5) - 0.5);
    ink = max(ink, 1.0 - smoothstep(0.08, 0.2 + r * 0.1, fib));
    // Anillos irregulares
    float rings = abs(fract(r * 7.0 + fbm(vec2(a, r) * 4.0) * 0.8) - 0.5);
    ink = max(ink, (1.0 - smoothstep(0.03, 0.08, rings)) * 0.9);
    // Anillo límbico
    ink = max(ink, smoothstep(0.82, 0.92, r));
    // Pupila
    float pupil = 1.0 - smoothstep(uPupil - 0.01, uPupil + 0.01, r + (fbm(vec2(a * 3.0, uTime * 0.2)) - 0.5) * 0.03);
    ink = max(ink, pupil);
    // Brillo húmedo (papel reservado)
    vec2 p = vec2(cos(a), sin(a)) * r;
    float hl = 1.0 - smoothstep(0.08, 0.1, distance(p, vec2(-0.25, 0.3)));
    ink = mix(ink, 0.0, hl);

    gl_FragColor = vec4(mix(uPaper, uInk, clamp(ink, 0.0, 1.0)), 1.0);
    #include <colorspace_fragment>
  }`,
);
