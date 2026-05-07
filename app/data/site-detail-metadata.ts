import type { Metadata } from "next";
import type { SiteDetailIndexabilityResult } from "./site-detail-indexability";
import { getAllowedStoredImageUrl } from "./storage-image-url";
import type { ReviewTarget } from "./sites";
import { siteName, siteUrl } from "../../lib/config";

const DEFAULT_SITE_DETAIL_OG_IMAGE_PATH = "/logo.png";
const META_DESCRIPTION_MAX_LENGTH = 160;
const SITE_DETAIL_HEADING_FORBIDDEN_TERMS = [
  "추천",
  "안전",
  "위험 사이트",
  "먹튀 없음",
  "먹튀 확정",
  "검증 완료",
  "안전 보장",
  "100% 검증",
  "무조건 안전",
  "가입 추천",
  "바로 가입",
  "바로가기",
  "접속하기",
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

type SiteDetailMetadataOptions = {
  shouldIndex?: boolean;
  indexability?: SiteDetailIndexabilityResult;
  observationSnapshot?: SiteDetailObservationSnapshot | null;
  relatedBlogReport?: unknown | null;
};

type SiteDetailObservationSnapshot = {
  observed_menu_labels?: unknown;
  observed_account_features?: unknown;
  observed_betting_features?: unknown;
  observed_payment_flags?: unknown;
  observed_notice_items?: unknown;
  observed_event_items?: unknown;
  observed_badges?: unknown;
  observedMenuLabels?: unknown;
  observedAccountFeatures?: unknown;
  observedBettingFeatures?: unknown;
  observedPaymentFlags?: unknown;
  observedNoticeItems?: unknown;
  observedEventItems?: unknown;
  observedBadges?: unknown;
  screenshot_url?: string | null;
  screenshot_thumb_url?: string | null;
  screenshotUrl?: string | null;
  screenshotThumbUrl?: string | null;
};

type SiteDetailMetaInput = Pick<
  ReviewTarget,
  | "siteName"
  | "siteUrl"
  | "domains"
  | "reviewCount"
  | "scamReportCount"
  | "shortDescription"
  | "oldestDomainCreationDate"
  | "dnsCheckedAt"
  | "screenshotUrl"
  | "screenshotThumbUrl"
>;

export function buildSiteDetailTitle(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  void options;

  const displayName = normalizeTitleSiteName(site.siteName);
  const titleAxes = getSiteDetailVisibleDataAxes(site);

  return removeForbiddenHeadingTerms(
    `${displayName} ${titleAxes.join("·")} | 토토사이트 정보`,
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSiteDetailShareTitle(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  return buildSiteDetailTitle(site, options);
}

export function buildSiteDetailShareDescription(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  return buildSiteDetailMetaDescription(site, options);
}

export function buildSiteDetailHeading(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  void options;

  const displayName = normalizeHeadingSiteName(site.siteName);
  const headingAxes = getSiteDetailVisibleDataAxes(site);
  const heading = `${displayName} ${headingAxes.join("·")}`;

  return removeForbiddenHeadingTerms(heading).replace(/\s+/g, " ").trim();
}

export function buildSiteDetailMetaDescription(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  void options;

  const displayName = normalizeMetaSiteName(site.siteName);
  const domainCount = getSiteDomainCount(site);
  const scamReportCount = site.scamReportCount ?? 0;
  const representativeDomain = getRepresentativeDomain(site.siteUrl);
  const dataParts = getSiteDetailMetaDataParts({
    representativeDomain,
    domainCount,
    reviewCount: site.reviewCount,
    scamReportCount,
  });
  const firstDescriptionSentence = getFirstMetaSafeSentence(site.shortDescription);
  let templateDescription = `${displayName}의 ${dataParts.join(", ")} 정보를 확인하세요. 제보와 후기는 참고 자료이며 사이트 이용을 권장하지 않습니다. 확인되지 않은 내용은 사실로 단정하지 않습니다.`;

  if (firstDescriptionSentence && templateDescription.length < 125) {
    templateDescription = `${templateDescription} ${firstDescriptionSentence}`;
  }

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
  options: SiteDetailMetadataOptions = {},
): Metadata {
  const title = buildSiteDetailTitle(site, options);
  const description = buildSiteDetailMetaDescription(site, options);
  const pageUrl = toAbsoluteSiteUrl(`/sites/${encodeURIComponent(slug)}`);
  const socialImage = getSiteDetailSocialImage(site);
  const imageAlt = `${normalizeMetaSiteName(site.siteName)} 토토사이트 정보`;
  const shouldIndex = options.shouldIndex ?? true;

  return {
    title: { absolute: title },
    description,
    keywords: null,
    alternates: { canonical: pageUrl },
    robots: buildSiteDetailRobots(shouldIndex),
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

function getSiteDetailVisibleDataAxes(site: SiteDetailMetaInput) {
  const axes: string[] = [];

  if ((site.scamReportCount ?? 0) > 0) {
    axes.push("먹튀 제보");
  }

  if (site.reviewCount > 0) {
    axes.push("후기");
  }

  if (getSiteDomainCount(site) > 0) {
    axes.push("도메인 정보");
  }

  return axes.length > 0 ? axes : ["기본 정보"];
}

function getSiteDetailMetaDataParts({
  representativeDomain,
  domainCount,
  reviewCount,
  scamReportCount,
}: {
  representativeDomain: string;
  domainCount: number;
  reviewCount: number;
  scamReportCount: number;
}) {
  const parts: string[] = [];

  if (scamReportCount > 0) {
    parts.push(`승인된 먹튀 제보 ${scamReportCount}건`);
  }

  if (reviewCount > 0) {
    parts.push(`이용자 후기 ${reviewCount}건`);
  }

  if (domainCount > 1) {
    parts.push(`대표 도메인 ${representativeDomain} 외 ${domainCount - 1}개`);
  } else if (domainCount > 0) {
    parts.push(`대표 도메인 ${representativeDomain}`);
  }

  return parts.length > 0 ? parts : ["현재 공개 가능한 기본"];
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

export function buildSiteDetailRobots(shouldIndex: boolean): Metadata["robots"] {
  return {
    index: shouldIndex,
    follow: true,
    googleBot: {
      index: shouldIndex,
      follow: true,
      "max-snippet": shouldIndex ? -1 : 0,
      "max-image-preview": shouldIndex ? "large" : "none",
      "max-video-preview": shouldIndex ? -1 : 0,
    },
  };
}

function getSiteDomainCount(site: Pick<ReviewTarget, "siteUrl" | "domains">) {
  return Array.from(
    new Set(
      [site.siteUrl, ...(site.domains ?? [])]
        .map((domain) =>
          domain
            .trim()
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .replace(/\/.*$/, "")
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ).length;
}

function getRepresentativeDomain(value: string) {
  const domain = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");

  return domain || "대표 도메인";
}

function getFirstMetaSafeSentence(value: string | null | undefined) {
  const plainText = stripMarkdownForMeta(value ?? "");
  const sentence = plainText
    .replace(/([.!?。！？])\s+/g, "$1\n")
    .split(/\n+/)
    .map((part) => part.trim())
    .find((part) => part.length >= 20 && part.length <= 90);

  if (!sentence) return "";
  if (/추천|가입|입금|충전|보너스|이벤트|바로가기|최신\s*주소|먹튀\s*없음|검증\s*완료|안전|관리자|원문/.test(sentence)) {
    return "";
  }

  return sentence;
}
