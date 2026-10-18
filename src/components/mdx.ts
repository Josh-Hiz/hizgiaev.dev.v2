import Figure3D from "./Figure3D.astro";

// Components every .mdx post and project can use without importing them:
//   <Figure3D figure="lorenz" number={1} caption="…" />
export const mdxComponents = { Figure3D };
