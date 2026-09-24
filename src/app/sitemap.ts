import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config";
import { getAllIndexableEntities, getAllTopicSlugs } from "@/lib/repo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entities, topicSlugs] = await Promise.all([
    getAllIndexableEntities(),
    getAllTopicSlugs(),
  ]);
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/topics"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/latest"), lastModified: now, changeFrequency: "hourly", priority: 0.6 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/methodology"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const topicPages: MetadataRoute.Sitemap = topicSlugs.map((slug) => ({
    url: absoluteUrl(`/topics/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const entityPages: MetadataRoute.Sitemap = entities.map((e) => ({
    url: absoluteUrl(`/entity/${e.slug}`),
    lastModified: new Date(e.updatedAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...topicPages, ...entityPages];
}
