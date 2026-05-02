import type {
  SiteCrawlSnapshotJsonArray,
  SiteCrawlSnapshotJsonObject,
  SiteCrawlSnapshotSourceType,
} from "./site-crawl-snapshots";
import { getAllowedStoredImageUrl } from "./storage-image-url";

export const blogSourceCrawlSnapshotSelect = [
  "id",
  "site_id",
  "source_type",
  "collected_at",
  "page_title",
  "meta_description",
  "h1",
  "observed_menu_labels",
  "observed_account_features",
  "observed_betting_features",
  "observed_payment_flags",
  "observed_notice_items",
  "observed_event_items",
  "observed_footer_text",
  "observed_badges",
  "promotional_flags_json",
  "excluded_terms_json",
  "screenshot_url",
  "screenshot_thumb_url",
].join(", ");

export const blogSourceCrawlSnapshotAiInstruction =
  "crawl_snapshot 또는 manual_html_snapshot은 원본 페이지의 공개 HTML에서 조회 시점 기준 관측된 정보입니다. 이 정보를 사이트 이용 권유, 가입 유도, 보너스/이벤트 소개, 최신 주소 안내로 사용하지 마세요. 관측 정보는 사이트 식별과 화면 기록 확인 목적의 설명에만 사용하세요.";

export type BlogSourceCrawlSnapshotRow = {
  id: string;
  site_id: string;
  source_type: SiteCrawlSnapshotSourceType;
  collected_at: string;
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  observed_menu_labels: SiteCrawlSnapshotJsonArray;
  observed_account_features: SiteCrawlSnapshotJsonArray;
  observed_betting_features: SiteCrawlSnapshotJsonArray;
  observed_payment_flags: SiteCrawlSnapshotJsonArray;
  observed_notice_items: SiteCrawlSnapshotJsonArray;
  observed_event_items: SiteCrawlSnapshotJsonArray;
  observed_footer_text: SiteCrawlSnapshotJsonArray;
  observed_badges: SiteCrawlSnapshotJsonArray;
  promotional_flags_json: SiteCrawlSnapshotJsonObject;
  excluded_terms_json: SiteCrawlSnapshotJsonArray;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
};

export type BlogSourceCrawlSnapshot = {
  id: string;
  source_type: SiteCrawlSnapshotSourceType;
  snapshot_kind: "manual_html_snapshot" | "crawl_snapshot";
  collected_at: string;
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  observed_menu_labels: SiteCrawlSnapshotJsonArray;
  observed_account_features: SiteCrawlSnapshotJsonArray;
  observed_betting_features: SiteCrawlSnapshotJsonArray;
  observed_payment_flags: SiteCrawlSnapshotJsonArray;
  observed_notice_items: SiteCrawlSnapshotJsonArray;
  observed_event_items: SiteCrawlSnapshotJsonArray;
  observed_footer_text: SiteCrawlSnapshotJsonArray;
  observed_badges: SiteCrawlSnapshotJsonArray;
  promotional_flags_json: SiteCrawlSnapshotJsonObject;
  excluded_terms_json: SiteCrawlSnapshotJsonArray;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  ai_usage_instruction: string;
};

export function toBlogSourceCrawlSnapshot(
  row: BlogSourceCrawlSnapshotRow | null | undefined,
): BlogSourceCrawlSnapshot | null {
  if (!row) return null;

  return {
    id: row.id,
    source_type: row.source_type,
    snapshot_kind:
      row.source_type === "manual_html"
        ? "manual_html_snapshot"
        : "crawl_snapshot",
    collected_at: row.collected_at,
    page_title: normalizeNullableText(row.page_title),
    meta_description: normalizeNullableText(row.meta_description),
    h1: normalizeNullableText(row.h1),
    observed_menu_labels: normalizeJsonArray(row.observed_menu_labels),
    observed_account_features: normalizeJsonArray(
      row.observed_account_features,
    ),
    observed_betting_features: normalizeJsonArray(
      row.observed_betting_features,
    ),
    observed_payment_flags: normalizeJsonArray(row.observed_payment_flags),
    observed_notice_items: normalizeJsonArray(row.observed_notice_items),
    observed_event_items: normalizeJsonArray(row.observed_event_items),
    observed_footer_text: normalizeJsonArray(row.observed_footer_text),
    observed_badges: normalizeJsonArray(row.observed_badges),
    promotional_flags_json: normalizeJsonObject(row.promotional_flags_json),
    excluded_terms_json: normalizeJsonArray(row.excluded_terms_json),
    screenshot_url: getAllowedStoredImageUrl(row.screenshot_url),
    screenshot_thumb_url: getAllowedStoredImageUrl(row.screenshot_thumb_url),
    ai_usage_instruction: blogSourceCrawlSnapshotAiInstruction,
  };
}

export function getBlogSourceCrawlSnapshotJson(
  snapshot: { crawl_snapshot?: unknown } | null | undefined,
) {
  return isRecord(snapshot?.crawl_snapshot) ? snapshot.crawl_snapshot : null;
}

function normalizeNullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeJsonArray(value: unknown): SiteCrawlSnapshotJsonArray {
  return Array.isArray(value) ? value : [];
}

function normalizeJsonObject(value: unknown): SiteCrawlSnapshotJsonObject {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
