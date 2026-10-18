export type Params = Record<string, number>;

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

/** What a sketch gets to draw with. Sizes are CSS pixels; the runner handles device pixel ratio. */
export interface Env {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Line colour (resolved from a CSS token) and the accent colour. */
  color: string;
  accent: string;
  lineWidth: number;
  params: Params;
  /** Fade what's already drawn toward transparent. `amount` is the fraction removed per 60 fps frame. */
  fade(amount: number, dt: number): void;
  clear(): void;
}

/** Advance and draw one frame. `dt` and `t` are simulation seconds (already scaled by speed). */
export type Step = (dt: number, t: number) => void;

export interface Instance {
  step: Step;
  /** Respond to a click on the background, in CSS pixels relative to the canvas. */
  poke?(x: number, y: number): void;
}

export interface Sketch {
  id: string;
  label: string;
  description: string;
  /** Tells the visitor what clicking does. */
  hint: string;
  params: ParamDef[];
  create(env: Env): Instance;
}

export const defaults = (sketch: Sketch): Params =>
  Object.fromEntries(sketch.params.map((p) => [p.key, p.value]));

export class Runner {
  speed = 1;
  private ctx: CanvasRenderingContext2D;
  private env: Env;
  private sketch?: Sketch;
  private instance?: Instance;
  private raf = 0;
  private last = 0;
  private t = 0;
  private paused = false;
  private reduced = false;
  private visible = false;
  private keep = 1;
  private resizeTimer = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not supported");
    this.ctx = ctx;
    this.env = {
      ctx,
      width: 0,
      height: 0,
      color: "#000",
      accent: "#000",
      lineWidth: 1,
      params: {},
      fade: (amount, dt) => this.fade(amount, dt),
      clear: () => ctx.clearRect(0, 0, this.env.width, this.env.height),
    };
    new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.resize(), 100);
    }).observe(canvas);
    // Don't animate while the canvas is hidden or scrolled out of view.
    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.play();
      else this.stop();
    }).observe(canvas);
  }

  /** Stop and blank the canvas (background switched off). */
  clear() {
    this.stop();
    this.sketch = undefined;
    this.instance = undefined;
    this.env.clear();
  }

  poke(x: number, y: number) {
    if (!this.instance?.poke) return;
    this.instance.poke(x, y);
    if (this.reduced) {
      this.env.clear();
      this.still();
    }
  }

  setSketch(sketch: Sketch, params: Params) {
    this.sketch = sketch;
    this.env.params = params;
    this.restart();
  }

  setStyle(color: string, accent: string, lineWidth: number) {
    const changed = color !== this.env.color || accent !== this.env.accent;
    Object.assign(this.env, { color, accent, lineWidth });
    if (!changed) return;
    // Old trails would keep the previous theme's colour, so start clean.
    if (this.reduced) this.restart();
    else this.env.clear();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.stop();
    else this.play();
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    this.restart();
  }

  restart() {
    this.stop();
    if (!this.sketch || this.env.width === 0) return;
    this.env.clear();
    this.keep = 1;
    this.t = 0;
    this.instance = this.sketch.create(this.env);
    if (this.reduced) this.still();
    else this.play();
  }

  /** Reduced motion: run the simulation for a few seconds off-screen and leave the last frame. */
  private still() {
    for (let i = 0; i < 300; i++) {
      this.t += 1 / 60;
      this.prep();
      this.instance?.step(1 / 60, this.t);
    }
  }

  private play() {
    if (this.raf || this.paused || this.reduced || !this.visible || !this.instance) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number) => {
    // Clamp so a backgrounded tab doesn't come back with one giant step.
    const dt = Math.min((now - this.last) / 1000, 1 / 20) * this.speed;
    this.last = now;
    this.t += dt;
    this.prep();
    this.instance?.step(dt, this.t);
    this.raf = requestAnimationFrame(this.frame);
  };

  private prep() {
    const { ctx, env } = this;
    ctx.strokeStyle = env.color;
    ctx.fillStyle = env.color;
    ctx.lineWidth = env.lineWidth;
    ctx.lineCap = "round";
    ctx.globalAlpha = 1;
  }

  private fade(amount: number, dt: number) {
    this.keep *= Math.pow(1 - amount, dt * 60);
    // Apply in steps of at least 6%: tiny alpha changes round to nothing on an 8-bit canvas,
    // which leaves permanent ghost trails.
    if (this.keep > 0.94) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1 - this.keep;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.env.width, this.env.height);
    ctx.restore();
    this.keep = 1;
  }

  private resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.env.width = width;
    this.env.height = height;
    this.restart();
  }
}
