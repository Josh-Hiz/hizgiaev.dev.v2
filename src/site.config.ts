export const site = {
  name: "Joshua Hizgiaev",
  description: "Computational physics, GPUs, quantitative research and low-level systems.",
  email: "you@example.com",
  location: "New York",
  // PLACEHOLDER profile URLs: replace your-handle with your own.
  social: {
    github: "https://github.com/your-handle",
    linkedin: "https://www.linkedin.com/in/your-handle",
  },
  nav: [
    { label: "About", href: "/about" },
    { label: "Writing", href: "/writing" },
    { label: "Projects", href: "/projects" },
    { label: "Interests", href: "/interests" },
  ],
} as const;

// The fixed set of topics a post or project can belong to. Add one here to make it available.
export const TOPICS = ["physics", "gpu", "quant", "systems", "notes"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABELS: Record<Topic, string> = {
  physics: "Physics",
  gpu: "GPUs",
  quant: "Quantitative research",
  systems: "Low-level systems",
  notes: "Notes",
};

// Listed on /interests in this order; each has a page at /interests/<slug>. `topics` decides
// which writing and projects that page collects. Physics and Photography have their own page
// files; the rest share src/pages/interests/[slug].astro.
// PLACEHOLDER descriptions: replace with your own.
export interface Interest {
  slug: string;
  label: string;
  description: string;
  topics: readonly Topic[];
}

export const interests = [
  {
    slug: "physics",
    label: "Physics",
    description: "[Placeholder: a sentence on what you study and write about in physics.]",
    topics: ["physics"],
  },
  {
    slug: "computer-science",
    label: "Computer Science & Hardware",
    description: "[Placeholder: a sentence on the systems, GPUs and hardware you work with.]",
    topics: ["gpu", "systems"],
  },
  {
    slug: "photography",
    label: "Photography",
    description: "[Placeholder: a sentence on what and how you photograph.]",
    topics: [],
  },
  {
    slug: "quant",
    label: "Quantitative Research",
    description: "[Placeholder: a sentence on the markets and methods you study.]",
    topics: ["quant"],
  },
  {
    slug: "misc",
    label: "Misc",
    description: "[Placeholder: a sentence on everything else.]",
    topics: ["notes"],
  },
] as const satisfies readonly Interest[];
