import type { SiteHtmlImageCandidates } from "./site-html-image-candidates";

export type SiteCrawlSnapshotSourceType = "manual_html" | "crawler";

export type SiteCrawlSnapshotHtmlInputType =
  | "source_html"
  | "rendered_html"
  | "unknown";

export type SiteCrawlSnapshotStatus =
  | "draft"
  | "extracted"
  | "ai_generated"
  | "approved"
  | "rejected";

export type SiteCrawlSnapshotJsonArray = unknown[];
export type SiteCrawlSnapshotJsonObject = Record<string, unknown>;

export type SiteCrawlSnapshotRow = {
  id: string;
  site_id: string;
  source_type: SiteCrawlSnapshotSourceType;
  html_input_type: SiteCrawlSnapshotHtmlInputType;
  source_url: string | null;
  final_url: string | null;
  domain: string | null;
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
  image_candidates_json: SiteHtmlImageCandidates;
  favicon_candidates_json: SiteCrawlSnapshotJsonArray;
  logo_candidates_json: SiteCrawlSnapshotJsonArray;
  promotional_flags_json: SiteCrawlSnapshotJsonObject;
  excluded_terms_json: SiteCrawlSnapshotJsonArray;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  favicon_url: string | null;
  logo_url: string | null;
  html_sha256: string | null;
  visible_text_sha256: string | null;
  raw_html_storage_path: string | null;
  snapshot_status: SiteCrawlSnapshotStatus;
  ai_detail_description_md: string | null;
  ai_observation_summary_json: SiteCrawlSnapshotJsonObject;
  collected_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicSiteCrawlSnapshotRow = Pick<
  SiteCrawlSnapshotRow,
  | "id"
  | "site_id"
  | "source_type"
  | "html_input_type"
  | "source_url"
  | "final_url"
  | "domain"
  | "page_title"
  | "meta_description"
  | "h1"
  | "observed_menu_labels"
  | "observed_account_features"
  | "observed_betting_features"
  | "observed_payment_flags"
  | "observed_notice_items"
  | "observed_event_items"
  | "observed_footer_text"
  | "observed_badges"
  | "screenshot_url"
  | "screenshot_thumb_url"
  | "favicon_url"
  | "logo_url"
  | "ai_detail_description_md"
  | "ai_observation_summary_json"
  | "collected_at"
  | "created_at"
  | "updated_at"
>;

export type SiteCrawlSnapshotSiteColumns = {
  latest_crawl_snapshot_id?: string | null;
  content_crawled_at?: string | null;
  description_source_snapshot_id?: string | null;
  description_generated_at?: string | null;
};
