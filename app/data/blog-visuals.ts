import { siteUrl } from "../../lib/config";
import {
  getAllowedStoredImageUrl,
  isAllowedStoredImageUrl,
} from "./storage-image-url";

export type BlogVisualImageSelection = {
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  featuredImageCaption: string | null;
  featuredImageCapturedAt: string | null;
  siteLogoUrl: string | null;
  siteLogoAlt: string | null;
};

export type BlogImageSeoReview = {
  warnings: string[];
  failures: string[];
  hasKeywordListAlt: boolean;
  hasForbiddenAlt: boolean;
  hasDisallowedImageUrl: boolean;
};

export const featuredImageMissingWarning =
  "사이트 스크린샷이 있지만 featured_image_url이 설정되지 않았습니다.";

export const featuredImageAltMissingWarning =
  "featured_image_alt가 비어 있습니다.";

export const imageAltKeywordListWarning =
  "이미지 alt에 키워드 나열 패턴이 있습니다. 사이트 식별과 화면 기록 설명 중심으로 수정하세요.";

export const imageAltForbiddenFailure =
  "이미지 alt에 가입, 바로가기, 추천, 안전, 먹튀 없음 같은 금지 표현이 포함되어 있습니다.";

export const disallowedImageUrlFailure =
  "블로그 이미지 URL은 Supabase Storage 또는 자체 도메인 이미지만 사용할 수 있습니다.";

export function selectBlogVisualImages({
  siteName,
  screenshots,
  logoUrl,
  faviconUrl,
  snapshotAt,
}: {
  siteName: string;
  screenshots?: Array<string | null | undefined> | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  snapshotAt?: string | null;
}): BlogVisualImageSelection {
  const featuredImageUrl =
    uniqueStrings(screenshots ?? []).find(isAllowedBlogImageUrl) ?? null;
  const siteLogoUrl =
    [logoUrl, faviconUrl].map(normalizeString).find(isAllowedBlogImageUrl) ??
    null;
  const featuredImageCapturedAt = normalizeString(snapshotAt) || null;

  return {
    featuredImageUrl,
    featuredImageAlt: featuredImageUrl
      ? getBlogScreenshotAlt({
          siteName,
          capturedAt: featuredImageCapturedAt,
        })
      : null,
    featuredImageCaption: featuredImageUrl
      ? getBlogScreenshotCaption(siteName)
      : null,
    featuredImageCapturedAt,
    siteLogoUrl,
    siteLogoAlt: siteLogoUrl ? getBlogLogoAlt(siteName) : null,
  };
}

export function getBlogLogoAlt(siteName: string) {
  return `${normalizeSiteName(siteName)} 로고`;
}

export function getBlogScreenshotAlt({
  siteName,
  capturedAt,
}: {
  siteName: string;
  capturedAt?: string | null;
}) {
  const normalizedSiteName = normalizeSiteName(siteName);

  if (normalizeString(capturedAt)) {
    return `조회 시점 기준 ${normalizedSiteName} 토토사이트 메인 화면 스크린샷`;
  }

  return `${normalizedSiteName} 토토사이트 메인 화면 스크린샷`;
}

export function getBlogScreenshotCaption(siteName: string) {
  return `조회 시점 기준 저장된 ${normalizeSiteName(siteName)} 메인 화면 이미지입니다. 이 이미지는 사이트 식별과 화면 기록 확인을 위한 자료이며, 가입 또는 이용을 권유하기 위한 목적이 아닙니다.`;
}

export function reviewBlogImageSeo({
  siteName,
  screenshots = [],
  featuredImageUrl,
  featuredImageAlt,
  logoUrl,
}: {
  siteName: string;
  screenshots?: Array<string | null | undefined> | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  logoUrl?: string | null;
}): BlogImageSeoReview {
  const warnings: string[] = [];
  const failures: string[] = [];
  const normalizedScreenshots = uniqueStrings(screenshots ?? []);
  const normalizedFeaturedImageUrl = normalizeString(featuredImageUrl);
  const normalizedLogoUrl = normalizeString(logoUrl);
  const normalizedAlt = normalizeString(featuredImageAlt);
  const hasKeywordListAlt = hasImageAltKeywordListPattern(normalizedAlt, siteName);
  const hasForbiddenAlt = hasForbiddenImageAltTerm(normalizedAlt);
  const imageUrls = uniqueStrings([
    ...normalizedScreenshots,
    normalizedFeaturedImageUrl,
    normalizedLogoUrl,
  ]);
  const hasDisallowedImageUrl = imageUrls.some(
    (imageUrl) => !isAllowedBlogImageUrl(imageUrl),
  );

  if (normalizedScreenshots.length > 0 && !normalizedFeaturedImageUrl) {
    warnings.push(featuredImageMissingWarning);
  }

  if (normalizedFeaturedImageUrl && !normalizedAlt) {
    warnings.push(featuredImageAltMissingWarning);
  }

  if (hasKeywordListAlt) {
    warnings.push(imageAltKeywordListWarning);
  }

  if (hasForbiddenAlt) {
    failures.push(imageAltForbiddenFailure);
  }

  if (hasDisallowedImageUrl) {
    failures.push(disallowedImageUrlFailure);
  }

  return {
    warnings,
    failures,
    hasKeywordListAlt,
    hasForbiddenAlt,
    hasDisallowedImageUrl,
  };
}

export function buildBlogImageMetadata({
  featuredImageUrl,
  featuredImageAlt,
}: {
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
}) {
  const absoluteImageUrl = getAbsoluteImageUrl(featuredImageUrl);

  return {
    jsonLdImage: absoluteImageUrl ? [absoluteImageUrl] : undefined,
    openGraphImages: absoluteImageUrl
      ? [
          {
            url: absoluteImageUrl,
            ...(featuredImageAlt ? { alt: featuredImageAlt } : {}),
          },
        ]
      : undefined,
    twitterImages: absoluteImageUrl ? [absoluteImageUrl] : undefined,
  };
}

export function getAbsoluteImageUrl(value?: string | null) {
  const imageUrl = getAllowedStoredImageUrl(value);

  if (!imageUrl) return null;
  if (imageUrl.startsWith("/")) return new URL(imageUrl, siteUrl).toString();

  try {
    return new URL(imageUrl).toString();
  } catch {
    return null;
  }
}

export function isAllowedBlogImageUrl(value?: string | null) {
  return isAllowedStoredImageUrl(value);
}

function hasImageAltKeywordListPattern(alt: string, siteName: string) {
  if (!alt) return false;

  const normalizedAlt = normalizeString(alt).toLowerCase();
  const normalizedSiteName = normalizeSiteName(siteName).toLowerCase();
  const keywordMatches = [
    "토토사이트",
    "주소",
    "먹튀",
    "도메인",
    "후기",
  ].filter((keyword) => normalizedAlt.includes(keyword)).length;
  const siteNameCount =
    normalizedSiteName.length > 0
      ? normalizedAlt.split(normalizedSiteName).length - 1
      : 0;

  return keywordMatches >= 4 || siteNameCount >= 3;
}

function hasForbiddenImageAltTerm(alt: string) {
  if (!alt) return false;

  return /가입|바로가기|추천|안전|먹튀\s*없음/i.test(alt);
}

function normalizeSiteName(value: string) {
  return normalizeString(value) || "{사이트명}";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map(normalizeString).filter(Boolean)),
  );
}
