import { BlendFunction, Effect } from "postprocessing";
import { Color, Uniform, type WebGLRenderer, type WebGLRenderTarget } from "three";
import { hash, luma } from "./noise.glsl";

/**
 * SHADER B — «Imprenta» (post-procesado de pantalla completa)
 *
 * Convierte TODO el frame (obras, niebla, arquitectura) en una impresión:
 *  - Trama de semitonos AM rotada (radio ∝ sqrt(1 - luminancia) → área proporcional
 *    al tono, como una trama real), antialiasing analítico con fwidth.
 *  - Mezcla con el tono continuo (uMix) para no perder detalle fino de las obras.
 *  - Ganancia de punto (dot gain): la tinta se expande en sombras, como en papel poroso.
 *  - Grano animado + viñeta + registro desalineado sutil (misregistration).
 * Se ejecuta en un único pass fusionado por EffectComposer (postprocessing).
 */

const fragmentShader = /* glsl */ `
uniform float uCellSize;
uniform float uAngle;
uniform float uMix;
uniform float uGrain;
uniform float uDotGain;
uniform float uVignette;
uniform float uTime;
uniform float uColor;
uniform vec3  uInk;
uniform vec3  uPaper;

${hash}
${luma}

float halftone(vec2 fragCoord, float tone, float angle, float cell) {
  float s = sin(angle), c = cos(angle);
  vec2 st = mat2(c, -s, s, c) * fragCoord / cell;
  vec2 g = fract(st) - 0.5;
  float r = sqrt(clamp(1.0 - tone, 0.0, 1.0)) * 0.72;
  r += uDotGain * (1.0 - tone) * 0.15;                  // ganancia de punto en sombras
  float d = length(g);
  float aa = fwidth(d) * 0.75;
  return smoothstep(r - aa, r + aa, d);                 // 0 = punto de tinta, 1 = papel
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 fragCoord = uv * resolution;

  // Registro levemente desalineado: la trama muestrea un tono vecino
  vec2 mis = vec2(sin(uTime * 0.7), cos(uTime * 0.5)) * texelSize * 0.6;
  float tone = luma(inputColor.rgb);
  float toneMis = luma(texture2D(inputBuffer, uv + mis).rgb);

  float dots = halftone(fragCoord, mix(tone, toneMis, 0.5), uAngle, uCellSize);
  float t = mix(tone, dots, uMix);

  // Grano analógico (animado a ~24 fps para que se sienta "filmado")
  float frame = floor(uTime * 24.0);
  t += (hash12(fragCoord + frame * 17.0) - 0.5) * uGrain;

  // Viñeta de entintado irregular
  vec2 p = uv - 0.5;
  t *= 1.0 - uVignette * smoothstep(0.35, 0.85, length(p * vec2(aspect, 1.0)) );

  vec3 mono = mix(uInk, uPaper, clamp(t, 0.0, 1.0));
  // Color: misma trama y grano, pero reescalando el RGB original → conserva el tono
  vec3 colored = clamp(inputColor.rgb * (clamp(t, 0.0, 1.2) / max(tone, 0.04)), 0.0, 1.0);
  outputColor = vec4(mix(mono, colored, uColor), inputColor.a);
}
`;

export interface HalftoneOptions {
  cellSize?: number;
  angle?: number;
  mix?: number;
  grain?: number;
  dotGain?: number;
  vignette?: number;
  ink?: string;
  paper?: string;
  /** Conserva el color de la escena (la trama solo modula la luz). */
  color?: boolean;
}

export class HalftoneEffect extends Effect {
  constructor({
    cellSize = 5,
    angle = Math.PI / 4,
    mix = 0.55,
    grain = 0.12,
    dotGain = 1,
    vignette = 0.6,
    ink = "#0a0a0a",
    paper = "#ecebe6",
    color = false,
  }: HalftoneOptions = {}) {
    super("HalftoneEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["uCellSize", new Uniform(cellSize)],
        ["uAngle", new Uniform(angle)],
        ["uMix", new Uniform(mix)],
        ["uGrain", new Uniform(grain)],
        ["uDotGain", new Uniform(dotGain)],
        ["uVignette", new Uniform(vignette)],
        ["uTime", new Uniform(0)],
        ["uColor", new Uniform(color ? 1 : 0)],
        ["uInk", new Uniform(new Color(ink))],
        ["uPaper", new Uniform(new Color(paper))],
      ]),
    });
  }

  override update(_renderer: WebGLRenderer, _input: WebGLRenderTarget, deltaTime?: number) {
    (this.uniforms.get("uTime") as Uniform<number>).value += deltaTime ?? 0.016;
  }
}
