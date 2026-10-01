import { shaderMaterial } from "@react-three/drei";
import { Color, Texture, Vector2 } from "three";
import { fbm, hash, luma } from "./noise.glsl";

/**
 * SHADER A — «Tinta Líquida» (material por obra)
 *
 * 1. Cover-fit de la textura al plano (como object-fit: cover).
 * 2. Distorsión líquida: domain warping con fBm, localizada alrededor del cursor
 *    y modulada por uHover (0→1, amortiguado en CPU).
 * 3. En reposo la obra se ve fiel (solo niveles). Bajo el cursor: binarización de
 *    grabado con bordes irregulares que "sangran" desde el puntero.
 * 4. Grano de papel + revelado inicial por disolución (uReveal).
 * 5. uScrollVelocity estira la imagen verticalmente (inercia visual del scroll).
 */

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uHover;
uniform vec2  uMouse;
uniform float uWaves;
uniform float uScrollVelocity;

varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;

  // Onda concéntrica desde el cursor (solo tiers high/mid)
  float d = distance(uv, uMouse);
  float ripple = sin(d * 22.0 - uTime * 4.0) * smoothstep(0.55, 0.0, d);
  p.z += ripple * 0.05 * uHover * uWaves;

  // Curvatura tipo papel según velocidad de scroll
  p.z += sin(uv.y * 3.14159) * uScrollVelocity * 0.02;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform vec2  uPlaneSize;   // en unidades de mundo (ancho, alto)
uniform vec2  uImageSize;   // en píxeles
uniform vec2  uMouse;       // uv del cursor sobre el plano
uniform float uHover;
uniform float uTime;
uniform float uReveal;
uniform float uThreshold;
uniform float uBleed;
uniform float uScrollVelocity;
uniform vec3  uInk;
uniform vec3  uPaper;
uniform float uSpot;        // 1 = pieza con color
uniform vec3  uAccent;      // tinta dominante (segunda tinta)
uniform float uColorReveal; // 0 = tinta · 1 = color completo (botón «Color» de la ficha)

varying vec2 vUv;

${hash}
${fbm}
${luma}

vec2 coverUv(vec2 uv, vec2 plane, vec2 image) {
  float rp = plane.x / plane.y;
  float ri = image.x / image.y;
  vec2 scale = rp < ri ? vec2(rp / ri, 1.0) : vec2(1.0, ri / rp);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = vUv;

  // Estiramiento vertical por velocidad de scroll
  uv.y = (uv.y - 0.5) * (1.0 - clamp(abs(uScrollVelocity) * 0.004, 0.0, 0.2)) + 0.5;

  // --- Distorsión líquida (domain warping): solo cerca del cursor ---
  float d = distance(vUv, uMouse);
  float falloff = smoothstep(0.5, 0.0, d) * uHover;
  if (falloff > 0.002) {
    float t = uTime * 0.25;
    vec2 q = vec2(fbm(uv * 3.0 + t), fbm(uv * 3.0 - t + 5.2));
    vec2 warp = (vec2(fbm(uv * 3.0 + q * 2.0 + t), fbm(uv * 3.0 + q * 2.0 + 1.7)) - 0.5);
    uv += warp * 0.12 * falloff;
  }

  vec2 tuv = coverUv(uv, uPlaneSize, uImageSize);
  vec3 src = texture2D(uTexture, tuv).rgb;
  float tone = luma(src);

  // --- En reposo: la obra fiel. Solo niveles (papel → blanco, tinta → negro).
  float ink = smoothstep(0.06, 0.9, tone);

  // --- Bajo el cursor (solo piezas en B/N): binarización con bordes de tinta irregulares
  if (falloff > 0.002 && uSpot < 0.5) {
    float edgeNoise = fbm(vUv * 60.0) - 0.5;              // fibra del papel
    float bleed = falloff * (0.25 + 0.1 * sin(uTime * 2.0));
    float th = uThreshold + edgeNoise * 0.18 + bleed;     // la tinta avanza cerca del cursor
    float stamped = smoothstep(th - 0.03, th + 0.03, tone);
    ink = mix(ink, stamped, clamp(falloff * uBleed * 1.6, 0.0, 1.0));
  }

  // --- Grano analógico
  float grain = hash12(vUv * 1024.0 + fract(uTime) * 91.0) - 0.5;
  ink = clamp(ink + grain * 0.05, 0.0, 1.0);

  vec3 color = mix(uInk, uPaper, ink);

  // --- COLOR como «segunda tinta» (serigrafía/riso) ---
  if (uSpot > 0.5) {
    // 1) Plancha de color: tinta plana del acento donde la obra está saturada,
    //    con registro desalineado (muestreo desplazado) e impresa en multiplicar.
    vec3 off = texture2D(uTexture, tuv + vec2(0.003, -0.0022)).rgb;
    float sat = max(max(off.r, off.g), off.b) - min(min(off.r, off.g), off.b);
    float plate = smoothstep(0.18, 0.42, sat) * (0.82 + grain * 0.6);
    color = mix(color, color * uAccent, clamp(plate, 0.0, 1.0));

    // 2) Acuarela: el color completo florece desde el cursor (o toda la obra con el botón)
    float r = uHover * 0.45 + uColorReveal * 1.6;
    if (r > 0.001) {
      float n = fbm(vUv * 4.0 + uTime * 0.05) - 0.5;
      float dist = mix(d, distance(vUv, vec2(0.5)), uColorReveal);
      float bloom = 1.0 - smoothstep(r - 0.14, r, dist + n * 0.3);
      vec3 full = src * (0.96 + grain * 0.08);
      color = mix(color, full, bloom);
      // borde de pigmento húmedo, más oscuro, como en la acuarela
      color *= 1.0 - 0.18 * bloom * (1.0 - smoothstep(0.0, 0.05, abs(dist + n * 0.3 - (r - 0.07))));
    }
  }

  // --- Revelado por disolución de tinta ---
  // uReveal 0 → papel limpio; 1 → obra completa. El frente avanza por un campo fBm
  // y deja un filo de tinta húmeda mientras se mueve.
  if (uReveal < 0.999) {
    float n = fbm(vUv * 8.0);
    float front = uReveal * 1.2 - 0.1;
    float reveal = 1.0 - smoothstep(front - 0.05, front, n);
    float rim = smoothstep(0.0, 0.025, abs(n - front));
    color = mix(uPaper, color, reveal);
    color = mix(uInk, color, rim);
  }

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

export const InkPlaneMaterial = shaderMaterial(
  {
    uTexture: null as Texture | null,
    uPlaneSize: new Vector2(1, 1),
    uImageSize: new Vector2(1, 1),
    uMouse: new Vector2(0.5, 0.5),
    uHover: 0,
    uTime: 0,
    uReveal: 0,
    uThreshold: 0.5,
    uBleed: 0.8,
    uWaves: 1,
    uScrollVelocity: 0,
    uInk: new Color("#0a0a0a"),
    uPaper: new Color("#ecebe6"),
    uSpot: 0,
    uAccent: new Color("#ffffff"),
    uColorReveal: 0,
  },
  vertexShader,
  fragmentShader,
);

export type InkPlaneMaterialImpl = InstanceType<typeof InkPlaneMaterial> & {
  uniforms: Record<string, { value: unknown }>;
};
