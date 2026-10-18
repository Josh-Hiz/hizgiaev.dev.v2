// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { katexPlugin } from "./src/lib/markdown/katex.mjs";

import sitemap from "@astrojs/sitemap";

import playformCompress from "@playform/compress";

// A Latin variable-font file from an installed @fontsource-variable package.
/** @param {string} pkg @param {string} file */
const fontsource = (pkg, file) => `@fontsource-variable/${pkg}/files/${file}`;

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  // Prefetch a page when its link is hovered or focused, so navigation feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  // Self-hosted via the Fonts API: <Font> in BaseLayout preloads the files and emits fallbacks
  // sized to match each font's metrics, so text doesn't jump when the real font arrives.
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Newsreader",
      cssVariable: "--font-newsreader",
      fallbacks: ["Georgia", "serif"],
      options: {
        variants: [
          { src: [fontsource("newsreader", "newsreader-latin-wght-normal.woff2")], weight: "200 800", style: "normal" },
          { src: [fontsource("newsreader", "newsreader-latin-wght-italic.woff2")], weight: "200 800", style: "italic" },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Geist",
      cssVariable: "--font-geist",
      fallbacks: ["ui-sans-serif", "system-ui", "sans-serif"],
      options: {
        variants: [{ src: [fontsource("geist", "geist-latin-wght-normal.woff2")], weight: "100 900", style: "normal" }],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Geist Mono",
      cssVariable: "--font-geist-mono",
      fallbacks: ["ui-monospace", "Menlo", "monospace"],
      options: {
        variants: [
          { src: [fontsource("geist-mono", "geist-mono-latin-wght-normal.woff2")], weight: "100 900", style: "normal" },
        ],
      },
    },
  ],
  // .mdx posts can use components (e.g. <Figure3D>); they share the Markdown settings below.
  integrations: [mdx(), sitemap(), playformCompress()],
  markdown: {
    // Sätteri is Astro 7's native Markdown processor. `math` parses $inline$ and $$display$$;
    // the plugin typesets them with KaTeX at build time.
    processor: satteri({
      features: { math: true },
      mdastPlugins: katexPlugin,
    }),
    // Both themes are emitted as CSS variables; global.css picks one from data-theme.
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});