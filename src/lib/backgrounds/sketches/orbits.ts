import type { Sketch } from "../runner";

const H = 0.002; // integration step, in orbital time units

export const orbits: Sketch = {
  id: "orbits",
  label: "Orbits",
  description:
    "Test bodies around a central mass. A small 1/r³ correction to Newton's force makes the ellipses precess into rosettes.",
  hint: "Click to launch a body from that point.",
  params: [
    { key: "count", label: "Bodies", min: 1, max: 80, step: 1, value: 14 },
    { key: "trail", label: "Trail fade", min: 0.001, max: 0.05, step: 0.001, value: 0.006 },
    { key: "precession", label: "Precession", min: 0, max: 0.05, step: 0.001, value: 0.012 },
    { key: "ecc", label: "Max eccentricity", min: 0, max: 0.9, step: 0.05, value: 0.6 },
  ],
  create(env) {
    const { trail, precession, ecc } = env.params;
    const n = Math.round(env.params.count);
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    const vx = new Float64Array(n);
    const vy = new Float64Array(n);

    // Start each body at aphelion r with eccentricity e: Kepler gives v = √((1 − e) / r) for GM = 1.
    for (let i = 0; i < n; i++) {
      const r = 0.25 + Math.random() * 0.75;
      const e = Math.random() * ecc;
      const phi = Math.random() * Math.PI * 2;
      const v = Math.sqrt((1 - e) / r);
      x[i] = r * Math.cos(phi);
      y[i] = r * Math.sin(phi);
      vx[i] = -v * Math.sin(phi);
      vy[i] = v * Math.cos(phi);
    }

    // a = −r̂ (1/r² − β/r³). The repulsive term only stiffens the centrifugal barrier,
    // so orbits precess but can never plunge into the centre.
    let ax = 0;
    let ay = 0;
    const accel = (px: number, py: number) => {
      const r2 = px * px + py * py + 1e-4;
      const r = Math.sqrt(r2);
      const k = (-1 + precession / r) / (r2 * r);
      ax = k * px;
      ay = k * py;
    };

    const unit = () => Math.min(env.width, env.height) * 0.45;

    // Replace the oldest body with one launched from the click, a little under circular speed.
    let next = 0;
    const poke = (sx: number, sy: number) => {
      const px = (sx - env.width / 2) / unit();
      const py = (env.height / 2 - sy) / unit();
      const r = Math.hypot(px, py);
      if (r < 0.05) return;
      const v = Math.sqrt(1 / r) * (0.75 + Math.random() * 0.35);
      const i = next++ % n;
      x[i] = px;
      y[i] = py;
      vx[i] = (-py / r) * v;
      vy[i] = (px / r) * v;
    };

    const step = (dt: number) => {
      if (dt === 0) return;
      env.fade(trail, dt);
      const { ctx, width: w, height: h } = env;
      const u = unit();
      const steps = Math.ceil(dt / H);
      const hs = dt / steps;

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(w / 2 + x[i] * u, h / 2 - y[i] * u);
        // Velocity Verlet.
        for (let s = 0; s < steps; s++) {
          accel(x[i], y[i]);
          vx[i] += 0.5 * hs * ax;
          vy[i] += 0.5 * hs * ay;
          x[i] += hs * vx[i];
          y[i] += hs * vy[i];
          accel(x[i], y[i]);
          vx[i] += 0.5 * hs * ax;
          vy[i] += 0.5 * hs * ay;
        }
        ctx.lineTo(w / 2 + x[i] * u, h / 2 - y[i] * u);
      }
      ctx.stroke();

      ctx.fillStyle = env.accent;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    return { step, poke };
  },
};
