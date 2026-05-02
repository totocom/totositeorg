import type { Metadata } from "next";
import { getAllowedStoredImageUrl } from "./storage-image-url";
import type { ReviewTarget } from "./sites";
import { siteName, siteUrl } from "../../lib/config";

const SITE_DETAIL_TITLE_SUFFIX = "주소·도메인·먹튀 제보 현황";
const SITE_DETAIL_HEADING_SUFFIX = "토토사이트 정보: 주소·도메인·먹튀 제보 현황";
const DEFAULT_SITE_DETAIL_OG_IMAGE_PATH = "/logo.png";
const META_DESCRIPTION_MAX_LENGTH = 160;
const SITE_DETAIL_HEADING_FORBIDDEN_TERMS = [
  "추천",
  "안전",
  "먹튀 없음",
  "검증 완료",
];

export function stripMarkdownForMeta(input: string) {
  const withoutUnsafeHtml = input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ");

  return withoutUnsafeHtml
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(?:[-*+]|\d+\.)\s+/.test(line))
    .join(" ")
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S{24,}/gi, " ")
    .replace(/(?:주요\s*메뉴|메뉴\s*목록|관측\s*메뉴)\s*[:：][^.。]+/gi, " ")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/[#*_`>~|]/g, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSiteDetailTitle(site: Pick<ReviewTarget, "siteName">) {
  const displayName = normalizeTitleSiteName(site.siteName);
  return dedupeTitleSegments(
    `${displayName} 토토사이트 정보 | ${SITE_DETAIL_TITLE_SUFFIX}`,
  );
}

export function buildSiteDetailShareTitle(site: Pick<ReviewTarget, "siteName">) {
  return buildSiteDetailTitle(site);
}

export function buildSiteDetailShareDescription(
  site: Pick<ReviewTarget, "siteName">,
) {
  const displayName = normalizeMetaSiteName(site.siteName);

  return stripMarkdownForMeta(
    `${displayName} 토토사이트의 주소, 도메인, DNS·WHOIS, 먹튀 제보와 후기 현황을 조회 시점 기준으로 정리한 정보 페이지입니다.`,
  );
}

export function buildSiteDetailHeading(site: Pick<ReviewTarget, "siteName">) {
  const displayName = normalizeHeadingSiteName(site.siteName);
  const heading = `${displayName} ${SITE_DETAIL_HEADING_SUFFIX}`;

  return removeForbiddenHeadingTerms(heading).replace(/\s+/g, " ").trim();
}

export function buildSiteDetailMetaDescription(
  site: Pick<ReviewTarget, "siteName">,
) {
  const displayName = normalizeMetaSiteName(site.siteName);
  const templateDescription = `${displayName} 토토사이트의 주소, 도메인, DNS·WHOIS 정보와 승인된 먹튀 피해 제보 및 후기 현황을 조회 시점 기준으로 정리한 정보 페이지입니다.`;

  return truncateMetaDescription(stripMarkdownForMeta(templateDescription));
}

export function getSiteDetailSocialImage(
  site: Pick<ReviewTarget, "screenshotUrl" | "screenshotThumbUrl">,
) {
  const screenshotUrl =
    getAllowedStoredImageUrl(site.screenshotUrl) ??
    getAllowedStoredImageUrl(site.screenshotThumbUrl);

  return toAbsoluteSiteUrl(screenshotUrl ?? DEFAULT_SITE_DETAIL_OG_IMAGE_PATH);
}

export function buildSiteDetailMetadata(
  site: ReviewTarget,
  slug: string,
): Metadata {
  const title = buildSiteDetailTitle(site);
  const description = buildSiteDetailMetaDescription(site);
  const pageUrl = toAbsoluteSiteUrl(`/sites/${encodeURIComponent(slug)}`);
  const socialImage = getSiteDetailSocialImage(site);
  const imageAlt = `${normalizeMetaSiteName(site.siteName)} 토토사이트 정보`;

  return {
    title: { absolute: title },
    description,
    keywords: null,
    alternates: { canonical: pageUrl },
    robots: buildSiteDetailRobots(true),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName,
      url: pageUrl,
      title,
      description,
      images: [
        {
          url: socialImage,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: socialImage,
          alt: imageAlt,
        },
      ],
    },
  };
}

export function buildMissingSiteMetadata(): Metadata {
  return {
    title: { absolute: "사이트를 찾을 수 없습니다" },
    robots: buildSiteDetailRobots(false),
  };
}

function normalizeTitleSiteName(value: string) {
  const name = stripMarkdownForMeta(value).replace(/\s+/g, " ").trim();
  const withoutRepeatedCategory = name
    .replace(/(?:\s*토토사이트\s*정보)+$/g, "")
    .replace(/(?:\s*토토사이트)+$/g, "")
    .trim();

  return withoutRepeatedCategory || name || "사이트";
}

function normalizeMetaSiteName(value: string) {
  return normalizeTitleSiteName(value);
}

function normalizeHeadingSiteName(value: string) {
  const normalizedName = normalizeTitleSiteName(value);
  const safeName = removeForbiddenHeadingTerms(normalizedName)
    .replace(/\s+/g, " ")
    .trim();

  return safeName || "사이트";
}

function removeForbiddenHeadingTerms(value: string) {
  return SITE_DETAIL_HEADING_FORBIDDEN_TERMS.reduce(
    (result, term) => result.split(term).join(""),
    value,
  );
}

function dedupeTitleSegments(value: string) {
  const segments: string[] = [];

  for (const segment of value.split("|").map((part) => part.trim()).filter(Boolean)) {
    if (segments[segments.length - 1] !== segment) {
      segments.push(segment);
    }
  }

  return segments
    .join(" | ")
    .replace(/(토토사이트 정보)(?:\s+\1)+/g, "$1")
    .trim();
}

function truncateMetaDescription(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= META_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, META_DESCRIPTION_MAX_LENGTH - 3).trim()}...`;
}

function toAbsoluteSiteUrl(value: string) {
  return new URL(value, siteUrl).toString();
}

function buildSiteDetailRobots(shouldIndex: boolean): Metadata["robots"] {
  return {
    index: shouldIndex,
    follow: shouldIndex,
    googleBot: {
      index: shouldIndex,
      follow: shouldIndex,
      "max-snippet": shouldIndex ? -1 : 0,
      "max-image-preview": shouldIndex ? "large" : "none",
      "max-video-preview": shouldIndex ? -1 : 0,
    },
  };
}
