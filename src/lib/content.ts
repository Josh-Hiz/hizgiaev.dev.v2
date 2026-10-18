import { getCollection, type CollectionEntry } from "astro:content";
import type { Topic } from "../site.config";

export type Post = CollectionEntry<"writing">;
export type Project = CollectionEntry<"projects">;
export type ExperienceEntry = CollectionEntry<"experience">;
export type Photo = CollectionEntry<"photos">;

interface Filter {
  /** One topic, or any of several. */
  topic?: Topic | readonly Topic[];
  tag?: string;
}

// Drafts show up while running `astro dev`, never in a build.
const matches =
  ({ topic, tag }: Filter) =>
  ({ data }: Post | Project) =>
    (import.meta.env.DEV || !data.draft) &&
    (topic === undefined || ([topic].flat() as Topic[]).includes(data.topic)) &&
    (!tag || data.tags.includes(tag));

const newestFirst = (a: Post | Project, b: Post | Project) => b.data.date.valueOf() - a.data.date.valueOf();

export async function getPosts(filter: Filter = {}): Promise<Post[]> {
  return (await getCollection("writing", matches(filter))).sort(newestFirst);
}

export async function getProjects(filter: Filter = {}): Promise<Project[]> {
  return (await getCollection("projects", matches(filter))).sort(newestFirst);
}

/** Every tag used by a visible post or project, with how many entries use it, alphabetical. */
export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const counts = new Map<string, number>();
  for (const entry of [...(await getPosts()), ...(await getProjects())]) {
    for (const tag of entry.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Photographs in the order they appear in photos.yaml; drafts only in dev. */
export async function getPhotos(): Promise<Photo[]> {
  return getCollection("photos", ({ data }) => import.meta.env.DEV || !data.draft);
}

/** About-page entries for one section, in the order they appear in experience.yaml. */
export async function getExperience(section: ExperienceEntry["data"]["section"]): Promise<ExperienceEntry[]> {
  return getCollection("experience", ({ data }) => data.section === section);
}

/** "17 Oct 2026". Dates in frontmatter are parsed as UTC midnight, so format in UTC. */
export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
