import type { SiteCrawlSnapshotHtmlInputType } from "./site-crawl-snapshots";
import { extractSiteHtmlObservation } from "./site-html-observation";

export const manualHtmlSnapshotMaxHtmlLength = 2_000_000;

export type ManualHtmlSnapshotAdminSession = {
  userId: string;
  email: string;
};

export type ManualHtmlSnapshotSite = {
  id: string;
  url: string;
  domains: string[] | null;
};

export type ManualHtmlSnapshotStorageConfig = {
  supabaseUrl: string;
  publicBucket: string;
};

export type ManualHtmlSnapshotInsert = {
  site_id: string;
  source_type: "manual_html";
  html_input_type: SiteCrawlSnapshotHtmlInputType;
  source_url: string;
  final_url: string;
  domain: string;
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  observed_menu_labels: string[];
  observed_account_features: string[];
  observed_betting_features: string[];
  observed_payment_flags: string[];
  observed_notice_items: string[];
  observed_event_items: string[];
  observed_footer_text: string[];
  observed_badges: string[];
  image_candidates_json: Record<string, unknown>;
  favicon_candidates_json: string[];
  logo_candidates_json: string[];
  promotional_flags_json: Record<string, unknown>;
  excluded_terms_json: string[];
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  favicon_url: string | null;
  logo_url: string | null;
  html_sha256: string;
  visible_text_sha256: string;
  raw_html_storage_path: string | null;
  snapshot_status: "extracted";
  ai_observation_summary_json: Record<string, unknown>;
  collected_at: string;
  created_by: string;
};

type ManualHtmlSnapshotRequestBody = {
  source_url?: unknown;
  final_url?: unknown;
  html_input_type?: unknown;
  html?: unknown;
  collected_at?: unknown;
  screenshot_url?: unknown;
  screenshot_thumb_url?: unknown;
  favicon_url?: unknown;
  logo_url?: unknown;
};

type ManualHtmlSnapshotDeps = {
  adminSession: ManualHtmlSnapshotAdminSession | null;
  siteId: string;
  body: unknown;
  storageConfig: ManualHtmlSnapshotStorageConfig;
  getSite: (siteId: string) => Promise<{
    site: ManualHtmlSnapshotSite | null;
    error?: string;
  }>;
  insertSnapshot: (snapshot: ManualHtmlSnapshotInsert) => Promise<{
    snapshotId: string | null;
    error?: string;
  }>;
  updateSiteSnapshot: (
    siteId: string,
    values: {
      latest_crawl_snapshot_id: string;
      content_crawled_at: string;
    },
  ) => Promise<{ error?: string }>;
  allowRawHtmlStorage?: boolean;
  storeRawHtml?: (input: {
    siteId: string;
    html: string;
    htmlSha256: string;
  }) => Promise<{ rawHtmlStoragePath: string | null; error?: string }>;
};

export type ManualHtmlSnapshotResult = {
  status: number;
  body: Record<string, unknown>;
};

const htmlInputTypes = new Set(["source_html", "rendered_html"]);

export async function createManualHtmlSnapshot({
  adminSession,
  siteId,
  body,
  storageConfig,
  getSite,
  insertSnapshot,
  updateSiteSnapshot,
  allowRawHtmlStorage = false,
  storeRawHtml,
}: ManualHtmlSnapshotDeps): Promise<ManualHtmlSnapshotResult> {
  if (!adminSession) {
    return {
      status: 403,
      body: { error: "관리자 권한이 필요합니다." },
    };
  }

  const requestBody = normalizeRequestBody(body);
  const sourceUrl = normalizeHttpUrl(requestBody.source_url);
  const finalUrl = normalizeHttpUrl(requestBody.final_url) || sourceUrl;
  const html = normalizeString(requestBody.html);
  const htmlInputType = normalizeHtmlInputType(requestBody.html_input_type);
  const collectedAt = normalizeIsoDate(requestBody.collected_at);

  if (!sourceUrl) {
    return {
      status: 400,
      body: { error: "source_url은 http:// 또는 https:// 형식이어야 합니다." },
    };
  }

  if (!htmlInputType) {
    return {
      status: 400,
      body: { error: "html_input_type은 source_html 또는 rendered_html이어야 합니다." },
    };
  }

  if (!collectedAt) {
    return {
      status: 400,
      body: { error: "collected_at은 유효한 날짜 문자열이어야 합니다." },
    };
  }

  if (html.length < 20) {
    return {
      status: 400,
      body: { error: "분석할 HTML 소스를 입력해주세요." },
    };
  }

  if (html.length > manualHtmlSnapshotMaxHtmlLength) {
    return {
      status: 413,
      body: { error: "HTML 입력은 2MB 이하로 줄여주세요." },
    };
  }

  const siteResult = await getSite(siteId);

  if (siteResult.error) {
    return {
      status: 500,
      body: { error: siteResult.error },
    };
  }

  if (!siteResult.site) {
    return {
      status: 404,
      body: { error: "사이트를 찾지 못했습니다." },
    };
  }

  if (!isSourceUrlAllowedForSite(sourceUrl, siteResult.site)) {
    return {
      status: 400,
      body: {
        error:
          "source_url은 사이트 대표 URL 또는 등록된 추가 도메인과 일치해야 합니다.",
      },
    };
  }

  const observation = extractSiteHtmlObservation({
    html,
    sourceUrl: finalUrl,
  });
  let rawHtmlStoragePath: string | null = null;

  if (allowRawHtmlStorage && storeRawHtml) {
    const rawHtmlResult = await storeRawHtml({
      siteId,
      html,
      htmlSha256: observation.html_sha256,
    });

    if (rawHtmlResult.error) {
      return {
        status: 500,
        body: { error: rawHtmlResult.error },
      };
    }

    rawHtmlStoragePath = rawHtmlResult.rawHtmlStoragePath;
  }

  const snapshotPayload: ManualHtmlSnapshotInsert = {
    site_id: siteId,
    source_type: "manual_html",
    html_input_type: htmlInputType,
    source_url: sourceUrl,
    final_url: finalUrl,
    domain: getHostname(finalUrl),
    page_title: observation.page_title,
    meta_description: observation.meta_description,
    h1: observation.h1,
    observed_menu_labels: observation.observed_menu_labels,
    observed_account_features: observation.observed_account_features,
    observed_betting_features: observation.observed_betting_features,
    observed_payment_flags: observation.observed_payment_flags,
    observed_notice_items: observation.observed_notice_items,
    observed_event_items: observation.observed_event_items,
    observed_footer_text: observation.observed_footer_text,
    observed_badges: observation.observed_badges,
    image_candidates_json: observation.image_candidates_json,
    favicon_candidates_json: observation.favicon_candidates_json,
    logo_candidates_json: observation.logo_candidates_json,
    promotional_flags_json: observation.promotional_flags_json,
    excluded_terms_json: observation.excluded_terms_json,
    screenshot_url: normalizeStoredImageUrl(
      requestBody.screenshot_url,
      storageConfig,
    ),
    screenshot_thumb_url: normalizeStoredImageUrl(
      requestBody.screenshot_thumb_url,
      storageConfig,
    ),
    favicon_url: normalizeStoredImageUrl(requestBody.favicon_url, storageConfig),
    logo_url: normalizeStoredImageUrl(requestBody.logo_url, storageConfig),
    html_sha256: observation.html_sha256,
    visible_text_sha256: observation.visible_text_sha256,
    raw_html_storage_path: rawHtmlStoragePath,
    snapshot_status: "extracted",
    ai_observation_summary_json: {
      summary: observation.public_observation_summary,
    },
    collected_at: collectedAt,
    created_by: adminSession.userId,
  };

  const insertResult = await insertSnapshot(snapshotPayload);

  if (insertResult.error || !insertResult.snapshotId) {
    return {
      status: 500,
      body: {
        error: insertResult.error ?? "관측 snapshot을 저장하지 못했습니다.",
      },
    };
  }

  const updateResult = await updateSiteSnapshot(siteId, {
    latest_crawl_snapshot_id: insertResult.snapshotId,
    content_crawled_at: collectedAt,
  });

  if (updateResult.error) {
    return {
      status: 500,
      body: { error: updateResult.error },
    };
  }

  return {
    status: 200,
    body: {
      snapshotId: insertResult.snapshotId,
      observation,
    },
  };
}

export function isSourceUrlAllowedForSite(
  sourceUrl: string,
  site: ManualHtmlSnapshotSite,
) {
  const sourceHostname = normalizeComparableHostname(sourceUrl);
  const allowedHostnames = [site.url, ...(site.domains ?? [])]
    .map(normalizeComparableHostname)
    .filter(Boolean);

  return Boolean(sourceHostname && allowedHostnames.includes(sourceHostname));
}

export function normalizeStoredImageUrl(
  value: unknown,
  storageConfig: ManualHtmlSnapshotStorageConfig,
) {
  const url = normalizeHttpUrl(value);
  if (!url) return null;

  const storageUrl = normalizeHttpUrl(storageConfig.supabaseUrl);
  if (!storageUrl) return null;

  const candidate = new URL(url);
  const storage = new URL(storageUrl);
  const bucketPath = `/storage/v1/object/public/${storageConfig.publicBucket}/`;

  if (candidate.hostname !== storage.hostname) return null;
  if (!candidate.pathname.includes(bucketPath)) return null;

  return candidate.toString();
}

function normalizeRequestBody(value: unknown): ManualHtmlSnapshotRequestBody {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ManualHtmlSnapshotRequestBody)
    : {};
}

function normalizeHtmlInputType(
  value: unknown,
): SiteCrawlSnapshotHtmlInputType | null {
  const normalizedValue = normalizeString(value);
  return htmlInputTypes.has(normalizedValue)
    ? (normalizedValue as SiteCrawlSnapshotHtmlInputType)
    : null;
}

function normalizeHttpUrl(value: unknown) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return "";

  try {
    const url = new URL(normalizedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeComparableHostname(value: unknown) {
  const url = normalizeHttpUrl(value);
  if (!url) return "";

  return getHostname(url).replace(/^www\./, "");
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizeIsoDate(value: unknown) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return "";

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
