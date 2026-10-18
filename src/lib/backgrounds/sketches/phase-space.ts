import type { Sketch } from "../runner";

const P_MAX = 2.6; // the separatrix peaks at |p| = 2

export const phaseSpace: Sketch = {
  id: "phase-space",
  label: "Phase space",
  description:
    "Pendulum phase portrait, θ̇ = p, ṗ = −sin θ. Inside the separatrix orbits librate; outside they rotate.",
  hint: "Click to release a cloud of particles from that point in phase space.",
  params: [
    { key: "count", label: "Particles", min: 50, max: 3000, step: 50, value: 700 },
    { key: "wells", label: "Wells across", min: 1, max: 4, step: 1, value: 2 },
    { key: "trail", label: "Trail fade", min: 0.005, max: 0.2, step: 0.005, value: 0.03 },
    { key: "damping", label: "Damping", min: 0, max: 0.3, step: 0.01, value: 0 },
  ],
  create(env) {
    const { trail, damping } = env.params;
    const n = Math.round(env.params.count);
    const span = Math.PI * env.params.wells; // θ ∈ [−span, span)
    const th = new Float32Array(n);
    const p = new Float32Array(n);
    const age = new Float32Array(n);
    const life = new Float32Array(n);

    const spawn = (i: number) => {
      th[i] = (Math.random() * 2 - 1) * span;
      p[i] = (Math.random() * 2 - 1) * P_MAX * 0.95;
      age[i] = 0;
      life[i] = 4 + Math.random() * 8;
    };
    for (let i = 0; i < n; i++) {
      spawn(i);
      age[i] = Math.random() * life[i]; // stagger respawns
    }

    const sx = (q: number) => ((q + span) / (2 * span)) * env.width;
    const sy = (q: number) => env.height / 2 - (q / P_MAX) * (env.height / 2);
    const force = (q: number, v: number) => -Math.sin(q) - damping * v;

    let next = 0;
    const poke = (x: number, y: number) => {
      const q = (x / env.width) * 2 * span - span;
      const v = ((env.height / 2 - y) / (env.height / 2)) * P_MAX;
      for (let k = 0; k < Math.min(60, n); k++) {
        const i = next++ % n;
        th[i] = q + (Math.random() - 0.5) * 0.08;
        p[i] = v + (Math.random() - 0.5) * 0.08;
        age[i] = 0;
        life[i] = 8 + Math.random() * 6;
      }
    };

    const step = (dt: number) => {
      if (dt === 0) return;
      env.fade(trail, dt);
      const { ctx } = env;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        age[i] += dt;
        if (age[i] > life[i]) {
          spawn(i);
          continue;
        }
        const q0 = th[i];
        const p0 = p[i];
        // Leapfrog (kick, drift, kick) is symplectic, so undamped orbits stay closed.
        let v = p0 + 0.5 * dt * force(q0, p0);
        const q1 = q0 + dt * v;
        v += 0.5 * dt * force(q1, v);
        p[i] = v;
        if (q1 >= span || q1 < -span) {
          // Wrapped around: θ is periodic. Don't draw a line across the screen.
          th[i] = q1 - Math.sign(q1) * 2 * span;
          continue;
        }
        th[i] = q1;
        ctx.moveTo(sx(q0), sy(p0));
        ctx.lineTo(sx(q1), sy(v));
      }
      ctx.stroke();
    };

    return { step, poke };
  },
};
