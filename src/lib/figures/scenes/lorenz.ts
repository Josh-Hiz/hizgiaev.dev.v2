import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";
import type { FigureDefinition } from "../types";

// The Lorenz attractor as a 3D curve that draws itself, with a marker tracing it afterwards.
// params: rho, sigma, beta, points (curve length), speed (points drawn per second),
// skip (initial steps not drawn; 0 to show the approach, e.g. spiralling into a fixed point).

const lorenz: FigureDefinition = {
  camera: { position: [0, 0.35, 4.4] },
  create({ scene, tint, reducedMotion, params }) {
    const sigma = params.sigma ?? 10;
    const rho = params.rho ?? 28;
    const beta = params.beta ?? 8 / 3;
    const n = params.points ?? 16000;
    const speed = params.speed ?? 1600;
    const h = 0.005;
    const scale = 1 / 22;

    // RK4 on ẋ = σ(y − x), ẏ = x(ρ − z) − y, ż = xy − βz.
    let x = 1;
    let y = 1;
    let z = 1;
    const f = (x: number, y: number, z: number) => [sigma * (y - x), x * (rho - z) - y, x * y - beta * z];
    const step = () => {
      const [a1, b1, c1] = f(x, y, z);
      const [a2, b2, c2] = f(x + (h / 2) * a1, y + (h / 2) * b1, z + (h / 2) * c1);
      const [a3, b3, c3] = f(x + (h / 2) * a2, y + (h / 2) * b2, z + (h / 2) * c2);
      const [a4, b4, c4] = f(x + h * a3, y + h * b3, z + h * c3);
      x += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      y += (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
      z += (h / 6) * (c1 + 2 * c2 + 2 * c3 + c4);
    };
    const skip = params.skip ?? 1000;
    for (let i = 0; i < skip; i++) step(); // skip the transient so the curve starts on the attractor

    // three.js is y-up, so Lorenz z becomes height. Centred on the lobes at z ≈ ρ − 1.
    const points = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      step();
      points[3 * i] = x * scale;
      points[3 * i + 1] = (z - (rho - 1)) * scale;
      points[3 * i + 2] = y * scale;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(points, 3));
    scene.add(new Line(geometry, tint(new LineBasicMaterial(), "ink-2")));

    // Faint axes through the centre, like a textbook plate.
    const axes = new BufferGeometry();
    axes.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1.1, 0, 0, 1.1, 0, 0, 0, -1.2, 0, 0, 1.2, 0, 0, 0, -1.1, 0, 0, 1.1]), 3),
    );
    scene.add(new LineSegments(axes, tint(new LineBasicMaterial(), "rule")));

    const head = new Mesh(new SphereGeometry(0.025, 16, 12), tint(new MeshBasicMaterial(), "accent"));
    scene.add(head);

    let drawn = reducedMotion ? n : 0;
    let cursor = n - 1;
    const place = () => {
      geometry.setDrawRange(0, Math.floor(drawn));
      head.position.fromArray(points, 3 * Math.floor(cursor));
    };
    place();

    return {
      update(dt) {
        if (drawn < n) {
          drawn = Math.min(n, drawn + speed * dt);
          cursor = Math.max(0, drawn - 1);
        } else {
          cursor = (cursor + speed * 0.5 * dt) % n; // keep tracing once the curve is complete
        }
        place();
      },
    };
  },
};

export default lorenz;
