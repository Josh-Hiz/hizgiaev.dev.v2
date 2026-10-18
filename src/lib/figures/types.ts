import type { Color, Material, PerspectiveCamera, Scene, Vector3Tuple } from "three";

/** Colour tokens from global.css that a figure can draw in. */
export type Ink = "ink" | "ink-2" | "muted" | "rule" | "accent";

/** What the runtime hands a scene module to build with. */
export interface FigureContext {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Colour a material with a theme token, now and whenever the theme toggles. Returns the material. */
  tint<M extends Material & { color: Color }>(material: M, ink: Ink): M;
  /** The visitor prefers reduced motion: build the finished state; `update` won't be called. */
  reducedMotion: boolean;
  /** Numbers passed from the page: <Figure3D params={{ rho: 28 }} />. */
  params: Record<string, number>;
}

export interface FigureInstance {
  /** Advance one frame; seconds. */
  update?(dt: number, t: number): void;
}

/** A scene module's default export. */
export interface FigureDefinition {
  /** "webgpu" uses three/webgpu's renderer (it falls back to WebGL2 where WebGPU is missing). */
  renderer?: "webgl" | "webgpu";
  camera?: { position: Vector3Tuple; target?: Vector3Tuple; fov?: number };
  /** Drag to orbit (default on). autoRotate is the speed, 0 for none (default 0.6); off under reduced motion. */
  controls?: { orbit?: boolean; autoRotate?: number };
  /** Build the scene. May be async, e.g. to load a model. */
  create(ctx: FigureContext): FigureInstance | Promise<FigureInstance>;
}
