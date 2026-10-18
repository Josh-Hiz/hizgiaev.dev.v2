import type { ParamDef, Params } from "./runner";

// Kept free of runtime imports: every page loads this to decide whether a background is on.

export interface Settings {
  /** A sketch id, or "none" for no background. */
  sketch: string;
  opacity: number;
  speed: number;
  lineWidth: number;
  /** Per-sketch slider values, so switching animations keeps each one's tweaks. */
  params: Record<string, Params>;
}

export type Look = Omit<Settings, "sketch" | "params">;

export const GLOBALS: (ParamDef & { key: "opacity" | "speed" | "lineWidth" })[] = [
  { key: "opacity", label: "Opacity", min: 0.05, max: 1, step: 0.05, value: 0.5 },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.05, value: 1 },
  { key: "lineWidth", label: "Line width", min: 0.25, max: 3, step: 0.25, value: 1 },
];

export const DEFAULT_LOOK: Look = {
  opacity: 0.5,
  speed: 1,
  lineWidth: 1,
};

export const DEFAULTS: Settings = { sketch: "none", ...DEFAULT_LOOK, params: {} };

const KEY = "background";

export function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}
