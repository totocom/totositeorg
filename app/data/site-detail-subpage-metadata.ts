import type { Metadata } from "next";
import {
  sanitizePublicGeneratedText,
  sanitizePublicSiteName,
} from "./public-display";
import {
  buildSiteDetailRobots,
  getSiteDetailSocialImage,
} from "./site-detail-metadata";
import { calculateSiteDetailSubpageIndexability } from "./site-detail-subpage-indexability";
import {
  buildReviewsMetaDescription,
  buildScamReportsMetaDescription,
} from "./public-seo-selection";
import type { ReviewTarget } from "./sites";
import { siteName, siteUrl } from "../../lib/config";

type SiteMainDetailResult = {
  common: {
    site: ReviewTarget | null;
    tabCounts: {
      scamReports: number;
      reviews: number;
      domains: number;
    };
  };
};

type SiteScamReportsDetailResult = {
  common: {
    site: ReviewTarget | null;
  };
  scamReports: Array<{
    damageTypes?: string[];
    mainCategory?: string | null;
    categoryItems?: string[] | null;
  }>;
};

type SiteReviewsDetailResult = {
  common: {
    site: ReviewTarget | null;
  };
  reviews: Array<{
    experience?: string | null;
  }>;
};

type SiteDomainsDetailResult = {
  common: {
    site: ReviewTarget | null;
  };
  domains: unknown[];
};

type SiteSubpageMetaInput = {
  site: ReviewTarget | null;
  title: string;
  description: string;
  path: string;
  shouldIndex: boolean;
  imageAlt?: string;
};

const titleTargetLength = 32;
const titleHardLimit = 42;

export function buildSiteMainMetadata(
  detail: SiteMainDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reportCount = detail.common.tabCounts.scamReports;
  const reviewCount = detail.common.tabCounts.reviews;
  const domainCount = detail.common.tabCounts.domains;

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}`,
    shouldIndex: calculateSiteDetailSubpageIndexability({
      site,
      kind: "main",
    }).shouldIndex,
    title: site
      ? buildOptimalSiteTitle(
          site.siteName,
          `제보 ${reportCount}건·후기 ${reviewCount}건·도메인 ${domainCount}개`,
          `제보 ${reportCount}건·후기 ${reviewCount}건`,
        )
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? `${site.siteName} 토토사이트의 대표 주소, 관측 스냅샷, 후기와 먹튀 제보 요약을 정리했습니다.`
      : "",
    imageAlt: site ? `${site.siteName} 토토사이트 메인 화면` : undefined,
  });
}

export function buildSiteScamReportsMetadata(
  detail: SiteScamReportsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reportCount = detail.scamReports.length;

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}/scam-reports`,
    shouldIndex: shouldIndexSiteScamReportsPage(site, reportCount),
    title: site
      ? buildSiteScamReportsTitle(site.siteName)
      : "사이트 정보를 찾을 수 없습니다",
    description: site ? buildSiteScamReportsDescription(site, detail.scamReports) : "",
    imageAlt: site ? `${site.siteName} 토토사이트 먹튀 제보` : undefined,
  });
}

export function buildSiteReviewsMetadata(
  detail: SiteReviewsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reviewCount = detail.reviews.length;

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}/reviews`,
    shouldIndex: shouldIndexSiteReviewsPage(site, reviewCount),
    title: site
      ? buildSiteReviewsTitle(site.siteName)
      : "사이트 정보를 찾을 수 없습니다",
    description: site ? buildSiteReviewsDescription(site, detail.reviews) : "",
    imageAlt: site ? `${site.siteName} 토토사이트 후기` : undefined,
  });
}

export function buildSiteDomainsMetadata(
  detail: SiteDomainsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const domainCount = detail.domains.length;

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}/domains`,
    shouldIndex: shouldIndexSiteDomainsPage(site, domainCount),
    title: site
      ? buildSiteDomainsTitle(site.siteName)
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? buildSiteDomainsDescription(site)
      : "",
    imageAlt: site ? `${site.siteName} 토토사이트 주소·도메인` : undefined,
  });
}

export function buildReviewsTitleSuffix(
  reviewCount: number,
  averageRating: number,
) {
  void reviewCount;
  void averageRating;

  return "후기와 이용자 만족도 평가";
}

export function buildSiteReviewsTitle(siteDisplayName: string) {
  const normalizedSiteName = normalizeReviewTitleSiteName(siteDisplayName);

  return `${normalizedSiteName} 후기와 이용자 만족도 평가 | 토토사이트 정보`;
}

export function buildSiteReviewsDescription(
  site: Pick<ReviewTarget, "siteName">,
  reviews: Array<{ experience?: string | null }> = [],
) {
  const normalizedSiteName = site.siteName.replace(/\s+/g, " ").trim();

  return buildReviewsMetaDescription(normalizedSiteName, reviews);
}

export function buildSiteScamReportsTitle(siteDisplayName: string) {
  const normalizedSiteName = normalizeReviewTitleSiteName(siteDisplayName);

  return sanitizePublicGeneratedText(
    `${normalizedSiteName} 먹튀 제보와 피해 사례 확인 | 토토사이트 정보`,
  );
}

export function buildSiteScamReportsDescription(
  site: Pick<ReviewTarget, "siteName">,
  scamReports: Array<{
    damageTypes?: string[];
    mainCategory?: string | null;
    categoryItems?: string[] | null;
  }> = [],
) {
  const normalizedSiteName = site.siteName.replace(/\s+/g, " ").trim();

  return buildScamReportsMetaDescription(normalizedSiteName, scamReports);
}

export function buildDomainsTitleSuffix(
  domainCount: number,
  oldestDomainAge: string | null,
) {
  const normalizedAge = oldestDomainAge?.trim();

  if (normalizedAge) {
    return `도메인 ${domainCount}개·운영 이력 ${normalizedAge}`;
  }

  return `주소·도메인 ${domainCount}개`;
}

export function buildSiteDomainsTitle(siteDisplayName: string) {
  const normalizedSiteName = normalizeReviewTitleSiteName(siteDisplayName);

  return sanitizePublicGeneratedText(
    `${normalizedSiteName} 주소와 도메인 변경 이력 확인 | 토토사이트 정보`,
  );
}

export function buildSiteDomainsDescription(
  site: Pick<ReviewTarget, "siteName">,
) {
  const displayName = sanitizePublicSiteName(site.siteName);

  return sanitizePublicGeneratedText(
    `${displayName}의 대표 도메인, 추가 도메인, 최초 등록일, 운영 이력, DNS·WHOIS 참고 정보를 확인하세요. 도메인 정보는 참고 자료이며 사이트 안전성이나 이용 가능성을 보장하지 않습니다.`,
  );
}

export function buildDomainsSiteTitle(siteDisplayName: string, suffix: string) {
  const normalizedSiteName = siteDisplayName.replace(/\s+/g, " ").trim();
  const full = `${normalizedSiteName} ${suffix}`.trim();

  if (full.length <= titleHardLimit) return full;

  return buildOptimalSiteTitle(siteDisplayName, suffix);
}

export function buildOptimalSiteTitle(
  siteDisplayName: string,
  suffix: string,
  compactSuffix = suffix,
) {
  const normalizedSiteName = siteDisplayName.replace(/\s+/g, " ").trim();
  const full = `${normalizedSiteName} ${suffix}`.trim();

  if (full.length <= titleTargetLength) return full;

  const shortSiteName = stripParenthesizedEnglish(normalizedSiteName);
  const shortened = `${shortSiteName} ${suffix}`.trim();

  if (shortened.length <= titleTargetLength) return shortened;

  const compact = `${shortSiteName} ${compactSuffix}`.trim();

  if (compact.length <= titleHardLimit) return compact;

  return compact.slice(0, titleHardLimit - 1).trim();
}

function buildSubpageMetadata(input: SiteSubpageMetaInput): Metadata {
  const canonical = toAbsoluteSiteUrl(input.path);

  if (!input.site) {
    return {
      title: { absolute: "사이트 정보를 찾을 수 없습니다" },
      alternates: { canonical },
      robots: buildSiteDetailRobots(false),
    };
  }

  const socialImage = getSiteDetailSocialImage(input.site);

  return {
    title: { absolute: input.title },
    description: input.description,
    keywords: null,
    alternates: { canonical },
    robots: buildSiteDetailRobots(input.shouldIndex),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName,
      url: canonical,
      title: input.title,
      description: input.description,
      images: [{ url: socialImage, alt: input.imageAlt ?? input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [socialImage],
    },
  };
}

function stripParenthesizedEnglish(siteDisplayName: string) {
  return siteDisplayName
    .replace(/\s*\([A-Za-z0-9._ -]+\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReviewTitleSiteName(siteDisplayName: string) {
  const normalizedSiteName = sanitizePublicSiteName(siteDisplayName)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+\(/g, "(");

  return normalizedSiteName || "해당 사이트";
}

function toAbsoluteSiteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

function shouldIndexSiteReviewsPage(
  site: ReviewTarget | null,
  approvedReviewCount: number,
) {
  return calculateSiteDetailSubpageIndexability({
    site,
    kind: "reviews",
    itemCount: approvedReviewCount,
  }).shouldIndex;
}

function shouldIndexSiteScamReportsPage(
  site: ReviewTarget | null,
  approvedScamReportCount: number,
) {
  return calculateSiteDetailSubpageIndexability({
    site,
    kind: "scam-reports",
    itemCount: approvedScamReportCount,
  }).shouldIndex;
}

function shouldIndexSiteDomainsPage(
  site: ReviewTarget | null,
  approvedDomainCount: number,
) {
  return calculateSiteDetailSubpageIndexability({
    site,
    kind: "domains",
    itemCount: approvedDomainCount,
  }).shouldIndex;
}
