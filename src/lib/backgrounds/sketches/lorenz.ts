import type { Sketch } from "../runner";

const SIGMA = 10;
const BETA = 8 / 3;
const TIME = 0.4; // Lorenz time units per second
const H = 0.004; // max integration step

export const lorenz: Sketch = {
  id: "lorenz",
  label: "Lorenz attractor",
  description:
    "ẋ = σ(y − x), ẏ = x(ρ − z) − y, ż = xy − βz, slowly rotating. The trajectories start almost together and drift apart.",
  hint: "Click to start a bundle of new trajectories there.",
  params: [
    { key: "count", label: "Trajectories", min: 1, max: 300, step: 1, value: 60 },
    { key: "trail", label: "Trail fade", min: 0.002, max: 0.1, step: 0.002, value: 0.012 },
    { key: "rho", label: "ρ", min: 10, max: 50, step: 0.5, value: 28 },
    { key: "spin", label: "Rotation", min: 0, max: 0.5, step: 0.01, value: 0.06 },
    { key: "scale", label: "Scale", min: 0.4, max: 2, step: 0.05, value: 1 },
  ],
  create(env) {
    const { trail, rho, spin, scale } = env.params;
    const n = Math.round(env.params.count);
    const X = new Float64Array(n);
    const Y = new Float64Array(n);
    const Z = new Float64Array(n);
    const px = new Float64Array(n);
    const py = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      X[i] = 1 + (Math.random() - 0.5) * 0.01;
      Y[i] = 1 + (Math.random() - 0.5) * 0.01;
      Z[i] = 20 + (Math.random() - 0.5) * 0.01;
    }

    const zoom = () => (Math.min(env.width, env.height) / 55) * scale;
    let now = 0;

    // Rotate about the z axis, then look along y.
    const project = (i: number, t: number) => {
      const s = zoom();
      const a = spin * t;
      px[i] = env.width / 2 + (X[i] * Math.cos(a) - Y[i] * Math.sin(a)) * s;
      py[i] = env.height / 2 - (Z[i] - (rho - 1)) * s;
    };
    for (let i = 0; i < n; i++) project(i, 0);

    const f = (x: number, y: number, z: number, out: number[]) => {
      out[0] = SIGMA * (y - x);
      out[1] = x * (rho - z) - y;
      out[2] = x * y - BETA * z;
    };
    const k1 = [0, 0, 0];
    const k2 = [0, 0, 0];
    const k3 = [0, 0, 0];
    const k4 = [0, 0, 0];

    // Un-project the click onto the plane through the z axis facing the viewer, and restart
    // the oldest trajectories there, a hair apart.
    let next = 0;
    const poke = (sx: number, sy: number) => {
      const s = zoom();
      const a = spin * now;
      const u = (sx - env.width / 2) / s;
      const z = (env.height / 2 - sy) / s + (rho - 1);
      for (let k = 0; k < Math.min(10, n); k++) {
        const i = next++ % n;
        X[i] = u * Math.cos(a) + (Math.random() - 0.5) * 0.01;
        Y[i] = -u * Math.sin(a) + (Math.random() - 0.5) * 0.01;
        Z[i] = z + (Math.random() - 0.5) * 0.01;
        project(i, now);
      }
    };

    const step = (dt: number, t: number) => {
      now = t;
      if (dt === 0) return;
      env.fade(trail, dt);
      const { ctx } = env;
      const steps = Math.max(1, Math.ceil((dt * TIME) / H));
      const h = (dt * TIME) / steps;

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        let x = X[i];
        let y = Y[i];
        let z = Z[i];
        // Classic RK4.
        for (let s = 0; s < steps; s++) {
          f(x, y, z, k1);
          f(x + (h / 2) * k1[0], y + (h / 2) * k1[1], z + (h / 2) * k1[2], k2);
          f(x + (h / 2) * k2[0], y + (h / 2) * k2[1], z + (h / 2) * k2[2], k3);
          f(x + h * k3[0], y + h * k3[1], z + h * k3[2], k4);
          x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
          y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
          z += (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        }
        X[i] = x;
        Y[i] = y;
        Z[i] = z;
        ctx.moveTo(px[i], py[i]);
        project(i, t);
        ctx.lineTo(px[i], py[i]);
      }
      ctx.stroke();
    };

    return { step, poke };
  },
};
