import type {
  PublicSiteCrawlSnapshotRow,
  SiteCrawlSnapshotJsonArray,
} from "./site-crawl-snapshots";
import { containsSiteObservationPromotionalTerm } from "./site-html-promotional-flags";
import { getAllowedStoredImageUrl } from "./storage-image-url";

export type PublicSiteObservationSnapshot = PublicSiteCrawlSnapshotRow;

export type PublicSiteObservationAssets = {
  siteName: string;
  screenshotUrl?: string | null;
  screenshotThumbUrl?: string | null;
  faviconUrl?: string | null;
  logoUrl?: string | null;
};

export type SiteObservationSnapshotViewModel =
  | {
      hasSnapshot: false;
      emptyMessage: string;
    }
  | {
      hasSnapshot: true;
      id: string;
      collectedAt: string;
      sourceTypeLabel: string;
      pageTitle: string | null;
      h1: string | null;
      menuLabels: string[];
      accountFeatures: string[];
      bettingFeatures: string[];
      paymentPhraseObserved: boolean;
      noticeOrEventObserved: boolean;
      footerText: string[];
      badges: string[];
      screenshotUrl: string | null;
      screenshotFullUrl: string | null;
      screenshotSource: "site" | "snapshot" | null;
      iconUrl: string | null;
      iconAlt: string;
      promotionalFlagsNotice: string;
    };

const emptyObservationMessage =
  "아직 원본 사이트 관측 정보가 등록되지 않았습니다.";

const promotionalFlagsNotice =
  "홍보성으로 해석될 수 있는 원문은 공개 페이지에서 직접 인용하지 않고, 관측 여부만 요약합니다.";

const forbiddenObservationPatterns = [
  /먹튀\s*없음/i,
  /안전\s*보장/i,
  /무조건\s*안전/i,
  /최신\s*주소/i,
  /우회\s*주소/i,
  /바로\s*가기/i,
];

export function buildSiteObservationSnapshotViewModel({
  snapshot,
  assets,
}: {
  snapshot: PublicSiteObservationSnapshot | null | undefined;
  assets: PublicSiteObservationAssets;
}): SiteObservationSnapshotViewModel {
  if (!snapshot) {
    return {
      hasSnapshot: false,
      emptyMessage: emptyObservationMessage,
    };
  }

  const screenshot = getObservationScreenshot({
    siteScreenshotUrl: assets.screenshotUrl,
    siteScreenshotThumbUrl: assets.screenshotThumbUrl,
    snapshotScreenshotUrl: snapshot.screenshot_url,
    snapshotScreenshotThumbUrl: snapshot.screenshot_thumb_url,
  });
  const iconUrl = firstNonBlank(
    getAllowedStoredImageUrl(assets.logoUrl),
    getAllowedStoredImageUrl(assets.faviconUrl),
  );

  return {
    hasSnapshot: true,
    id: snapshot.id,
    collectedAt: snapshot.collected_at,
    sourceTypeLabel: getSiteObservationSourceTypeLabel(snapshot.source_type),
    pageTitle: normalizePublicObservationText(snapshot.page_title),
    h1: normalizePublicObservationText(snapshot.h1),
    menuLabels: normalizePublicObservationArray(snapshot.observed_menu_labels, 10),
    accountFeatures: normalizePublicObservationArray(
      snapshot.observed_account_features,
      8,
    ),
    bettingFeatures: normalizePublicObservationArray(
      snapshot.observed_betting_features,
      8,
    ),
    paymentPhraseObserved: hasObservationValue(snapshot.observed_payment_flags),
    noticeOrEventObserved: hasObservationValue([
      ...snapshot.observed_notice_items,
      ...snapshot.observed_event_items,
    ]),
    footerText: normalizePublicObservationArray(
      snapshot.observed_footer_text,
      4,
    ),
    badges: normalizePublicObservationArray(snapshot.observed_badges, 8),
    screenshotUrl: screenshot.displayUrl,
    screenshotFullUrl: screenshot.fullUrl,
    screenshotSource: screenshot.source,
    iconUrl,
    iconAlt: `${assets.siteName} 식별 이미지`,
    promotionalFlagsNotice,
  };
}

export function getSiteObservationSourceTypeLabel(sourceType: string) {
  if (sourceType === "manual_html") return "관리자 제공 HTML 기준";
  if (sourceType === "crawler") return "자동 조회 기준";

  return "조회 자료 기준";
}

export function getSiteObservationPublicTextSegments(
  model: SiteObservationSnapshotViewModel,
) {
  if (!model.hasSnapshot) return [model.emptyMessage];

  return [
    model.sourceTypeLabel,
    model.pageTitle,
    model.h1,
    ...model.menuLabels,
    ...model.accountFeatures,
    ...model.bettingFeatures,
    model.paymentPhraseObserved ? "관련 문구 관측됨" : null,
    model.noticeOrEventObserved ? "공지 또는 이벤트 영역이 관측됨" : null,
    ...model.footerText,
    ...model.badges,
    model.promotionalFlagsNotice,
  ].filter((value): value is string => Boolean(value));
}

export function normalizePublicObservationArray(
  values: SiteCrawlSnapshotJsonArray | unknown,
  limit: number,
) {
  if (!Array.isArray(values)) return [];

  const normalizedValues = values
    .map((value) => normalizePublicObservationText(value))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !isForbiddenPublicObservationText(value));

  return Array.from(new Set(normalizedValues)).slice(0, limit);
}

export function normalizePublicObservationText(value: unknown) {
  const rawValue = stringifyObservationValue(value);

  if (!rawValue) return null;

  const normalizedValue = rawValue
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedValue) return null;

  return normalizedValue.length > 120
    ? `${normalizedValue.slice(0, 117)}...`
    : normalizedValue;
}

function hasObservationValue(values: SiteCrawlSnapshotJsonArray | unknown) {
  if (!Array.isArray(values)) return false;

  return values.some((value) => Boolean(normalizePublicObservationText(value)));
}

function isForbiddenPublicObservationText(value: string) {
  return (
    containsSiteObservationPromotionalTerm(value) ||
    forbiddenObservationPatterns.some((pattern) => pattern.test(value))
  );
}

function stringifyObservationValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record.label ?? record.text ?? record.title ?? record.name;

    if (typeof candidate === "string") return candidate;
  }

  return "";
}

function getObservationScreenshot({
  siteScreenshotUrl,
  siteScreenshotThumbUrl,
  snapshotScreenshotUrl,
  snapshotScreenshotThumbUrl,
}: {
  siteScreenshotUrl?: string | null;
  siteScreenshotThumbUrl?: string | null;
  snapshotScreenshotUrl?: string | null;
  snapshotScreenshotThumbUrl?: string | null;
}) {
  const siteDisplayUrl = firstNonBlank(
    getAllowedStoredImageUrl(siteScreenshotThumbUrl),
    getAllowedStoredImageUrl(siteScreenshotUrl),
  );
  const siteFullUrl = firstNonBlank(
    getAllowedStoredImageUrl(siteScreenshotUrl),
    getAllowedStoredImageUrl(siteScreenshotThumbUrl),
  );
  const snapshotDisplayUrl = firstNonBlank(
    getAllowedStoredImageUrl(snapshotScreenshotThumbUrl),
    getAllowedStoredImageUrl(snapshotScreenshotUrl),
  );
  const snapshotFullUrl = firstNonBlank(
    getAllowedStoredImageUrl(snapshotScreenshotUrl),
    getAllowedStoredImageUrl(snapshotScreenshotThumbUrl),
  );

  if (siteDisplayUrl) {
    return {
      displayUrl: siteDisplayUrl,
      fullUrl: siteFullUrl ?? siteDisplayUrl,
      source: "site" as const,
    };
  }

  if (snapshotDisplayUrl) {
    return {
      displayUrl: snapshotDisplayUrl,
      fullUrl: snapshotFullUrl ?? snapshotDisplayUrl,
      source: "snapshot" as const,
    };
  }

  return {
    displayUrl: null,
    fullUrl: null,
    source: null,
  };
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null;
}
