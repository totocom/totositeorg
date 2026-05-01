import type { MetadataRoute } from "next";
import {
  blogCategories,
  canIndexBlogCategory,
  getBlogPrimaryCategoryFromLabel,
  type BlogCategorySlug,
  type BlogPost,
} from "@/app/data/blog-posts";
import { getPublishedBlogPostsForSitemap } from "@/app/data/public-blog-posts";
import { getApprovedSites } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

const isBlogIndexActive = true;

function getPublishedPostCountByCategory(
  posts: BlogPost[],
  categorySlug: BlogCategorySlug,
) {
  return posts.filter((post) => {
    const primaryCategory =
      post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);

    return (
      primaryCategory === categorySlug ||
      (post.secondaryCategories ?? []).includes(categorySlug)
    );
  }).length;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sites = getApprovedSites();
  const blogPosts = await getPublishedBlogPostsForSitemap();
  const sitemapBlogCategories = blogCategories.filter((category) => {
    const publishedPostCount = getPublishedPostCountByCategory(
      blogPosts,
      category.slug,
    );

    return canIndexBlogCategory(category, publishedPostCount);
  });

  const siteEntries: MetadataRoute.Sitemap = sites.map((site) => ({
    url: `${siteUrl}/sites/${site.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const blogEntries: MetadataRoute.Sitemap = [
    ...(isBlogIndexActive
      ? [
          {
            url: `${siteUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    ...blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: post.priority === "상" ? 0.7 : 0.6,
    })),
    ...sitemapBlogCategories.map((category) => ({
      url: `${siteUrl}/blog/category/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: category.slug === "site-reports" ? 0.65 : 0.55,
    })),
  ];

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/submit-review`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/submit-scam-report`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/scam-reports`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    ...blogEntries,
    {
      url: `${siteUrl}/site-registration`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...siteEntries,
  ];
}
