import { unstable_cache } from "next/cache";
import {
  getPublicReviewList,
  getPublicScamReportList,
  getPublicSites,
  type PublicReviewListItem,
  type PublicScamReportListItem,
} from "./public-sites";
import type { ReviewTarget } from "./sites";

export type HomePageStats = {
  siteCount: number;
  scamReportCount: number;
  reviewCount: number;
};

export type PublicHomePageData = {
  stats: HomePageStats;
  popularSites: ReviewTarget[];
  recentScamReports: PublicScamReportListItem[];
  recentReviews: PublicReviewListItem[];
  errorMessage: string;
  source: "supabase" | "fallback";
};

function getTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function getSiteTrustScore(site: ReviewTarget) {
  return site.trustScore?.total ?? 0;
}

function sortPopularSites(first: ReviewTarget, second: ReviewTarget) {
  return (
    getSiteTrustScore(second) - getSiteTrustScore(first) ||
    second.reviewCount - first.reviewCount ||
    (second.scamReportCount ?? 0) - (first.scamReportCount ?? 0) ||
    second.domains.length - first.domains.length ||
    first.siteName.localeCompare(second.siteName, "ko")
  );
}

export async function getHomePageDataUncached(): Promise<PublicHomePageData> {
  const [sitesResult, scamReportsResult, reviewsResult] = await Promise.all([
    getPublicSites(),
    getPublicScamReportList(),
    getPublicReviewList(),
  ]);
  const recentScamReports = [...scamReportsResult.items]
    .sort((first, second) => getTime(second.createdAt) - getTime(first.createdAt))
    .slice(0, 3);
  const recentReviews = [...reviewsResult.items]
    .sort((first, second) => getTime(second.createdAt) - getTime(first.createdAt))
    .slice(0, 3);

  return {
    stats: {
      siteCount: sitesResult.sites.length,
      scamReportCount: scamReportsResult.items.length,
      reviewCount: reviewsResult.items.length,
    },
    popularSites: [...sitesResult.sites].sort(sortPopularSites).slice(0, 8),
    recentScamReports,
    recentReviews,
    errorMessage: [
      sitesResult.errorMessage,
      scamReportsResult.errorMessage,
      reviewsResult.errorMessage,
    ]
      .filter(Boolean)
      .join(" "),
    source:
      sitesResult.source === "fallback" ||
      scamReportsResult.source === "fallback" ||
      reviewsResult.source === "fallback"
        ? "fallback"
        : "supabase",
  };
}

export const getHomePageData = unstable_cache(
  getHomePageDataUncached,
  ["public-home-v1"],
  {
    revalidate: 600,
    tags: ["public-sites", "public-home"],
  },
);
