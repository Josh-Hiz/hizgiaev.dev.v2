import type { APIRoute } from "astro";

// /robots.txt: let every crawler index the whole site, and point them at the sitemap that
// @astrojs/sitemap generates. The sitemap URL is built from `site` in astro.config.mjs.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site);
  return new Response(["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap.href}`, ""].join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
