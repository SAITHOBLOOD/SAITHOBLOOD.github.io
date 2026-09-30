import { shaderMaterial } from "@react-three/drei";
import { Color, Texture } from "three";
import { fbm, hash, luma } from "./noise.glsl";

/**
 * Ojo de «Dream 11» sobre una esfera real.
 *
 * Se usa UN cuadro fijo del vídeo con el iris centrado (public/hero/eye.webp): el ojo solo
 * se mueve girando la esfera hacia el cursor, sin deformarse.
 * El cuadro es una vista ortográfica de un globo ocular (centrado, radio 0.455).
 * Proyección planar desde +Z local: un punto de la esfera con normal n se ve en
 * uv = 0.5 + n.xy · R — exactamente como en el vídeo. Así la esfera gira hacia el cursor
 * y el iris animado del artista sigue moviéndose "dentro" del ojo.
 * Hemisferio trasero: esclerótica rayada a plumilla (mismo lenguaje que el resto del 3D).
 * Todo pasa a B/N con niveles, grano y un rayado suave en las sombras.
 */
export const VideoEyeMaterial = shaderMaterial(
  {
    uVideo: null as Texture | null,
    uRadius: 0.455,
    uCenter: [0.5, 0.499],
    uLightDir: [-0.6, 0.7, 0.6],
    uTime: 0,
    uColor: 1,
    uInk: new Color("#0a0a0a"),
    uPaper: new Color("#ecebe6"),
  },
  /* glsl */ `
  varying vec3 vLocalN;
  varying vec3 vWorldN;
  varying vec3 vViewDir;
  void main() {
    vLocalN = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldN = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }`,
  /* glsl */ `
  uniform sampler2D uVideo;
  uniform float uRadius;
  uniform vec2 uCenter;
  uniform vec3 uLightDir;
  uniform float uTime;
  uniform float uColor;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  varying vec3 vLocalN;
  varying vec3 vWorldN;
  varying vec3 vViewDir;
  ${hash}
  ${fbm}
  ${luma}

  float hatch(vec2 p, float angle, float width) {
    float s = sin(angle), c = cos(angle);
    float d = dot(p, vec2(c, s));
    float f = abs(fract(d + (fbm(vec2(dot(p, vec2(-s, c)) * 0.02, d * 0.05)) - 0.5) * 0.6) - 0.5);
    float aa = fwidth(d) * 0.8;
    return 1.0 - smoothstep(width - aa, width + aa, f);
  }

  void main() {
    vec3 n = normalize(vWorldN);
    float diff = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
    float tone;
    vec3 col;

    if (vLocalN.z > 0.0) {
      vec2 uv = uCenter + vLocalN.xy * uRadius;
      col = texture2D(uVideo, uv).rgb;
      tone = smoothstep(0.04, 0.85, luma(col));       // niveles: iris marrón → tinta, esclerótica → papel
      tone *= mix(0.72, 1.0, diff);                   // volumen 3D sutil sobre el dibujo
    } else {
      col = vec3(0.93, 0.92, 0.9);                    // parte trasera: esclerótica
      tone = 0.92 * mix(0.55, 1.0, diff);
    }
    col *= mix(0.62, 1.05, diff);

    // Rayado en las sombras (continúa el lenguaje de plumilla)
    vec2 p = gl_FragCoord.xy / 5.0;
    float ink = 0.0;
    ink = max(ink, hatch(p, 0.785, 0.12) * step(diff, 0.5) * 0.8);
    ink = max(ink, hatch(p * 1.05, -0.785, 0.14) * step(diff, 0.3));
    // Contorno de silueta
    float edge = smoothstep(0.6, 0.85, 1.0 - abs(dot(n, normalize(vViewDir))));
    ink = max(ink, edge);

    float grain = (hash12(gl_FragCoord.xy + floor(uTime * 12.0) * 13.0) - 0.5) * 0.06; // grano a 12 fps
    float t = tone * (1.0 - ink) + grain;
    vec3 mono = mix(uInk, uPaper, clamp(t, 0.0, 1.0));
    vec3 color = clamp(mix(col, uInk, ink * 0.85) + grain, 0.0, 1.0); // color del artista + tinta encima
    gl_FragColor = vec4(mix(mono, color, uColor), 1.0);
    #include <colorspace_fragment>
  }`,
);

/** Fondo animado: vídeo a pantalla completa en B/N, oscurecido y con viñeta. */
export const VideoBackdropMaterial = shaderMaterial(
  {
    uVideo: null as Texture | null,
    uCover: [1, 1],
    uOffset: [0, 0],
    uDim: 0.75,
    uTime: 0,
    uColor: 1,
    uInk: new Color("#0a0a0a"),
    uPaper: new Color("#ecebe6"),
  },
  /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,
  /* glsl */ `
  uniform sampler2D uVideo;
  uniform vec2 uCover;
  uniform vec2 uOffset;
  uniform float uDim;
  uniform float uTime;
  uniform float uColor;
  uniform vec3 uInk;
  uniform vec3 uPaper;
  varying vec2 vUv;
  ${hash}
  ${luma}
  void main() {
    vec2 uv = (vUv - 0.5) * uCover + 0.5 + uOffset;
    vec3 src = texture2D(uVideo, uv).rgb;
    float vig = 1.0 - 0.55 * smoothstep(0.35, 0.95, length((vUv - 0.5) * vec2(1.6, 1.0)));
    float grain = (hash12(gl_FragCoord.xy + floor(uTime * 12.0) * 7.0) - 0.5) * 0.05;
    float t = smoothstep(0.03, 0.8, luma(src)) * uDim * vig + grain;
    vec3 mono = mix(uInk, uPaper, clamp(t, 0.0, 1.0));
    vec3 color = clamp(src * uDim * vig + grain, 0.0, 1.0);
    gl_FragColor = vec4(mix(mono, color, uColor), 1.0);
    #include <colorspace_fragment>
  }`,
);
