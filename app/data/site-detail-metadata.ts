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

type SiteDetailMetaContext = {
  shouldIndex: boolean;
  observationFactCount: number;
  dominantObservation: ObservationCategorySummary | null;
  hasScreenshot: boolean;
  hasRelatedBlogReport: boolean;
};

type ObservationCategorySummary = {
  key: string;
  titleLabel: string;
  headingLabel: string;
  metaLabel: string;
  count: number;
};

export function buildSiteDetailTitle(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  const displayName = normalizeTitleSiteName(site.siteName);
  const domainCount = getSiteDomainCount(site);
  const scamReportCount = site.scamReportCount ?? 0;
  const context = getSiteDetailMetaContext(site, options);

  if (scamReportCount > 0) {
    return removeForbiddenHeadingTerms(
      `${displayName} 피해 제보 ${scamReportCount}건·도메인 현황`,
    );
  }

  if (site.reviewCount > 0) {
    return removeForbiddenHeadingTerms(
      `${displayName} 후기 ${site.reviewCount}건·관측 정보`,
    );
  }

  if (!context.shouldIndex) {
    return removeForbiddenHeadingTerms(`${displayName} 기본 정보 및 확인 필요 항목`);
  }

  if (context.observationFactCount >= 50) {
    return removeForbiddenHeadingTerms(
      `${displayName} 화면 관측 ${context.observationFactCount}개·도메인 정보`,
    );
  }

  if (context.dominantObservation && context.observationFactCount >= 5) {
    return removeForbiddenHeadingTerms(
      `${displayName} ${context.dominantObservation.titleLabel} 관측 정보`,
    );
  }

  if (context.hasRelatedBlogReport) {
    return removeForbiddenHeadingTerms(`${displayName} 관련 리포트·도메인 관측`);
  }

  if (context.hasScreenshot) {
    return removeForbiddenHeadingTerms(`${displayName} 스크린샷 기반 관측 정보`);
  }

  if (domainCount >= 2) {
    return removeForbiddenHeadingTerms(
      `${displayName} 도메인 ${domainCount}개·확인 항목`,
    );
  }

  return removeForbiddenHeadingTerms(`${displayName} 주소·기본 정보`);
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
  const displayName = normalizeHeadingSiteName(site.siteName);
  const domainCount = getSiteDomainCount(site);
  const scamReportCount = site.scamReportCount ?? 0;
  const context = getSiteDetailMetaContext(site, options);
  let heading = `${displayName} 기본 정보 및 확인 필요 항목`;

  if (scamReportCount > 0 || site.reviewCount > 0) {
    heading = `${displayName} 후기·제보 현황 리포트`;
  } else if (!context.shouldIndex) {
    heading = `${displayName} 기본 정보 및 확인 필요 항목`;
  } else if (context.hasRelatedBlogReport) {
    heading = `${displayName} 관련 리포트와 화면 관측 정보`;
  } else if (context.dominantObservation && context.observationFactCount >= 5) {
    heading = `${displayName} ${context.dominantObservation.headingLabel} 관측 정보`;
  } else if (context.observationFactCount >= 5) {
    heading = `${displayName} 화면 관측 및 도메인 리포트`;
  } else if (context.hasScreenshot) {
    heading = `${displayName} 스크린샷 기반 기본 정보`;
  } else if (domainCount >= 2 || site.dnsCheckedAt || site.oldestDomainCreationDate) {
    heading = `${displayName} 주소·도메인 관측 리포트`;
  }

  return removeForbiddenHeadingTerms(heading).replace(/\s+/g, " ").trim();
}

export function buildSiteDetailMetaDescription(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions = {},
) {
  const displayName = normalizeMetaSiteName(site.siteName);
  const domainCount = getSiteDomainCount(site);
  const scamReportCount = site.scamReportCount ?? 0;
  const representativeDomain = getRepresentativeDomain(site.siteUrl);
  const domainPart = domainCount > 0 ? `도메인 ${domainCount}개` : "대표 도메인";
  const firstDescriptionSentence = getFirstMetaSafeSentence(site.shortDescription);
  const context = getSiteDetailMetaContext(site, options);
  let templateDescription = "";

  if (scamReportCount > 0) {
    templateDescription = `${displayName}의 승인된 피해 제보 ${scamReportCount}건, ${domainPart}, 후기 ${site.reviewCount}건을 기준으로 정리한 공개 정보입니다. 이용 권유나 결과 보증은 아닙니다.`;
  } else if (site.reviewCount > 0) {
    templateDescription = `${displayName}의 승인 후기 ${site.reviewCount}건과 ${domainPart}, 관측 정보를 함께 정리했습니다. 확인되지 않은 항목은 별도로 표시합니다.`;
  } else if (!context.shouldIndex) {
    templateDescription = `${displayName}의 대표 도메인 ${representativeDomain}과 현재 확인 가능한 기본 항목을 정리했습니다. 승인 후기와 피해 제보는 아직 공개되지 않았습니다.`;
  } else if (context.hasRelatedBlogReport && context.observationFactCount >= 5) {
    templateDescription = `${displayName}은 관련 리포트와 관측 항목 ${context.observationFactCount}개를 함께 확인할 수 있는 페이지입니다. 확인되지 않은 항목은 별도 표시됩니다.`;
  } else if (context.observationFactCount >= 5) {
    const observationLabel =
      context.dominantObservation?.metaLabel ?? "화면 관측 정보";
    const screenshotPart = context.hasScreenshot ? ", 스크린샷 여부" : "";

    templateDescription = `${displayName}의 ${domainPart}, 관측 항목 ${context.observationFactCount}개${screenshotPart}를 기준으로 ${observationLabel} 중심의 정보를 정리했습니다. 이용 권유나 결과 보증은 아닙니다.`;
  } else if (domainCount >= 2 || site.dnsCheckedAt || site.oldestDomainCreationDate) {
    templateDescription = `${displayName}의 ${domainPart}와 ${representativeDomain} 기준 공개 정보를 정리했습니다. 승인 후기와 피해 제보가 부족한 항목은 확인 필요로 표시합니다.`;
  } else {
    templateDescription = `${displayName}의 대표 도메인 ${representativeDomain}과 현재 공개된 기본 정보를 정리했습니다. 승인 후기와 피해 제보가 부족해 일부 항목은 확인되지 않았습니다.`;
  }

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

function getSiteDetailMetaContext(
  site: SiteDetailMetaInput,
  options: SiteDetailMetadataOptions,
): SiteDetailMetaContext {
  const observationCategories = getObservationCategorySummaries(
    options.observationSnapshot,
  );
  const observationFactCount = observationCategories.reduce(
    (total, category) => total + category.count,
    0,
  );
  const dominantObservation =
    observationCategories
      .filter((category) => category.count > 0)
      .sort((a, b) => b.count - a.count || getObservationPriority(a.key) - getObservationPriority(b.key))[0] ??
    null;

  return {
    shouldIndex: options.shouldIndex ?? options.indexability?.shouldIndex ?? true,
    observationFactCount,
    dominantObservation,
    hasScreenshot: Boolean(
      site.screenshotUrl ||
        site.screenshotThumbUrl ||
        options.observationSnapshot?.screenshot_url ||
        options.observationSnapshot?.screenshot_thumb_url ||
        options.observationSnapshot?.screenshotUrl ||
        options.observationSnapshot?.screenshotThumbUrl,
    ),
    hasRelatedBlogReport: Boolean(options.relatedBlogReport),
  };
}

function getObservationCategorySummaries(
  snapshot: SiteDetailObservationSnapshot | null | undefined,
): ObservationCategorySummary[] {
  return [
    {
      key: "menus",
      titleLabel: "메뉴 구성",
      headingLabel: "메뉴 구성",
      metaLabel: "메뉴 구성",
      count: countObservationValues(
        snapshot?.observed_menu_labels ?? snapshot?.observedMenuLabels,
      ),
    },
    {
      key: "accounts",
      titleLabel: "계정 기능",
      headingLabel: "계정·메뉴 구성",
      metaLabel: "계정 기능과 메뉴 구성",
      count: countObservationValues(
        snapshot?.observed_account_features ?? snapshot?.observedAccountFeatures,
      ),
    },
    {
      key: "games",
      titleLabel: "화면 구성",
      headingLabel: "화면 구성",
      metaLabel: "화면 구성",
      count: countObservationValues(
        snapshot?.observed_betting_features ?? snapshot?.observedBettingFeatures,
      ),
    },
    {
      key: "payments",
      titleLabel: "결제 표시",
      headingLabel: "결제 표시",
      metaLabel: "결제 관련 표시",
      count: countObservationValues(
        snapshot?.observed_payment_flags ?? snapshot?.observedPaymentFlags,
      ),
    },
    {
      key: "notices",
      titleLabel: "공지 영역",
      headingLabel: "공지·안내 영역",
      metaLabel: "공지와 안내 영역",
      count:
        countObservationValues(
          snapshot?.observed_notice_items ?? snapshot?.observedNoticeItems,
        ) +
        countObservationValues(
          snapshot?.observed_event_items ?? snapshot?.observedEventItems,
        ),
    },
    {
      key: "badges",
      titleLabel: "배지 표시",
      headingLabel: "배지 표시",
      metaLabel: "배지 표시",
      count: countObservationValues(
        snapshot?.observed_badges ?? snapshot?.observedBadges,
      ),
    },
  ];
}

function countObservationValues(values: unknown) {
  return Array.isArray(values)
    ? values.filter((value) => typeof value === "string" && value.trim()).length
    : 0;
}

function getObservationPriority(key: string) {
  const priorities: Record<string, number> = {
    games: 1,
    accounts: 2,
    menus: 3,
    payments: 4,
    notices: 5,
    badges: 6,
  };

  return priorities[key] ?? 99;
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
