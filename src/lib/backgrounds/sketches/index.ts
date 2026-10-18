import type { Sketch } from "../runner";
import { equipotentials } from "./equipotentials";
import { lorenz } from "./lorenz";
import { orbits } from "./orbits";
import { phaseSpace } from "./phase-space";
import { rippleTank } from "./ripple-tank";

// Add a new idea: write a file exporting a Sketch, then list it here.
export const sketches: Sketch[] = [phaseSpace, orbits, lorenz, equipotentials, rippleTank];
