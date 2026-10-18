import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { WebGPURenderer } from "three/webgpu";
import type { FigureContext, FigureDefinition, Ink } from "./types";

// The shared engine behind every <Figure3D>: renderer, camera, orbit controls, sizing,
// theme colours and the animation loop. Scene modules only build objects.

async function createRenderer(canvas: HTMLCanvasElement, kind: FigureDefinition["renderer"]) {
  if (kind === "webgpu") {
    const { WebGPURenderer } = await import("three/webgpu");
    const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
    await renderer.init();
    return renderer;
  }
  return new WebGLRenderer({ canvas, antialias: true, alpha: true });
}

const css = (ink: Ink) => getComputedStyle(document.documentElement).getPropertyValue(`--${ink}`).trim();

export async function mount(canvas: HTMLCanvasElement, def: FigureDefinition, params: Record<string, number>) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer: WebGLRenderer | WebGPURenderer = await createRenderer(canvas, def.renderer);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // transparent: the paper shows through

  const scene = new Scene();
  const { position, target = [0, 0, 0], fov = 35 } = def.camera ?? { position: [0, 0, 4] };
  const camera = new PerspectiveCamera(fov, 1, 0.01, 100);
  camera.position.set(...position);
  camera.lookAt(...target);

  let controls: OrbitControls | undefined;
  if (def.controls?.orbit !== false) {
    const speed = def.controls?.autoRotate ?? 0.6;
    controls = new OrbitControls(camera, canvas);
    controls.target.set(...target);
    controls.enableDamping = true;
    controls.enableZoom = false; // keep the mouse wheel for scrolling the page
    controls.enablePan = false;
    controls.autoRotate = !reducedMotion && speed > 0;
    controls.autoRotateSpeed = speed;
    controls.update();
  }

  // Materials follow the theme toggle.
  const tinted: { material: Parameters<FigureContext["tint"]>[0]; ink: Ink }[] = [];
  const tint: FigureContext["tint"] = (material, ink) => {
    material.color.set(css(ink));
    tinted.push({ material, ink });
    return material;
  };
  new MutationObserver(() => {
    for (const { material, ink } of tinted) material.color.set(css(ink));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const instance = await def.create({ scene, camera, tint, reducedMotion, params });

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false); // CSS sizes the canvas; this sets its resolution
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 20); // no giant step after a pause
    last = now;
    if (!reducedMotion) {
      t += dt;
      instance.update?.(dt, t);
    }
    controls?.update(dt);
    renderer.render(scene, camera);
  };

  // Only run the loop while the figure is on screen.
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      last = performance.now();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  }).observe(canvas);
}
