import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { TOPICS } from "./site.config";

// Lowercase words joined by hyphens, so tag URLs stay clean: /tags/gpu-kernels
const tags = z
  .array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Tags must be lowercase-hyphenated, e.g. gpu-kernels"))
  .default([]);

// Essays and notes: src/content/writing/<id>.md or .mdx → /writing/<id>
// Files starting with "_" are ignored, for scratch notes.
const writing = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/writing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    topic: z.enum(TOPICS),
    tags,
    draft: z.boolean().default(false),
  }),
});

// Things built, with links to source: src/content/projects/<id>.md
const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      topic: z.enum(TOPICS),
      tags,
      repo: z.url().optional(),
      demo: z.url().optional(),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

// Experience and education for the About page, in one YAML file, most recent first.
const experience = defineCollection({
  loader: file("src/content/experience.yaml"),
  schema: z.object({
    section: z.enum(["experience", "education"]),
    start: z.string(),
    end: z.string(),
    title: z.string(),
    org: z.string(),
    summary: z.string(),
  }),
});

// Photographs for /interests/photography, in one YAML file, in display order.
// `src` is a path under src/assets (e.g. photos/harbour.jpg); a missing file shows a placeholder.
const photos = defineCollection({
  loader: file("src/content/photos.yaml"),
  schema: z.object({
    src: z.string(),
    alt: z.string(),
    caption: z.string(),
    place: z.string().optional(),
    date: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writing, projects, experience, photos };
