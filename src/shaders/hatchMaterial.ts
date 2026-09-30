import { shaderMaterial } from "@react-three/drei";
import { Color, Vector3 } from "three";
import { fbm, hash } from "./noise.glsl";

/**
 * SHADER C — «Plumilla» (material para geometría 3D)
 *
 * Traduce la iluminación a rayado cruzado, como los dibujos de Saith:
 *  - Lambert + wrap + rim → valor tonal 0..1.
 *  - 4 capas de trazos en espacio de pantalla (45°, −45°, 0°, 90°); cada capa aparece
 *    bajo un umbral de tono más oscuro → más capas = más sombra (tonal art map simplificado).
 *  - Los trazos tiemblan con fBm (mano, no regla) y su grosor varía con el tono.
 *  - Contorno por fresnel (línea de tinta en la silueta).
 * Trazos en px de pantalla → densidad constante a cualquier distancia, como un dibujo.
 */

const vertexShader = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vPosW;

void main() {
  vec4 local = vec4(position, 1.0);
  vec3 nrm = normal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;       // soporte para InstancedMesh (1 draw call)
    nrm = mat3(instanceMatrix) * nrm;
  #endif
  vec4 world = modelMatrix * local;
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3  uLightDir;
uniform vec3  uInk;
uniform vec3  uPaper;
uniform float uSpacing;   // separación de trazos en px
uniform float uTime;
uniform float uTone;      // oscurece/aclara el objeto completo
uniform float uOutline;

varying vec3 vNormalW;
varying vec3 vViewDir;
varying vec3 vPosW;

${hash}
${fbm}

// Trazo: 1 = tinta. d = coordenada perpendicular al trazo en "celdas".
float stroke(vec2 p, float angle, float width) {
  float s = sin(angle), c = cos(angle);
  float d = dot(p, vec2(c, s));
  float wobble = (fbm(vec2(dot(p, vec2(-s, c)) * 0.02, d * 0.05)) - 0.5) * 0.6; // temblor de mano
  float f = abs(fract(d + wobble) - 0.5);
  float aa = fwidth(d) * 0.8;
  return 1.0 - smoothstep(width - aa, width + aa, f);
}

void main() {
  vec3 n = normalize(vNormalW);
  vec3 l = normalize(uLightDir);
  float diff = dot(n, l) * 0.5 + 0.5;                   // half-lambert: sombras suaves
  float rim = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 3.0);
  float tone = clamp(diff * diff * uTone + rim * 0.25, 0.0, 1.0);

  vec2 p = gl_FragCoord.xy / uSpacing;
  float jitter = (fbm(vPosW.xy * 3.0 + vPosW.z) - 0.5) * 0.12;
  float t = tone + jitter;

  float ink = 0.0;
  ink = max(ink, stroke(p, 0.785, mix(0.02, 0.18, 1.0 - t)) * step(t, 0.78));
  ink = max(ink, stroke(p * 1.03, -0.785, mix(0.02, 0.2, 1.0 - t)) * step(t, 0.55));
  ink = max(ink, stroke(p * 1.1, 0.0, mix(0.03, 0.22, 1.0 - t)) * step(t, 0.35));
  ink = max(ink, stroke(p * 1.2, 1.571, 0.3) * step(t, 0.16));

  // Contorno de silueta
  float edge = smoothstep(0.55, 0.8, 1.0 - abs(dot(n, normalize(vViewDir))));
  ink = max(ink, edge * uOutline);

  // Motas de tinta
  ink = max(ink, step(0.997, hash12(floor(gl_FragCoord.xy / 2.0))) * step(t, 0.6));

  gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.0);
  #include <colorspace_fragment>
}
`;

export const HatchMaterial = shaderMaterial(
  {
    uLightDir: new Vector3(-0.6, 0.8, 0.5),
    uInk: new Color("#0a0a0a"),
    uPaper: new Color("#ecebe6"),
    uSpacing: 5,
    uTime: 0,
    uTone: 1,
    uOutline: 1,
  },
  vertexShader,
  fragmentShader,
);
