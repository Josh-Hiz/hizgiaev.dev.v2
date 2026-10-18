import type { FigureDefinition } from "./types";

// Every 3D figure by name. Each loads on demand, so a page only downloads the scenes it shows.
// Add one: write scenes/<name>.ts exporting a FigureDefinition, then list it here.
export const figures = {
  lorenz: () => import("./scenes/lorenz"),
  pendulum: () => import("./scenes/pendulum"),
} satisfies Record<string, () => Promise<{ default: FigureDefinition }>>;

export type FigureName = keyof typeof figures;
