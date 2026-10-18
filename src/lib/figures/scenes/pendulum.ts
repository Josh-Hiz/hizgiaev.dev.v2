import {
  BufferAttribute,
  BufferGeometry,
  EllipseCurve,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { FigureDefinition } from "../types";

// A spherical pendulum: a bob on a rigid rod, free to swing in any direction. With some
// sideways motion its path never closes; it precesses into a rosette, left as a trail.
// params: theta (initial angle from vertical, rad), spin (initial azimuthal speed, rad/s),
// g (gravity), trail (seconds of path to keep).

const pendulum: FigureDefinition = {
  camera: { position: [0, 0.8, 3.6], target: [0, 0.4, 0] },
  create({ scene, tint, reducedMotion, params }) {
    const g = params.g ?? 9.81;
    const L = 1;
    const theta0 = params.theta ?? 0.9;
    const spin = params.spin ?? 1.6;
    const trailSeconds = params.trail ?? 7;
    const pivot = new Vector3(0, 0.9, 0);

    // θ from the downward vertical, φ around it. Angular momentum about the vertical is
    // conserved, Lz = sin²θ·φ̇, which removes φ̇ from the equations and keeps θ off zero:
    //   θ̈ = Lz²·cosθ / sin³θ − (g/L)·sinθ,   φ̇ = Lz / sin²θ
    const Lz = Math.sin(theta0) ** 2 * spin;
    let th = theta0;
    let thDot = 0;
    let ph = 0;
    const thAcc = (q: number) => (Lz * Lz * Math.cos(q)) / Math.sin(q) ** 3 - (g / L) * Math.sin(q);
    const phDot = (q: number) => Lz / Math.sin(q) ** 2;

    const advance = (dt: number) => {
      const sub = 8;
      const hh = dt / sub;
      for (let i = 0; i < sub; i++) {
        // RK4 on (θ, θ̇, φ)
        const k1 = [thDot, thAcc(th), phDot(th)];
        const k2 = [thDot + (hh / 2) * k1[1], thAcc(th + (hh / 2) * k1[0]), phDot(th + (hh / 2) * k1[0])];
        const k3 = [thDot + (hh / 2) * k2[1], thAcc(th + (hh / 2) * k2[0]), phDot(th + (hh / 2) * k2[0])];
        const k4 = [thDot + hh * k3[1], thAcc(th + hh * k3[0]), phDot(th + hh * k3[0])];
        th += (hh / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        thDot += (hh / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        ph += (hh / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      }
    };
    const bobPosition = (out: Vector3) =>
      out.set(Math.sin(th) * Math.cos(ph), -Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(L).add(pivot);

    // Reference lines: the vertical through the pivot, dashed, and the circle of radius L below it.
    const vertical = new Line(
      new BufferGeometry().setFromPoints([pivot, new Vector3(0, pivot.y - L - 0.05, 0)]),
      tint(new LineDashedMaterial({ dashSize: 0.04, gapSize: 0.04 }), "rule"),
    );
    vertical.computeLineDistances();
    const circle = new Line(
      new BufferGeometry().setFromPoints(
        new EllipseCurve(0, 0, L, L).getPoints(96).map((p) => new Vector3(p.x, pivot.y - L - 0.05, p.y)),
      ),
      tint(new LineBasicMaterial(), "rule"),
    );
    scene.add(vertical, circle);

    // Trail: a fixed-length buffer of recent bob positions, oldest first.
    const maxPoints = Math.round(trailSeconds * 60);
    const trailData = new Float32Array(maxPoints * 3);
    const trailGeometry = new BufferGeometry();
    trailGeometry.setAttribute("position", new BufferAttribute(trailData, 3));
    scene.add(new Line(trailGeometry, tint(new LineBasicMaterial(), "muted")));
    let count = 0;
    const record = (p: Vector3) => {
      if (count < maxPoints) count++;
      else trailData.copyWithin(0, 3);
      p.toArray(trailData, (count - 1) * 3);
      trailGeometry.setDrawRange(0, count);
      trailGeometry.attributes.position.needsUpdate = true;
    };

    const rodGeometry = new BufferGeometry().setFromPoints([pivot, pivot.clone()]);
    scene.add(new Line(rodGeometry, tint(new LineBasicMaterial(), "ink")));
    const anchor = new Mesh(new SphereGeometry(0.02, 12, 8), tint(new MeshBasicMaterial(), "ink"));
    anchor.position.copy(pivot);
    const bob = new Mesh(new SphereGeometry(0.055, 20, 14), tint(new MeshBasicMaterial(), "accent"));
    scene.add(anchor, bob);

    const p = new Vector3();
    const place = () => {
      bobPosition(p);
      bob.position.copy(p);
      rodGeometry.attributes.position.setXYZ(1, p.x, p.y, p.z);
      rodGeometry.attributes.position.needsUpdate = true;
      record(p);
    };

    // Reduced motion: run the simulation ahead so the still frame already shows a rosette.
    if (reducedMotion) {
      for (let i = 0; i < maxPoints; i++) {
        advance(1 / 60);
        place();
      }
    } else {
      place();
    }

    return {
      update(dt) {
        advance(dt);
        place();
      },
    };
  },
};

export default pendulum;
