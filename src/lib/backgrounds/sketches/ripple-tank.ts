import type { Env, Sketch } from "../runner";

const TAU = Math.PI * 2;
const MAX_DROPPED = 4;

function graphPaper({ ctx, width: w, height: h, lineWidth }: Env) {
  ctx.save();
  ctx.lineWidth = lineWidth * 0.6;
  for (const [step, alpha] of [
    [24, 0.3],
    [120, 0.7],
  ]) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0.5; y < h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

interface Source {
  fx: number;
  fy: number;
  phx: number;
  phy: number;
  /** Dropped by a click: fixed in place, its first crest spreading out from time t0. */
  dropped?: { x: number; y: number; t0: number };
}

export const rippleTank: Sketch = {
  id: "ripple-tank",
  label: "Ripple tank",
  description:
    "Graph paper with circular waves from drifting point sources, their interference drawn as a halftone.",
  hint: "Click to drop a stone: a new source starts rippling out from that point.",
  params: [
    { key: "sources", label: "Sources", min: 1, max: 5, step: 1, value: 2 },
    { key: "wavelength", label: "Wavelength (px)", min: 20, max: 200, step: 5, value: 70 },
    { key: "cell", label: "Dot spacing (px)", min: 6, max: 28, step: 1, value: 12 },
    { key: "grid", label: "Graph paper", min: 0, max: 1, step: 1, value: 1 },
    { key: "drift", label: "Source drift", min: 0, max: 1, step: 0.05, value: 0.25 },
  ],
  create(env) {
    const { cell, grid, drift } = env.params;
    const k = TAU / env.params.wavelength;
    const omega = TAU * 0.6;
    const c = omega / k; // wave speed, px/s
    const sources: Source[] = Array.from({ length: Math.round(env.params.sources) }, () => ({
      fx: 0.3 + Math.random() * 0.7,
      fy: 0.3 + Math.random() * 0.7,
      phx: Math.random() * TAU,
      phy: Math.random() * TAU,
    }));
    let sx = new Float32Array(0);
    let sy = new Float32Array(0);
    let start = new Float32Array(0); // −1 for a drifting source that has always been on
    let now = 0;

    const poke = (x: number, y: number) => {
      const dropped = sources.filter((s) => s.dropped);
      if (dropped.length >= MAX_DROPPED) sources.splice(sources.indexOf(dropped[0]), 1);
      sources.push({ fx: 0, fy: 0, phx: 0, phy: 0, dropped: { x, y, t0: now } });
    };

    const step = (_dt: number, t: number) => {
      now = t;
      const { ctx, width: w, height: h } = env;
      env.clear();
      if (grid) graphPaper(env);

      const n = sources.length;
      if (sx.length !== n) {
        sx = new Float32Array(n);
        sy = new Float32Array(n);
        start = new Float32Array(n);
      }
      sources.forEach((s, i) => {
        sx[i] = s.dropped ? s.dropped.x : w * (0.5 + 0.38 * Math.sin(s.fx * drift * t + s.phx));
        sy[i] = s.dropped ? s.dropped.y : h * (0.5 + 0.38 * Math.sin(s.fy * drift * t + s.phy));
        start[i] = s.dropped ? s.dropped.t0 : -1;
      });

      // Dot radius follows the summed wave height at each lattice point.
      const rMax = cell * 0.45;
      ctx.beginPath();
      for (let y = cell / 2; y < h; y += cell) {
        for (let x = cell / 2; x < w; x += cell) {
          let sum = 0;
          for (let i = 0; i < n; i++) {
            const r = Math.hypot(x - sx[i], y - sy[i]);
            if (start[i] < 0) {
              sum += Math.cos(k * r - omega * t);
            } else {
              const age = t - start[i];
              if (r < c * age) sum += Math.cos(k * r - omega * age);
            }
          }
          const a = (sum / n + 1) / 2;
          const r = rMax * a * a;
          if (r < 0.35) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
      }
      ctx.fill();

      ctx.fillStyle = env.accent;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(sx[i] + 3, sy[i]);
        ctx.arc(sx[i], sy[i], 3, 0, TAU);
      }
      ctx.fill();
    };

    return { step, poke };
  },
};
