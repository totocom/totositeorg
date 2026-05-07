import type { MetadataRoute } from "next";
import { getPublicSitesForSitemap } from "@/app/data/public-sites-sitemap";
import { formatDisplayDomain } from "@/app/data/domain-display";
import {
  calculateSiteDetailIndexability,
  type SiteDetailIndexabilityResult,
} from "@/app/data/site-detail-indexability";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import type { ReviewTarget } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicSitesForSitemapResult = await getPublicSitesForSitemap();

  const siteEntries: MetadataRoute.Sitemap = publicSitesForSitemapResult.entries
    .map((entry) => ({
      ...entry,
      indexability: calculateSiteDetailIndexability({
        site: entry.site,
        reviewsCount: entry.approvedReviewCount,
        scamReportsCount: entry.approvedScamReportCount,
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
      const approvedDomainCount = getApprovedDomainCount(site);

      if (!indexability.shouldIndex) {
        return [];
      }

      const baseUrl = `${siteUrl}/sites/${site.slug}`;
      const pages: MetadataRoute.Sitemap = [
        {
          url: baseUrl,
          lastModified: lastModified ? new Date(lastModified) : new Date(),
          changeFrequency: "weekly" as const,
          priority: getSiteSitemapPriority(site, indexability),
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

      if (approvedDomainCount > 0) {
        pages.push({
          url: `${baseUrl}/domains`,
          lastModified: new Date(latestDomainSignalAt ?? lastModified ?? Date.now()),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        });
      }

      return pages;
    });

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/sites`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${siteUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
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

function getApprovedDomainCount(site: ReviewTarget) {
  return new Set(
    [site.siteUrl, ...site.domains]
      .map(formatDisplayDomain)
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  ).size;
}
