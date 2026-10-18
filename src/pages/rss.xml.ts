import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts } from "../lib/content";
import { site, TOPIC_LABELS } from "../site.config";

// The writing feed at /rss.xml (tutorial unit 5.4). Links are made absolute from `site`
// in astro.config.mjs, so that must be the real domain before deploying.
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/writing/${post.id}`,
      categories: [TOPIC_LABELS[post.data.topic], ...post.data.tags],
    })),
    customData: "<language>en</language>",
  });
}
