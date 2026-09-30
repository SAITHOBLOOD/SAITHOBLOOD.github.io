/**
 * Lámina surrealista procedural (modo demo). Un mismo dibujo alimenta:
 *  - texturas WebGL (CanvasTexture),
 *  - miniaturas DOM (<canvas>),
 *  - timelapses simulados: `progress` 0→1 dibuja primero el boceto a lápiz y luego entinta paso a paso.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Step = (ctx: CanvasRenderingContext2D, ink: boolean) => void;

function buildSteps(seed: number, w: number, h: number): Step[] {
  const r = rng(seed);
  const s = Math.max(w, h) / 512;
  const steps: Step[] = [];
  const variant = seed % 3;

  const horizon = h * (0.55 + r() * 0.2);
  steps.push((c, ink) => {
    if (ink) {
      c.fillRect(0, horizon, w, h - horizon);
    } else {
      c.beginPath();
      c.moveTo(0, horizon);
      c.lineTo(w, horizon);
      c.stroke();
    }
  });

  const cx = w * (0.3 + r() * 0.4);
  const cy = horizon - h * (0.15 + r() * 0.2);
  const R = Math.min(w, h) * (0.14 + r() * 0.12);

  // Anillos concéntricos (sol / ojo / pozo)
  for (let i = 0; i < 16; i++) {
    const rad = R * (1 + i * 0.09);
    const lw = (1 + (i % 3)) * s;
    steps.push((c) => {
      c.lineWidth = lw;
      c.beginPath();
      c.arc(cx, cy, rad, 0, Math.PI * 2);
      c.stroke();
    });
  }

  if (variant === 0) {
    // Ojo
    steps.push((c, ink) => {
      c.save();
      c.fillStyle = ink ? "#f5f5f5" : "transparent";
      c.beginPath();
      c.ellipse(cx, cy, R, R * 0.55, 0, 0, Math.PI * 2);
      if (ink) c.fill();
      c.restore();
      c.stroke();
    });
    steps.push((c, ink) => {
      c.beginPath();
      c.arc(cx, cy, R * 0.4, 0, Math.PI * 2);
      if (ink) c.fill();
      else c.stroke();
    });
  } else {
    // Luna mordida
    steps.push((c, ink) => {
      c.save();
      c.fillStyle = ink ? "#f5f5f5" : "transparent";
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      if (ink) c.fill();
      c.restore();
      c.stroke();
      if (ink) {
        c.beginPath();
        c.arc(cx + R * 0.45, cy - R * 0.2, R * 0.75, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  // Escalera que no lleva a ninguna parte
  const sx = w * (0.15 + r() * 0.7);
  const rungs = 7 + Math.floor(r() * 6);
  const half = 18 * s;
  steps.push((c) => {
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(sx - half, horizon + 10 * s);
    c.lineTo(sx - half, horizon - rungs * h * 0.04);
    c.moveTo(sx + half, horizon + 10 * s);
    c.lineTo(sx + half, horizon - rungs * h * 0.04);
    c.stroke();
  });
  for (let i = 0; i < rungs; i++) {
    const y = horizon - i * h * 0.04;
    steps.push((c) => {
      c.lineWidth = 3 * s;
      c.beginPath();
      c.moveTo(sx - half, y);
      c.lineTo(sx + half, y);
      c.stroke();
    });
  }

  // Puerta en el horizonte (variante 2)
  if (variant === 2) {
    const dx = w * (0.1 + r() * 0.8);
    const dw = w * 0.12;
    const dh = h * 0.22;
    steps.push((c, ink) => {
      c.lineWidth = 2 * s;
      c.strokeRect(dx, horizon - dh, dw, dh);
      if (ink) c.fillRect(dx + dw * 0.15, horizon - dh * 0.85, dw * 0.7, dh * 0.85);
    });
  }

  // Manchas de tinta
  for (let i = 0; i < 36; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = r() * r() * 14 * s;
    const white = r() > 0.5;
    steps.push((c, ink) => {
      if (!ink) return;
      c.save();
      c.fillStyle = white ? "#fff" : "#000";
      c.beginPath();
      c.arc(x, y, rad, 0, Math.PI * 2);
      c.fill();
      c.restore();
    });
  }
  return steps;
}

const stepCache = new Map<string, Step[]>();

export function drawPlate(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number, progress = 1) {
  const key = `${seed}:${w}:${h}`;
  let steps = stepCache.get(key);
  if (!steps) {
    steps = buildSteps(seed, w, h);
    stepCache.set(key, steps);
  }

  const sketchP = Math.min(1, progress / 0.3);
  const inkP = Math.max(0, (progress - 0.3) / 0.7);

  // Papel: degradado solo cuando ya hay aguada (≥ 60 %)
  ctx.fillStyle = "#efeee9";
  ctx.fillRect(0, 0, w, h);
  if (progress >= 0.6) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(242,242,242,1)");
    g.addColorStop(1, `rgba(150,150,150,${Math.min(1, (progress - 0.6) / 0.3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Boceto a lápiz
  if (progress < 1) {
    ctx.save();
    ctx.strokeStyle = `rgba(90,90,90,${0.55 * sketchP})`;
    ctx.fillStyle = "transparent";
    const n = Math.floor(steps.length * sketchP);
    for (let i = 0; i < n; i++) {
      ctx.lineWidth = 1;
      steps[i](ctx, false);
    }
    ctx.restore();
  }

  // Entintado
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#111";
  const m = Math.floor(steps.length * inkP);
  for (let i = 0; i < m; i++) steps[i](ctx, true);
  ctx.restore();
}

/** Tamaño de dibujo para un lado mayor dado, respetando aspecto. */
export function plateSize(width: number, height: number, maxSide: number) {
  const k = maxSide / Math.max(width, height);
  return { w: Math.round(width * k), h: Math.round(height * k) };
}
