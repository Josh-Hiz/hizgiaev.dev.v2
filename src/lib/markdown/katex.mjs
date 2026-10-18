// Sätteri plugin: typeset math with KaTeX at build time, in .md and .mdx alike.
//
// With `features: { math: true }`, Sätteri parses `$…$` into inlineMath nodes and `$$…$$` into
// math nodes. This swaps each for KaTeX's HTML, so no JavaScript ships to the browser; only
// katex.min.css is needed on the page. Returning `{ raw, mdxExpressions: false }` is Sätteri's
// way to inject generated HTML: MDX parses it into elements, and KaTeX's braces aren't read as
// JS expressions.
import katex from "katex";

/** @param {boolean} displayMode */
const typeset = (displayMode) => (/** @type {{ value: string }} */ node) => ({
  raw: katex.renderToString(node.value, {
    displayMode,
    throwOnError: false, // show the error in red instead of failing the build
  }),
  mdxExpressions: false,
});

/** @type {import("@astrojs/markdown-satteri").SatteriProcessorOptions["mdastPlugins"]} */
export const katexPlugin = [
  {
    name: "katex",
    math: typeset(true),
    inlineMath: typeset(false),
  },
];
