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
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
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
    .flatMap(({
      site,
      indexability,
      approvedReviewCount,
      approvedScamReportCount,
      latestReviewAt,
      latestScamReportAt,
      latestDomainSignalAt,
      lastModified,
    }) => {
      const splitEnabled = isSitePageSplitEnabled(site.slug);

      if (!splitEnabled && !indexability.shouldIndex) {
        return [];
      }

      const baseUrl = `${siteUrl}/sites/${site.slug}`;
      const pages: MetadataRoute.Sitemap = [
        {
          url: baseUrl,
          lastModified: lastModified ? new Date(lastModified) : new Date(),
          changeFrequency: "weekly" as const,
          priority: splitEnabled
            ? 0.75
            : getSiteSitemapPriority(site, indexability),
        },
      ];

      if (!splitEnabled) {
        return pages;
      }

      if (approvedScamReportCount > 0) {
        pages.push({
          url: `${baseUrl}/scam-reports`,
          lastModified: new Date(latestScamReportAt ?? lastModified ?? Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }

      if (approvedReviewCount > 0) {
        pages.push({
          url: `${baseUrl}/reviews`,
          lastModified: new Date(latestReviewAt ?? lastModified ?? Date.now()),
          changeFrequency: "weekly" as const,
          priority: 0.65,
        });
      }

      pages.push({
        url: `${baseUrl}/domains`,
        lastModified: new Date(latestDomainSignalAt ?? lastModified ?? Date.now()),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      });

      return pages;
    });
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
    {
      url: `${siteUrl}/domains`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.65,
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
