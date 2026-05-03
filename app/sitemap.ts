import type { MetadataRoute } from "next";
import {
  blogCategories,
  canIndexBlogCategory,
  getBlogPrimaryCategoryFromLabel,
  type BlogCategorySlug,
} from "@/app/data/blog-posts";
import {
  getPublishedBlogPostsForSitemap,
  type PublicBlogPost,
} from "@/app/data/public-blog-posts";
import { getPublicSitesForSitemap } from "@/app/data/public-sites-sitemap";
import {
  calculateSiteDetailIndexability,
  type SiteDetailIndexabilityResult,
} from "@/app/data/site-detail-indexability";
import type { ReviewTarget } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

const isBlogIndexActive = true;

function getPublishedPostCountByCategory(
  posts: PublicBlogPost[],
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
  const [publicSitesForSitemapResult, blogPosts] = await Promise.all([
    getPublicSitesForSitemap(),
    getPublishedBlogPostsForSitemap(),
  ]);
  const sitemapBlogCategories = blogCategories.filter((category) => {
    const publishedPostCount = getPublishedPostCountByCategory(
      blogPosts,
      category.slug,
    );

    return canIndexBlogCategory(category, publishedPostCount);
  });

  const siteEntries: MetadataRoute.Sitemap = publicSitesForSitemapResult.entries
    .map((entry) => ({
      ...entry,
      indexability: calculateSiteDetailIndexability({
        site: entry.site,
        reviewsCount: entry.site.reviewCount,
        scamReportsCount: entry.site.scamReportCount,
        observationSnapshot: entry.observationSnapshot,
        relatedBlogReport: entry.relatedBlogReport,
        source: publicSitesForSitemapResult.source,
      }),
    }))
    .filter(({ indexability }) => indexability.shouldIndex)
    .map(({ site, indexability, lastModified }) => ({
      url: `${siteUrl}/sites/${site.slug}`,
      lastModified: lastModified ? new Date(lastModified) : new Date(),
      changeFrequency: "weekly" as const,
      priority: getSiteSitemapPriority(site, indexability),
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

function getSiteSitemapPriority(
  site: ReviewTarget,
  indexability: SiteDetailIndexabilityResult,
) {
  if ((site.scamReportCount ?? 0) > 0) return 0.8;
  if (site.reviewCount > 0) return 0.75;
  if (indexability.uniqueFactScore >= 5) return 0.65;

  return 0.55;
}
