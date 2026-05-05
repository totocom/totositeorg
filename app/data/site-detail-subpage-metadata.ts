import type { Metadata } from "next";
import { formatDisplayDomain } from "./domain-display";
import {
  buildSiteDetailRobots,
  getSiteDetailSocialImage,
} from "./site-detail-metadata";
import { calculateSiteDetailSubpageIndexability } from "./site-detail-subpage-indexability";
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
  scamReports: unknown[];
};

type SiteReviewsDetailResult = {
  common: {
    site: ReviewTarget | null;
  };
  reviews: unknown[];
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
    shouldIndex: calculateSiteDetailSubpageIndexability({
      site,
      kind: "scam-reports",
      itemCount: reportCount,
    }).shouldIndex,
    title: site
      ? buildOptimalSiteTitle(site.siteName, `먹튀 제보 ${reportCount}건`)
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? reportCount > 0
        ? `${site.siteName} 토토사이트 관련 승인된 먹튀 제보 ${reportCount}건의 피해 유형, 접수 시점, 공개 신고 내용을 정리했습니다.`
        : `${site.siteName} 토토사이트 관련 승인된 먹튀 제보는 아직 없습니다. 제보 방법과 확인 기준을 안내합니다.`
      : "",
    imageAlt: site ? `${site.siteName} 토토사이트 먹튀 제보` : undefined,
  });
}

export function buildSiteReviewsMetadata(
  detail: SiteReviewsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reviewCount = detail.reviews.length;
  const averageRating = site?.averageRating ?? 0;
  const titleSuffix = buildReviewsTitleSuffix(reviewCount, averageRating);

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}/reviews`,
    shouldIndex: calculateSiteDetailSubpageIndexability({
      site,
      kind: "reviews",
      itemCount: reviewCount,
    }).shouldIndex,
    title: site
      ? buildOptimalSiteTitle(site.siteName, titleSuffix)
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? reviewCount > 0
        ? `${site.siteName} 토토사이트의 승인된 후기 ${reviewCount}건과 평점, 이용 경험을 모아 정리했습니다.`
        : `${site.siteName} 토토사이트에 대해 승인된 후기는 아직 없습니다. 후기 작성 방법과 확인 기준을 안내합니다.`
      : "",
    imageAlt: site ? `${site.siteName} 토토사이트 후기` : undefined,
  });
}

export function buildSiteDomainsMetadata(
  detail: SiteDomainsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const domainCount = detail.domains.length;
  const oldestDomainAge =
    site?.oldestDomainCreationDate
      ? getDomainAge(site.oldestDomainCreationDate)
      : null;
  const titleSuffix = buildDomainsTitleSuffix(domainCount, oldestDomainAge);
  const representativeDomain = site ? formatDisplayDomain(site.siteUrl) : "";
  const additionalDomainCount = Math.max(0, domainCount - 1);

  return buildSubpageMetadata({
    site,
    path: `/sites/${encodeURIComponent(slug)}/domains`,
    shouldIndex: calculateSiteDetailSubpageIndexability({
      site,
      kind: "domains",
    }).shouldIndex,
    title: site
      ? buildDomainsSiteTitle(site.siteName, titleSuffix)
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? `${site.siteName} 토토사이트의 대표 주소(${representativeDomain})와 추가 도메인 ${additionalDomainCount}개, DNS와 WHOIS 조회 정보를 정리했습니다.`
      : "",
    imageAlt: site ? `${site.siteName} 토토사이트 주소·도메인` : undefined,
  });
}

export function buildReviewsTitleSuffix(
  reviewCount: number,
  averageRating: number,
) {
  if (reviewCount <= 0) return "이용자 후기";
  if (!Number.isFinite(averageRating) || averageRating <= 0) {
    return `후기 ${reviewCount}건`;
  }

  return `후기 ${reviewCount}건·평점 ${averageRating.toFixed(1)}점`;
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

function getDomainAge(value: string) {
  const createdAt = new Date(value);
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth();

  if (!Number.isFinite(monthDiff) || monthDiff < 0) return null;

  const years = Math.floor(monthDiff / 12);
  const months = monthDiff % 12;

  if (years <= 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

function toAbsoluteSiteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
