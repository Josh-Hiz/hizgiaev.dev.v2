import type { Sketch } from "../runner";

const MAX_PINNED = 6;

// Marching squares. Corner bits: top-left 8, top-right 4, bottom-right 2, bottom-left 1.
// Edges: 0 top, 1 right, 2 bottom, 3 left. Each case lists edge pairs to join.
const CASES: number[][] = Array.from({ length: 16 }, (_, c) => {
  if (c === 5) return [0, 1, 3, 2]; // saddles: isolate each inside corner
  if (c === 10) return [3, 0, 1, 2];
  const tl = !!(c & 8);
  const tr = !!(c & 4);
  const br = !!(c & 2);
  const bl = !!(c & 1);
  const edges: number[] = [];
  if (tl !== tr) edges.push(0);
  if (tr !== br) edges.push(1);
  if (bl !== br) edges.push(2);
  if (tl !== bl) edges.push(3);
  return edges;
});

interface Mass {
  m: number;
  fx: number;
  fy: number;
  phx: number;
  phy: number;
  /** Dropped by a click: stays at this point instead of drifting. */
  pinned?: { x: number; y: number };
}

export const equipotentials: Sketch = {
  id: "equipotentials",
  label: "Equipotentials",
  description:
    "Contour lines of the gravitational potential Φ = −Σ m/r of a few slowly drifting masses.",
  hint: `Click to drop a mass; up to ${MAX_PINNED} stay put.`,
  params: [
    { key: "bodies", label: "Masses", min: 1, max: 6, step: 1, value: 3 },
    { key: "levels", label: "Contour levels", min: 4, max: 30, step: 1, value: 14 },
    { key: "cell", label: "Resolution (px)", min: 4, max: 24, step: 1, value: 10 },
    { key: "drift", label: "Drift", min: 0, max: 1, step: 0.05, value: 0.15 },
  ],
  create(env) {
    const { cell, drift } = env.params;
    const masses: Mass[] = Array.from({ length: Math.round(env.params.bodies) }, () => ({
      m: 0.6 + Math.random() * 0.8,
      fx: 0.3 + Math.random() * 0.7,
      fy: 0.3 + Math.random() * 0.7,
      phx: Math.random() * Math.PI * 2,
      phy: Math.random() * Math.PI * 2,
    }));
    const total = masses.reduce((s, b) => s + b.m, 0);
    // Geometric spacing: for a 1/r potential this gives evenly nested rings.
    const levels = Array.from({ length: Math.round(env.params.levels) }, (_, i) => total * 0.9 * 1.2 ** i);
    const nx = Math.ceil(env.width / cell) + 1;
    const ny = Math.ceil(env.height / cell) + 1;
    const field = new Float32Array(nx * ny);
    let bx = new Float32Array(0);
    let by = new Float32Array(0);

    const poke = (x: number, y: number) => {
      const pinned = masses.filter((b) => b.pinned);
      if (pinned.length >= MAX_PINNED) masses.splice(masses.indexOf(pinned[0]), 1);
      masses.push({ m: 1, fx: 0, fy: 0, phx: 0, phy: 0, pinned: { x, y } });
    };

    const step = (_dt: number, t: number) => {
      const { ctx, width: w, height: h } = env;
      const unit = Math.min(w, h);
      const n = masses.length;
      if (bx.length !== n) {
        bx = new Float32Array(n);
        by = new Float32Array(n);
      }
      masses.forEach((b, i) => {
        bx[i] = b.pinned ? b.pinned.x : w * (0.5 + 0.38 * Math.sin(b.fx * drift * t + b.phx));
        by[i] = b.pinned ? b.pinned.y : h * (0.5 + 0.38 * Math.sin(b.fy * drift * t + b.phy));
      });

      // |Φ| at each grid vertex, distances in units of the shorter screen side, softened near the masses.
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          let phi = 0;
          for (let b = 0; b < n; b++) {
            const dx = (i * cell - bx[b]) / unit;
            const dy = (j * cell - by[b]) / unit;
            phi += masses[b].m / Math.sqrt(dx * dx + dy * dy + 1e-3);
          }
          field[j * nx + i] = phi;
        }
      }

      env.clear();
      ctx.beginPath();
      for (const v of levels) {
        for (let j = 0; j < ny - 1; j++) {
          for (let i = 0; i < nx - 1; i++) {
            const a = field[j * nx + i];
            const b = field[j * nx + i + 1];
            const c = field[(j + 1) * nx + i + 1];
            const d = field[(j + 1) * nx + i];
            const segs = CASES[(a > v ? 8 : 0) | (b > v ? 4 : 0) | (c > v ? 2 : 0) | (d > v ? 1 : 0)];
            if (segs.length === 0) continue;
            const x = i * cell;
            const y = j * cell;
            // Where the contour crosses each edge, by linear interpolation.
            const point = (e: number): [number, number] => {
              if (e === 0) return [x + (cell * (v - a)) / (b - a), y];
              if (e === 1) return [x + cell, y + (cell * (v - b)) / (c - b)];
              if (e === 2) return [x + (cell * (v - d)) / (c - d), y + cell];
              return [x, y + (cell * (v - a)) / (d - a)];
            };
            for (let k = 0; k < segs.length; k += 2) {
              ctx.moveTo(...point(segs[k]));
              ctx.lineTo(...point(segs[k + 1]));
            }
          }
        }
      }
      ctx.stroke();

      ctx.fillStyle = env.accent;
      ctx.beginPath();
      for (let b = 0; b < n; b++) {
        ctx.moveTo(bx[b] + 2.5, by[b]);
        ctx.arc(bx[b], by[b], 2.5, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    return { step, poke };
  },
};
