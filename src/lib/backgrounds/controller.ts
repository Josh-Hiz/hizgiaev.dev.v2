import { Runner, defaults, type ParamDef, type Sketch } from "./runner";
import { DEFAULT_LOOK, GLOBALS, load, save } from "./settings";
import { sketches } from "./sketches";

// Loaded only once a visitor turns a background on (or opens the editor).

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export interface Controller {
  next(): void;
  off(): void;
  edit(): void;
}

export function start(): Controller {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-bg-canvas]")!;
  const editor = document.querySelector<HTMLElement>("[data-bg-editor]")!;
  const $ = <T extends Element>(selector: string) => editor.querySelector<T>(selector)!;
  const sketchSelect = $<HTMLSelectElement>('[data-control="sketch"]');
  const paramsBox = $<HTMLElement>("[data-params]");
  const globalsBox = $<HTMLElement>("[data-globals]");
  const description = $<HTMLElement>("[data-description]");
  const hint = $<HTMLElement>("[data-hint]");
  const sketchOnly = editor.querySelectorAll<HTMLElement>("[data-sketch-only]");
  const pauseButton = $<HTMLButtonElement>('[data-action="pause"]');
  const closeButton = $<HTMLButtonElement>("[data-bg-close]");

  let settings = load();
  let paused = false;
  let opener: HTMLElement | null = null;
  const runner = new Runner(canvas);
  const osReduced = matchMedia("(prefers-reduced-motion: reduce)");

  const current = () => sketches.find((s) => s.id === settings.sketch);
  const paramsFor = (sketch: Sketch) =>
    // Merge so params added to a sketch later still get their defaults.
    (settings.params[sketch.id] = { ...defaults(sketch), ...settings.params[sketch.id] });
  const css = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const decimals = (step: number) => (String(step).split(".")[1] ?? "").length;

  function slider(def: ParamDef, value: number, onInput: (v: number) => void) {
    const label = document.createElement("label");
    label.className = "block";
    label.innerHTML = `
      <span class="flex items-baseline justify-between gap-2">
        <span class="label"></span><output class="font-mono text-[0.72rem] text-muted"></output>
      </span>
      <input type="range" class="mt-1 block w-full accent-accent" />`;
    label.querySelector(".label")!.textContent = def.label;
    const out = label.querySelector("output")!;
    const input = label.querySelector("input")!;
    Object.assign(input, { min: def.min, max: def.max, step: def.step, value });
    const show = () => (out.textContent = Number(input.value).toFixed(decimals(def.step)));
    show();
    input.addEventListener("input", () => {
      show();
      onInput(Number(input.value));
    });
    return label;
  }

  // Footer caption and editor controls reflect the current settings.
  function render() {
    const sketch = current();
    const index = sketch ? sketches.indexOf(sketch) : -1;

    for (const label of document.querySelectorAll("[data-bg-label]")) {
      label.textContent = sketch ? `Pl. ${ROMAN[index] ?? index + 1}, ${sketch.label}` : "off";
    }
    for (const el of document.querySelectorAll<HTMLElement>("[data-bg-when-on]")) el.hidden = !sketch;
    for (const el of sketchOnly) el.hidden = !sketch;

    sketchSelect.value = settings.sketch;
    description.textContent = sketch?.description ?? "No background. Pick a plate to begin.";
    hint.textContent = sketch?.hint ?? "";

    paramsBox.replaceChildren(
      ...(sketch
        ? sketch.params.map((def) => {
            const params = paramsFor(sketch);
            return slider(def, params[def.key], (v) => {
              params[def.key] = v;
              save(settings);
              runner.setSketch(sketch, params);
            });
          })
        : []),
    );
    globalsBox.replaceChildren(
      ...GLOBALS.map((def) =>
        slider(def, settings[def.key], (v) => {
          settings[def.key] = v;
          save(settings);
          applyLook();
        }),
      ),
    );
  }

  // Everything that changes how the canvas looks without restarting the simulation.
  function applyLook() {
    canvas.hidden = !current();
    canvas.style.opacity = String(settings.opacity);
    runner.speed = settings.speed;
    runner.setStyle(css("muted"), css("accent"), settings.lineWidth);
  }

  function run() {
    const sketch = current();
    if (sketch) runner.setSketch(sketch, paramsFor(sketch));
    else runner.clear();
  }

  function choose(id: string) {
    settings.sketch = id;
    save(settings);
    render();
    applyLook();
    run();
  }

  function open() {
    opener = document.activeElement as HTMLElement | null;
    editor.hidden = false;
    closeButton.focus();
  }

  function close() {
    editor.hidden = true;
    opener?.focus();
  }

  // Editor controls.
  sketchSelect.replaceChildren(
    new Option("Off", "none"),
    ...sketches.map((s, i) => new Option(`Pl. ${ROMAN[i] ?? i + 1}, ${s.label}`, s.id)),
  );
  sketchSelect.addEventListener("change", () => choose(sketchSelect.value));
  // Reduced motion follows the OS setting only: a still frame instead of animation.
  osReduced.addEventListener("change", () => runner.setReduced(osReduced.matches));
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Play" : "Pause";
    runner.setPaused(paused);
  });
  $('[data-action="restart"]').addEventListener("click", () => runner.restart());
  $('[data-action="reset"]').addEventListener("click", () => {
    // Back to the default look and sliders, keeping the chosen plate.
    settings = { ...settings, ...DEFAULT_LOOK, params: {} };
    save(settings);
    render();
    applyLook();
    run();
  });
  closeButton.addEventListener("click", close);
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  // Clicking the background pokes the simulation, unless the click was meant for something else.
  document.addEventListener("click", (e) => {
    if (!current() || canvas.hidden) return;
    const target = e.target as Element;
    if (target.closest("a, button, input, select, textarea, label, summary, img, [data-bg-editor]")) return;
    if (!getSelection()?.isCollapsed) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    runner.poke(x, y);
  });

  // Re-read the colour tokens when the theme toggle flips data-theme.
  new MutationObserver(applyLook).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  render();
  applyLook();
  runner.setReduced(osReduced.matches);
  run();

  return {
    next() {
      const i = sketches.findIndex((s) => s.id === settings.sketch);
      choose(sketches[(i + 1) % sketches.length].id);
    },
    off() {
      choose("none");
    },
    edit() {
      if (editor.hidden) open();
      else close();
    },
  };
}
