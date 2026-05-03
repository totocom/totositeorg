import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import { getPublicDnsInfo, type PublicDnsInfo } from "@/app/data/domain-dns";
import {
  extractDomain,
  getWhoisInfoForDomain,
  type PublicWhoisInfo,
} from "@/app/data/domain-whois";
import {
  appendBlogVerificationMarkdown,
  buildBlogVerificationSummary,
  type BlogVerificationSummary,
} from "@/app/data/blog-verification";
import {
  getPreferredBlogSlug,
  resolveBlogDraftTarget,
} from "@/app/data/blog-draft-target";
import {
  aiGenerationJobStaleAfterMs,
  isActiveAiGenerationJobStale,
} from "@/app/data/ai-generation-job-status";
import {
  getRequiredBlogReportHeadings,
  validateRequiredBlogReportSectionCoverage,
} from "@/app/data/blog-report-sections";
import {
  blogSourceCrawlSnapshotSelect,
  getBlogSourceCrawlSnapshotJson,
  toBlogSourceCrawlSnapshot,
  type BlogSourceCrawlSnapshot,
  type BlogSourceCrawlSnapshotRow,
} from "@/app/data/blog-source-crawl-snapshot";
import { selectBlogVisualImages } from "@/app/data/blog-visuals";
import type { SiteCrawlSnapshotSiteColumns } from "@/app/data/site-crawl-snapshots";
import {
  blogCategorySlugs,
  getBlogCategoryLabel,
  getBlogTagSlug,
  isBlogCategoryValue,
  type BlogDuplicateRisk,
  type BlogCategorySlug,
  type BlogSeoReviewStatus,
} from "@/app/data/blog-posts";
import {
  getPlacementInternalAnchorText,
  normalizeInternalLinkAnchorTexts,
  reviewBlogDuplicateRisk,
  validateBlogSeoDraft,
  type BlogRenderedInternalAnchorInput,
  type BlogDuplicateComparisonPost,
  type BlogDuplicateRiskReview,
  type InternalAnchorPlacement,
} from "@/app/data/blog-seo-review";
import { calculateSiteTrustScore } from "@/app/data/sites";
import {
  BLOG_PROMPT_VERSION,
  OPENAI_PLANNER_SYSTEM_PROMPT,
  buildOpenAiPlannerPrompt,
} from "@/prompts/blog/openai-planner-v1";
import {
  CLAUDE_WRITER_SYSTEM_PROMPT,
  buildClaudeWriterPrompt,
} from "@/prompts/blog/claude-writer-v1";
import {
  OPENAI_VALIDATOR_REPAIR_SYSTEM_PROMPT,
  OPENAI_VALIDATOR_SYSTEM_PROMPT,
  buildOpenAiValidatorPrompt,
} from "@/prompts/blog/openai-validator-v1";

export const runtime = "nodejs";
export const maxDuration = 900;

type BlogPriority = "상" | "중" | "하";

type SiteRow = SiteCrawlSnapshotSiteColumns & {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  url: string;
  domains: string[] | null;
  logo_url: string | null;
  favicon_url: string | null;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  status: string;
  description: string;
  resolved_ips: string[] | null;
  dns_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewDbRow = {
  site_id: string;
  rating: number | null;
  title: string | null;
  experience: string;
  status: "approved";
  created_at: string;
};

type ScamReportDbRow = {
  site_id: string;
  incident_date: string | null;
  main_category: string | null;
  damage_amount: number | null;
  damage_amount_unknown: boolean;
  situation_description: string;
  review_status: "approved";
  is_published: boolean;
  created_at: string;
  approved_at: string | null;
};

type SiteDomainSubmissionDbRow = {
  site_id: string;
  domain_url: string;
  status: "approved";
  reviewed_at: string | null;
  created_at: string;
};

type SiteDnsRecordDbRow = {
  site_id: string;
  domain: string;
  a_records: string[] | null;
  aaaa_records: string[] | null;
  cname_records: string[] | null;
  mx_records: string[] | null;
  ns_records: string[] | null;
  txt_records: string[] | null;
  soa_record: string | null;
  checked_at: string;
};

type DomainWhoisCacheDbRow = {
  domain: string;
  payload: unknown;
  fetched_at: string;
};

type DomainLookupStatus = {
  domain: string;
  display_domain?: string;
  lookup_status: "success" | "failed";
  error_message?: string;
  last_successful_checked_at?: string;
  current_attempted_at: string;
};

type SameIpSiteRow = {
  id: string;
  slug: string;
  name: string;
  url: string;
  resolved_ips: string[] | null;
};

type ExistingBlogRow = {
  id: string;
  site_id: string | null;
  source_site_id: string | null;
  slug: string;
  status: string;
  title: string | null;
  body_md: string | null;
  source_snapshot_id: string | null;
  source_snapshot: unknown;
  updated_at: string | null;
};

type DuplicateComparisonBlogRow = {
  id: string;
  slug: string | null;
  title: string | null;
  body_md: string | null;
  sections: unknown;
  source_snapshot: unknown;
  primary_category: BlogCategorySlug | null;
  category: string | null;
  normalized_title_pattern: string | null;
  normalized_h2_pattern: string | null;
  unique_fact_score: number | null;
  published_at: string | null;
  updated_at: string | null;
};

type BlogPostRow = {
  id: string;
  site_id: string | null;
  slug: string;
  status: "draft" | "published" | "archived";
  legal_review_status: "not_reviewed" | "needs_review" | "approved";
  admin_warnings: string[] | null;
  category: string;
  primary_category_id: string | null;
  primary_category: BlogCategorySlug | null;
  secondary_categories: BlogCategorySlug[] | null;
  tags: string[] | null;
  priority: BlogPriority;
  title: string;
  h1: string | null;
  meta_title: string | null;
  meta_description: string | null;
  description: string;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  body_md: string;
  faq_json: unknown;
  checklist_json: unknown;
  source_snapshot_id: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  prompt_version: string | null;
  reviewed_by: string | null;
  seo_review_status: BlogSeoReviewStatus;
  duplicate_risk: BlogDuplicateRisk;
  unique_fact_score: number | null;
  content_angle: string | null;
  normalized_title_pattern: string | null;
  normalized_h2_pattern: string | null;
  search_intent: string | null;
  reader_question: string | null;
  recommended_title_pattern: string | null;
  summary: string | null;
  published_at: string | null;
  content_updated_at: string | null;
  reading_minutes: number | null;
  internal_links: unknown;
  sections: unknown;
  checklist: string[] | null;
  faqs: unknown;
  created_at: string;
  updated_at: string;
};

type BlogPostVersionRow = {
  id: string;
  post_id: string;
  version_no: number;
  created_at: string;
};

type AiGenerationJobRow = {
  id: string;
  site_id: string;
  post_id: string | null;
  job_type: "create" | "update" | "validate";
  status: "queued" | "running" | "succeeded" | "failed";
  provider: "openai" | "anthropic" | "mixed";
  source_snapshot_id: string | null;
  idempotency_key: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

type SnapshotSite = {
  id: string;
  name: string;
  slug: string;
  url: string;
  display_url: string;
  domain: string;
  display_domain: string;
  description: string | null;
  description_source_snapshot_id: string | null;
  description_generated_at: string | null;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  screenshots: string[] | null;
  logo_url: string | null;
  favicon_url: string | null;
  trust_score: number | null;
  resolved_ips: string[] | null;
  dns_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

type SnapshotDnsRecord = {
  site_id: string;
  domain: string;
  display_domain: string;
  record_type: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SOA";
  value: string;
  ttl: number | null;
  checked_at: string;
};

type SnapshotWhoisRecord = {
  domain: string;
  display_domain: string;
  registrar: string | null;
  privacy_protected: boolean | null;
  created_date: string | null;
  updated_date: string | null;
  expiration_date: string | null;
  name_servers: string[] | null;
  checked_at: string;
};

type SnapshotReview = {
  site_id: string;
  rating: number | null;
  title: string | null;
  content: string;
  status: "approved";
  is_public: boolean;
  created_at: string;
  approved_at: string | null;
};

type SnapshotScamReport = {
  site_id: string;
  incident_type: string | null;
  incident_date: string | null;
  content: string;
  amount: number | null;
  amount_unknown: boolean;
  status: "approved";
  is_public: boolean;
  created_at: string;
  approved_at: string | null;
};

type SnapshotDomainSubmission = {
  site_id: string;
  domain: string;
  status: "approved";
  submitted_at: string;
  approved_at: string | null;
};

type SnapshotDomain = {
  domain: string;
  display_domain: string;
  url: string;
  display_url: string;
  source: "primary" | "registered" | "approved_submission";
  status: "approved";
  submitted_at: string | null;
  approved_at: string | null;
};

type RedactedReviewSample = {
  rating: number | null;
  title: string | null;
  content: string;
  created_at: string;
  approved_at: string | null;
};

type RedactedScamReportSample = {
  incident_type: string | null;
  incident_date: string | null;
  content: string;
  amount: number | null;
  amount_unknown: boolean;
  created_at: string;
  approved_at: string | null;
};

type ReviewsSummary = {
  approved_review_count: number;
  average_rating: number | null;
  latest_review_at: string | null;
  review_sentiment_summary: string | null;
  sample_reviews_redacted: RedactedReviewSample[];
};

type ScamReportsSummary = {
  approved_public_report_count: number;
  total_reported_amount: number | null;
  latest_report_at: string | null;
  sample_reports_redacted: RedactedScamReportSample[];
};

type DerivedFacts = {
  primary_domain: string;
  primary_domain_display: string;
  additional_domains: string[];
  additional_domains_display: string[];
  resolved_ips: string[];
  name_servers: string[];
  has_whois_privacy: boolean | null;
  domain_created_date: string | null;
  domain_updated_date: string | null;
  domain_expiration_date: string | null;
  dns_last_checked_at: string | null;
  whois_last_checked_at: string | null;
  dns_lookup_statuses: DomainLookupStatus[];
  whois_lookup_statuses: DomainLookupStatus[];
};

type MinimumPublishCheck = {
  can_generate_draft: boolean;
  needs_more_data: boolean;
  automatic_publish_blocked: boolean;
  warning: string | null;
  reasons: string[];
  reviews_count: number;
  scam_reports_count: number;
  dns_records_count: number;
  has_whois_created_date: boolean;
};

type SeoTitleSignals = {
  site_name: string;
  approved_review_count: number;
  approved_public_scam_report_count: number;
  additional_domain_count: number;
  resolved_ip_count: number;
  has_whois_created_date: boolean;
  has_whois_privacy: boolean | null;
  name_server_count: number;
  dns_record_types: string[];
  latest_review_at: string | null;
  latest_scam_report_at: string | null;
  dns_last_checked_at: string | null;
  whois_last_checked_at: string | null;
};

type SourceSnapshot = {
  source_snapshot_id?: string;
  snapshot_at?: string;
  generatedAt: string;
  site: SnapshotSite;
  site_detail_path: string;
  crawl_snapshot: BlogSourceCrawlSnapshot | null;
  domains: SnapshotDomain[];
  dns_records: SnapshotDnsRecord[];
  whois: SnapshotWhoisRecord[];
  reviews_summary: ReviewsSummary;
  scam_reports_summary: ScamReportsSummary;
  derived_facts: DerivedFacts;
  site_specific_verification?: BlogVerificationSummary | null;
  minimum_publish_check?: MinimumPublishCheck;
  seo_title_signals?: SeoTitleSignals;
  sameIpSites: SameIpSiteRow[];
  dataPolicy: string[];
};

type SnapshotChangeSummary = {
  new_reviews_count: number;
  new_scam_reports_count: number;
  dns_changed: boolean;
  whois_changed: boolean;
  crawl_snapshot_changed: boolean;
  previous_crawl_snapshot_id: string | null;
  next_crawl_snapshot_id: string | null;
  new_domains: string[];
  removed_domains: string[];
  new_resolved_ips: string[];
  removed_resolved_ips: string[];
};

type BlogUpdateContext = {
  previousPost: {
    id: string;
    slug: string;
    status: string;
    title: string | null;
    body_md: string | null;
    source_snapshot_id: string | null;
    updated_at: string | null;
  };
  previousSnapshot: SourceSnapshot | null;
  changeSummary: SnapshotChangeSummary;
};

type BlogSourceSnapshotRow = {
  id: string;
  snapshot_at: string;
};

type StoredBlogSourceSnapshotRow = BlogSourceSnapshotRow & {
  site_json: unknown;
  crawl_snapshot_json: unknown;
  domains_json: unknown;
  dns_records_json: unknown;
  whois_json: unknown;
  reviews_summary_json: unknown;
  scam_reports_summary_json: unknown;
  derived_facts_json: unknown;
};

type CategoryStrategy = {
  primary_category_slug: BlogCategorySlug;
  secondary_category_slugs: BlogCategorySlug[];
  tag_slugs: string[];
  reason: string;
};

type SeoPlanningOutput = {
  primary_keyword: string;
  secondary_keywords: string[];
  search_intent: {
    main_intent: string;
    sub_intents: string[];
  };
  recommended_title: string;
  title_candidates: string[];
  title_strategy: {
    selected_pattern:
      | "reviews_and_reports"
      | "domain_count"
      | "whois_dns"
      | "dns_records"
      | "low_data";
    reason: string;
    unique_data_points_used: string[];
    title: string;
    meta_title: string;
    h1: string;
    title_similarity_warning: boolean;
  };
  category_strategy: CategoryStrategy;
  meta_title: string;
  meta_description: string;
  section_plan: Array<{
    heading: string;
    purpose: string;
    must_include_facts: string[];
    must_avoid: string[];
  }>;
  confirmed_facts: string[];
  inferences: string[];
  unknowns: string[];
  claim_map: Array<{
    claim: string;
    claim_type: "confirmed_fact" | "inference" | "unknown";
    source:
      | "sites"
      | "dns"
      | "whois"
      | "reviews"
      | "scam_reports"
      | "domain_submissions"
      | "crawl_snapshot";
    confidence: "high" | "medium" | "low";
  }>;
  writing_brief_for_claude: string;
  risk_warnings: string[];
};

type ClaudeDraftOutput = {
  draft_markdown: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  checklist: Array<{
    item: string;
    reason: string;
  }>;
  editor_notes: string[];
};

type ProhibitedPhraseCheck = {
  contains_recommendation: boolean;
  contains_signup_cta: boolean;
  contains_bonus_or_event_promo: boolean;
  contains_absolute_safety_claim: boolean;
  contains_uncited_claims: boolean;
  contains_access_facilitation: boolean;
};

type DuplicateRiskCheck = {
  title_pattern_reused: boolean;
  h2_pattern_reused: boolean;
  intro_too_similar: boolean;
  faq_too_similar: boolean;
  unique_fact_score: number;
  estimated_duplicate_risk: "low" | "medium" | "high";
  reason: string;
};

type FinalReviewOutput = {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  primary_keyword: string;
  secondary_keywords: string[];
  content_angle: string;
  category_strategy: CategoryStrategy;
  duplicate_risk_check: DuplicateRiskCheck;
  unique_fact_score: number;
  internal_links: Array<{
    href: string;
    label: string;
    placement: InternalAnchorPlacement;
    purpose:
      | "source_detail"
      | "address_domain_detail"
      | "dns_detail"
      | "report_detail"
      | "review_detail";
  }>;
  external_references: Array<{
    url: string;
    label: string;
    reason: string;
    rel: string;
  }>;
  body_md: string;
  faq_json: Array<{
    question: string;
    answer: string;
    risk_level: "low" | "medium" | "high";
  }>;
  checklist_json: Array<{
    item: string;
    reason: string;
  }>;
  summary: {
    confirmed_facts: string[];
    inferences: string[];
    unknowns: string[];
  };
  admin_warnings: string[];
  prohibited_phrase_check: ProhibitedPhraseCheck;
  needs_human_legal_review: boolean;
};

type BlogDraft = {
  slug: string;
  category: string;
  primary_category: BlogCategorySlug;
  secondary_categories: BlogCategorySlug[];
  tags: string[];
  priority: BlogPriority;
  title: string;
  meta_title: string;
  description: string;
  primary_keyword: string;
  secondary_keywords: string[];
  search_intent: string;
  reader_question: string;
  recommended_title_pattern: string;
  summary: string;
  reading_minutes: number;
  internal_links: Array<{
    href: string;
    label: string;
    placement: InternalAnchorPlacement;
    purpose:
      | "source_detail"
      | "address_domain_detail"
      | "dns_detail"
      | "report_detail"
      | "review_detail";
  }>;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets: string[];
  }>;
  checklist: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  safety_notes: string[];
};

type SafetyViolation = {
  pattern: string;
  reason: string;
  sample: string;
};

type BlogFacts = SeoTitleSignals & {
  dns_record_count?: number;
  dns_changed?: boolean;
  whois_changed?: boolean;
  new_domains?: string[];
  new_reviews_count?: number;
  new_scam_reports_count?: number;
};

type TitleQualityReview = {
  normalized_pattern: string;
  same_pattern_count: number;
  uniqueness_score: number;
  title_similarity_warning: boolean;
  warnings: string[];
  requires_legal_review: boolean;
};

const blogPostSelect = [
  "id",
  "site_id",
  "slug",
  "status",
  "legal_review_status",
  "admin_warnings",
  "category",
  "primary_category_id",
  "primary_category",
  "secondary_categories",
  "tags",
  "priority",
  "title",
  "h1",
  "meta_title",
  "meta_description",
  "description",
  "primary_keyword",
  "secondary_keywords",
  "body_md",
  "faq_json",
  "checklist_json",
  "source_snapshot_id",
  "ai_provider",
  "ai_model",
  "prompt_version",
  "reviewed_by",
  "seo_review_status",
  "duplicate_risk",
  "unique_fact_score",
  "content_angle",
  "normalized_title_pattern",
  "normalized_h2_pattern",
  "search_intent",
  "reader_question",
  "recommended_title_pattern",
  "summary",
  "published_at",
  "content_updated_at",
  "reading_minutes",
  "internal_links",
  "sections",
  "checklist",
  "faqs",
  "created_at",
  "updated_at",
].join(", ");

const existingBlogSelect = [
  "id",
  "site_id",
  "source_site_id",
  "slug",
  "status",
  "title",
  "body_md",
  "source_snapshot_id",
  "source_snapshot",
  "updated_at",
].join(", ");

const duplicateComparisonBlogSelect = [
  "id",
  "slug",
  "title",
  "body_md",
  "sections",
  "source_snapshot",
  "primary_category",
  "category",
  "normalized_title_pattern",
  "normalized_h2_pattern",
  "unique_fact_score",
  "published_at",
  "updated_at",
].join(", ");

const piiRedactionVersion = "v1";
const insufficientSourceDataWarning =
  "현재 승인 리뷰, 피해 제보, DNS/WHOIS 정보가 충분하지 않아 본문이 얇아질 수 있습니다. 관리자 검토 후 발행 여부를 결정하세요.";
const insufficientSeoTitleDataWarning =
  "현재 사이트 고유 데이터가 부족해 제목과 본문이 템플릿성 콘텐츠로 보일 수 있습니다. 추가 리뷰, 제보, DNS/WHOIS 데이터 확보 후 발행을 권장합니다.";

const categoryStrategySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "primary_category_slug",
    "secondary_category_slugs",
    "tag_slugs",
    "reason",
  ],
  properties: {
    primary_category_slug: {
      type: "string",
      enum: blogCategorySlugs,
    },
    secondary_category_slugs: {
      type: "array",
      maxItems: 2,
      items: {
        type: "string",
        enum: blogCategorySlugs,
      },
    },
    tag_slugs: { type: "array", items: { type: "string" } },
    reason: { type: "string" },
  },
} as const;

const seoPlanningSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "primary_keyword",
    "secondary_keywords",
    "search_intent",
    "recommended_title",
    "title_candidates",
    "title_strategy",
    "category_strategy",
    "meta_title",
    "meta_description",
    "section_plan",
    "confirmed_facts",
    "inferences",
    "unknowns",
    "claim_map",
    "writing_brief_for_claude",
    "risk_warnings",
  ],
  properties: {
    primary_keyword: { type: "string" },
    secondary_keywords: { type: "array", items: { type: "string" } },
    search_intent: {
      type: "object",
      additionalProperties: false,
      required: ["main_intent", "sub_intents"],
      properties: {
        main_intent: { type: "string" },
        sub_intents: { type: "array", items: { type: "string" } },
      },
    },
    recommended_title: { type: "string" },
    title_candidates: { type: "array", items: { type: "string" } },
    title_strategy: {
      type: "object",
      additionalProperties: false,
      required: [
        "selected_pattern",
        "reason",
        "unique_data_points_used",
        "title",
        "meta_title",
        "h1",
        "title_similarity_warning",
      ],
      properties: {
        selected_pattern: {
          type: "string",
          enum: [
            "reviews_and_reports",
            "domain_count",
            "whois_dns",
            "dns_records",
            "low_data",
          ],
        },
        reason: { type: "string" },
        unique_data_points_used: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "approved_review_count",
              "approved_public_scam_report_count",
              "additional_domain_count",
              "resolved_ip_count",
              "has_whois_created_date",
              "has_whois_privacy",
              "name_server_count",
              "dns_record_types",
              "latest_review_at",
              "latest_scam_report_at",
              "dns_last_checked_at",
              "whois_last_checked_at",
            ],
          },
        },
        title: { type: "string" },
        meta_title: { type: "string" },
        h1: { type: "string" },
        title_similarity_warning: { type: "boolean" },
      },
    },
    category_strategy: categoryStrategySchema,
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    section_plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "purpose", "must_include_facts", "must_avoid"],
        properties: {
          heading: { type: "string" },
          purpose: { type: "string" },
          must_include_facts: { type: "array", items: { type: "string" } },
          must_avoid: { type: "array", items: { type: "string" } },
        },
      },
    },
    confirmed_facts: { type: "array", items: { type: "string" } },
    inferences: { type: "array", items: { type: "string" } },
    unknowns: { type: "array", items: { type: "string" } },
    claim_map: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "claim_type", "source", "confidence"],
        properties: {
          claim: { type: "string" },
          claim_type: {
            type: "string",
            enum: ["confirmed_fact", "inference", "unknown"],
          },
          source: {
            type: "string",
            enum: [
              "sites",
              "dns",
              "whois",
              "reviews",
              "scam_reports",
              "domain_submissions",
              "crawl_snapshot",
            ],
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
        },
      },
    },
    writing_brief_for_claude: { type: "string" },
    risk_warnings: { type: "array", items: { type: "string" } },
  },
} as const;

const finalReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "slug",
    "meta_title",
    "meta_description",
    "h1",
    "primary_keyword",
    "secondary_keywords",
    "content_angle",
    "category_strategy",
    "duplicate_risk_check",
    "unique_fact_score",
    "internal_links",
    "external_references",
    "body_md",
    "faq_json",
    "checklist_json",
    "summary",
    "admin_warnings",
    "prohibited_phrase_check",
    "needs_human_legal_review",
  ],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    meta_title: { type: "string" },
    meta_description: { type: "string" },
    h1: { type: "string" },
    primary_keyword: { type: "string" },
    secondary_keywords: { type: "array", items: { type: "string" } },
    content_angle: { type: "string" },
    category_strategy: categoryStrategySchema,
    duplicate_risk_check: {
      type: "object",
      additionalProperties: false,
      required: [
        "title_pattern_reused",
        "h2_pattern_reused",
        "intro_too_similar",
        "faq_too_similar",
        "unique_fact_score",
        "estimated_duplicate_risk",
        "reason",
      ],
      properties: {
        title_pattern_reused: { type: "boolean" },
        h2_pattern_reused: { type: "boolean" },
        intro_too_similar: { type: "boolean" },
        faq_too_similar: { type: "boolean" },
        unique_fact_score: { type: "number" },
        estimated_duplicate_risk: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        reason: { type: "string" },
      },
    },
    unique_fact_score: { type: "number" },
    internal_links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["href", "label", "placement", "purpose"],
        properties: {
          href: { type: "string" },
          label: { type: "string" },
          placement: {
            type: "string",
            enum: [
              "summary",
              "address_domain_section",
              "dns_section",
              "reports_section",
              "reviews_section",
              "faq",
            ],
          },
          purpose: {
            type: "string",
            enum: [
              "source_detail",
              "address_domain_detail",
              "dns_detail",
              "report_detail",
              "review_detail",
            ],
          },
        },
      },
    },
    external_references: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "label", "reason", "rel"],
        properties: {
          url: { type: "string" },
          label: { type: "string" },
          reason: { type: "string" },
          rel: { type: "string" },
        },
      },
    },
    body_md: { type: "string" },
    faq_json: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer", "risk_level"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          risk_level: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    checklist_json: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["item", "reason"],
        properties: {
          item: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["confirmed_facts", "inferences", "unknowns"],
      properties: {
        confirmed_facts: { type: "array", items: { type: "string" } },
        inferences: { type: "array", items: { type: "string" } },
        unknowns: { type: "array", items: { type: "string" } },
      },
    },
    admin_warnings: { type: "array", items: { type: "string" } },
    prohibited_phrase_check: {
      type: "object",
      additionalProperties: false,
      required: [
        "contains_recommendation",
        "contains_signup_cta",
        "contains_bonus_or_event_promo",
        "contains_absolute_safety_claim",
        "contains_uncited_claims",
        "contains_access_facilitation",
      ],
      properties: {
        contains_recommendation: { type: "boolean" },
        contains_signup_cta: { type: "boolean" },
        contains_bonus_or_event_promo: { type: "boolean" },
        contains_absolute_safety_claim: { type: "boolean" },
        contains_uncited_claims: { type: "boolean" },
        contains_access_facilitation: { type: "boolean" },
      },
    },
    needs_human_legal_review: { type: "boolean" },
  },
} as const;

const prohibitedPhrases = [
  "추천",
  "강력 추천",
  "안전놀이터",
  "검증 완료",
  "먹튀 없음",
  "먹튀 없는",
  "100% 안전",
  "가입하세요",
  "가입하기",
  "지금 가입",
  "첫충",
  "매충",
  "보너스",
  "이벤트",
  "쿠폰",
  "꽁머니",
  "우회주소",
  "최신 접속주소",
  "가입코드",
  "총판",
  "파트너 코드",
] as const;

const riskyPatterns = [
  /먹튀\s*없/i,
  /안전.*사이트/i,
  /검증.*완료/i,
  /가입.*추천/i,
  /이용.*추천/i,
  /보너스.*제공/i,
  /첫충.*혜택/i,
  /우회.*주소/i,
  /최신.*주소/i,
] as const;

const blockedExternalLinkTargetPattern =
  /(?:signup|sign-up|register|join|event|events|promo|promotion|bonus|coupon|deposit|recharge|charge|cashier|payment|topup|top-up|mirror|proxy|bypass|redirect|affiliate|partner|ref=|code=|가입|회원가입|이벤트|보너스|쿠폰|충전|입금|우회|최신|접속주소|가입코드|총판|파트너)/i;

const requiredBlogNoticeLines = [
  "이 글은 특정 사이트의 가입, 이용, 충전, 베팅을 권유하기 위한 글이 아닙니다.",
  "승인된 리뷰, 피해 제보, DNS 및 WHOIS 조회 데이터를 기준으로 작성된 정보 정리입니다.",
  "DNS, WHOIS, IP 정보는 조회 시점에 따라 달라질 수 있으며, 특정 기술 정보만으로 운영 주체나 안전성을 단정할 수 없습니다.",
  "이 글은 수집된 확인 데이터와 내부 승인 데이터를 바탕으로 AI 초안을 생성한 뒤 관리자가 검토하는 방식으로 작성됩니다.",
] as const;

const blogGenerationImplementationPrinciples = [
  "OpenAI는 구조화, SEO 설계, 최종 검수에 사용한다.",
  "Claude는 자연스러운 한국어 본문 작성에 사용한다.",
  "AI 생성 전 DNS/WHOIS를 최신 갱신한다.",
  "생성 시점의 데이터는 blog_source_snapshots에 저장한다.",
  "AI에게 원본 개인정보를 전달하지 않는다.",
  "추천, 홍보, 가입 유도, 보너스, 우회주소 표현을 금지한다.",
  "먹튀 없음 대신 조회 시점 기준 승인된 먹튀 피해 제보는 확인되지 않음으로 표현한다.",
  "Cloudflare, WHOIS 비공개, 동일 IP만으로 위험하다고 단정하지 않는다.",
  "AI 결과는 published가 아니라 draft로 저장한다.",
  "관리자가 검토한 뒤에만 published로 변경한다.",
  "기존 글 업데이트 시 slug를 유지한다.",
  "모든 AI 작업은 ai_generation_jobs에 기록한다.",
  "모든 블로그 버전은 blog_post_versions에 저장한다.",
  "draft와 needs_review 상태는 noindex 처리한다.",
  "published 상태만 sitemap에 포함한다.",
  "AI 블로그 생성 기능에는 대표 카테고리 1개와 선택적 보조 카테고리 0~2개, 태그를 포함한다.",
  "개별 사이트 종합 리포트의 기본 대표 카테고리는 site-reports로 설정한다.",
  "DNS/WHOIS 중심 글은 domain-dns, 먹튀 피해 제보 중심 글은 scam-reports, 이용자 리뷰 중심 글은 user-reviews, 업데이트 글은 change-history를 보조 카테고리로 지정한다.",
  "사이트명은 카테고리가 아니라 태그로 처리한다.",
  "카테고리 페이지는 published 글이 3개 이상일 때만 index 허용하고, 그 전에는 noindex, follow로 처리한다.",
  "블로그 글에는 Home > Blog > Category > Post 형태의 breadcrumb와 BreadcrumbList JSON-LD를 추가한다.",
] as const;

const forbiddenPatterns: Array<{ pattern: RegExp; label: string; reason: string }> = [
  {
    pattern: /추천/g,
    label: "추천",
    reason: "추천 또는 홍보처럼 보일 수 있는 표현입니다.",
  },
  {
    pattern: /가입\s*(?:하세요|하시면|을\s*권장|권장|유도|추천)/g,
    label: "가입 유도",
    reason: "가입 유도 문장입니다.",
  },
  {
    pattern: /(?:안전\s*보장|안전합니다|안전한\s*사이트|100%\s*안전|무조건\s*안전)/g,
    label: "안전 보장",
    reason: "안전성을 단정하는 표현입니다.",
  },
  {
    pattern: /(?:먹튀\s*없음|먹튀\s*없는|먹튀가\s*없다|먹튀가\s*없습니다)/g,
    label: "먹튀 없음 단정",
    reason: "피해 제보 부재를 위험 없음으로 단정합니다.",
  },
  {
    pattern: /(?:검증\s*완료|검증된\s*사이트|신뢰할\s*수\s*있는\s*사이트)/g,
    label: "검증 완료",
    reason: "검증 완료 또는 신뢰를 보장하는 표현입니다.",
  },
  {
    pattern: /(?:수익\s*보장|고수익|확실한\s*수익|당첨\s*보장)/g,
    label: "수익 보장",
    reason: "도박성 수익을 보장하는 표현입니다.",
  },
  {
    pattern: /(?:보너스|첫충|이벤트\s*혜택|가입\s*혜택)/g,
    label: "혜택 홍보",
    reason: "가입 또는 이용 혜택 홍보 표현입니다.",
  },
];

function getEnvString(name: string) {
  return process.env[name]?.trim() ?? "";
}

class AiProviderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderTimeoutError";
  }
}

function isAiProviderTimeoutError(error: unknown) {
  return error instanceof AiProviderTimeoutError;
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = getEnvString(name);

  if (!rawValue) return fallback;

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    throw new Error(`${name} 환경변수는 1 이상의 정수여야 합니다.`);
  }

  return parsedValue;
}

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    openaiApiKey: getEnvString("OPENAI_API_KEY"),
    anthropicApiKey: getEnvString("ANTHROPIC_API_KEY"),
    openaiPlannerModel: getEnvString("OPENAI_BLOG_PLANNER_MODEL"),
    openaiValidatorModel: getEnvString("OPENAI_BLOG_VALIDATOR_MODEL"),
    anthropicModel: getEnvString("ANTHROPIC_BLOG_WRITER_MODEL"),
    blogPromptVersion: getEnvString("BLOG_PROMPT_VERSION") || BLOG_PROMPT_VERSION,
    blogGenerationMaxReviews: getPositiveIntegerEnv(
      "BLOG_GENERATION_MAX_REVIEWS",
      20,
    ),
    blogGenerationMaxScamReports: getPositiveIntegerEnv(
      "BLOG_GENERATION_MAX_SCAM_REPORTS",
      20,
    ),
    blogAiProviderTimeoutMs: getPositiveIntegerEnv(
      "BLOG_AI_PROVIDER_TIMEOUT_MS",
      12_000,
    ),
    blogAiGenerationDeadlineMs: getPositiveIntegerEnv(
      "BLOG_AI_GENERATION_DEADLINE_MS",
      45_000,
    ),
  };
}

function getBearerToken(request: Request) {
  return (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function getAuthedClient(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getEnv();
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getAdminSession(token: string) {
  const supabase = getAuthedClient(token);
  const { data: userResult, error: userError } =
    await supabase.auth.getUser(token);
  const email = userResult.user?.email?.toLowerCase();

  if (userError || !email || !userResult.user?.id) {
    return null;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (adminError || !adminRow) {
    return null;
  }

  return {
    userId: userResult.user.id,
    email,
  };
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function getDomainTargets(site: SiteRow) {
  return uniqueStrings(site.domains?.length ? site.domains : [site.url]).slice(0, 6);
}

function getRefreshDomainTargets(
  site: SiteRow,
  approvedDomainSubmissions: SiteDomainSubmissionDbRow[],
) {
  const targets = [
    ...getDomainTargets(site),
    ...approvedDomainSubmissions.map((submission) => submission.domain_url),
  ];
  const byDomain = new Map<string, string>();

  for (const target of targets) {
    const trimmedTarget = target.trim();
    if (!trimmedTarget) continue;

    const domain = extractDomain(trimmedTarget) || trimmedTarget;
    if (!byDomain.has(domain)) {
      byDomain.set(domain, trimmedTarget);
    }
  }

  return Array.from(byDomain.values()).slice(0, 30);
}

function getDnsIps(dnsInfo: PublicDnsInfo | null) {
  if (!dnsInfo) return [];
  return uniqueStrings([...dnsInfo.a, ...dnsInfo.aaaa]).sort();
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getSlugBase(site: SiteRow) {
  const candidates = [site.name_en, site.slug, site.name, site.name_ko];
  const slug = candidates.map((value) => normalizeSlug(value ?? "")).find(Boolean);

  return slug || `site-${site.id.slice(0, 8)}`;
}

function getFallbackBlogSlug(site: SiteRow) {
  const base = getSlugBase(site).replace(/-totosite-report$/g, "");
  return `${base}-totosite-report`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractOpenAiOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as Record<string, unknown>;

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = response.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];

      return content.map((part) => {
        if (!part || typeof part !== "object") return "";
        const record = part as Record<string, unknown>;
        return typeof record.text === "string" ? record.text : "";
      });
    })
    .join("\n")
    .trim();
}

function extractJsonObjectText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate;
  }

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }

  return "";
}

function getProviderError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }

  const error = (payload as { error: unknown }).error;
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : null;
}

function getProviderErrorString(
  error: Record<string, unknown> | null,
  key: string,
) {
  const value = error?.[key];
  return typeof value === "string" ? value : "";
}

function getOpenAiErrorMessage(payload: unknown) {
  const error = getProviderError(payload);
  const code = getProviderErrorString(error, "code");
  const type = getProviderErrorString(error, "type");
  const message = getProviderErrorString(error, "message");

  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return "OpenAI API 할당량이 부족합니다(insufficient_quota). OpenAI Platform의 Billing/Usage에서 결제 수단, 프로젝트 예산, 크레딧 또는 월 사용 한도를 확인해주세요.";
  }

  if (code === "invalid_api_key" || type === "invalid_request_error") {
    return message
      ? `OpenAI API 설정을 확인해주세요: ${message}`
      : "OpenAI API 설정을 확인해주세요.";
  }

  return message
    ? `OpenAI API 요청에 실패했습니다: ${message}`
    : "OpenAI API 요청에 실패했습니다.";
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderTimeoutError(
        `${label} 응답이 ${Math.round(timeoutMs / 1000)}초 안에 완료되지 않아 검토용 fallback 초안으로 전환합니다.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiJson<T>({
  apiKey,
  model,
  schemaName,
  schema,
  system,
  user,
  timeoutMs,
}: {
  apiKey: string;
  model: string;
  schemaName: string;
  schema: unknown;
  system: string;
  user: string;
  timeoutMs: number;
}): Promise<T> {
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: system }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: user }],
          },
        ],
        max_output_tokens: 8_000,
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    },
    timeoutMs,
    "OpenAI",
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getOpenAiErrorMessage(payload));
  }

  const outputText = extractOpenAiOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI 응답에서 JSON 텍스트를 찾지 못했습니다.");
  }

  return JSON.parse(outputText) as T;
}

async function callClaudeText({
  apiKey,
  model,
  system,
  user,
  timeoutMs,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  timeoutMs: number;
}) {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8_000,
        system,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: user }],
          },
        ],
      }),
    },
    timeoutMs,
    "Claude",
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as { error: unknown }).error)
        : "Claude API 요청에 실패했습니다.";
    throw new Error(message);
  }

  const content = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).content
    : null;

  if (!Array.isArray(content)) {
    throw new Error("Claude 응답 본문을 읽지 못했습니다.");
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return typeof record.text === "string" ? record.text : "";
    })
    .join("\n")
    .trim();
}

async function callClaudeJson<T>({
  apiKey,
  model,
  system,
  user,
  timeoutMs,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  timeoutMs: number;
}) {
  const outputText = await callClaudeText({
    apiKey,
    model,
    system,
    user,
    timeoutMs,
  });
  const jsonText = extractJsonObjectText(outputText);

  if (!jsonText) {
    throw new Error("Claude 응답에서 JSON 객체를 찾지 못했습니다.");
  }

  return JSON.parse(jsonText) as T;
}

function hasDnsRecord(row: SiteDnsRecordDbRow) {
  return (
    Boolean(row.a_records?.length) ||
    Boolean(row.aaaa_records?.length) ||
    Boolean(row.cname_records?.length) ||
    Boolean(row.mx_records?.length) ||
    Boolean(row.ns_records?.length) ||
    Boolean(row.txt_records?.length) ||
    Boolean(toNullableString(row.soa_record))
  );
}

async function getApprovedDomainSubmissionRows(
  supabase: SupabaseClient,
  siteId: string,
) {
  const { data, error } = await supabase
    .from("site_domain_submissions")
    .select("site_id, domain_url, status, reviewed_at, created_at")
    .eq("site_id", siteId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error("승인된 추가 도메인 목록을 불러오지 못했습니다.");
  }

  return (data ?? []) as SiteDomainSubmissionDbRow[];
}

async function refreshDnsRecords({
  supabase,
  site,
  domainTargets,
}: {
  supabase: SupabaseClient;
  site: SiteRow;
  domainTargets: string[];
}): Promise<{ resolvedIps: string[]; lookupStatuses: DomainLookupStatus[] }> {
  const checkedAt = new Date().toISOString();
  const previousResult = await supabase
    .from("site_dns_records")
    .select(
      "site_id, domain, a_records, aaaa_records, cname_records, mx_records, ns_records, txt_records, soa_record, checked_at",
    )
    .eq("site_id", site.id);

  if (previousResult.error) {
    throw new Error("기존 DNS 조회 이력을 불러오지 못했습니다.");
  }

  const previousSuccessfulChecks = new Map<string, string>();
  for (const row of (previousResult.data ?? []) as SiteDnsRecordDbRow[]) {
    if (!hasDnsRecord(row)) continue;

    const existingCheckedAt = previousSuccessfulChecks.get(row.domain);
    if (!existingCheckedAt || row.checked_at > existingCheckedAt) {
      previousSuccessfulChecks.set(row.domain, row.checked_at);
    }
  }

  const dnsLookups = await Promise.all(
    domainTargets.map(async (domainUrl) => {
      try {
        return {
          domainUrl,
          dnsInfo: await getPublicDnsInfo(domainUrl),
          thrownError: "",
        };
      } catch (error) {
        return {
          domainUrl,
          dnsInfo: null,
          thrownError:
            error instanceof Error
              ? error.message
              : "DNS 조회 중 알 수 없는 오류가 발생했습니다.",
        };
      }
    }),
  );

  const rows = dnsLookups.map(({ domainUrl, dnsInfo, thrownError }) => {
    const domain = dnsInfo?.domain ?? extractDomain(domainUrl) ?? domainUrl;
    const errorMessage =
      thrownError ||
      dnsInfo?.errorMessage ||
      (dnsInfo ? "" : "도메인 형식 또는 DNS 응답을 확인하지 못했습니다.");

    return {
      site_id: site.id,
      domain_url: domainUrl,
      domain,
      a_records: dnsInfo?.a ?? [],
      aaaa_records: dnsInfo?.aaaa ?? [],
      cname_records: dnsInfo?.cname ?? [],
      mx_records: dnsInfo?.mx ?? [],
      ns_records: dnsInfo?.ns ?? [],
      txt_records: dnsInfo?.txt ?? [],
      soa_record: dnsInfo?.soa ?? "",
      error_message: errorMessage,
      checked_at: checkedAt,
    };
  });
  const lookupStatuses: DomainLookupStatus[] = rows.map((row) => {
    const lookupFailed = Boolean(row.error_message);
    const lastSuccessfulCheckedAt = lookupFailed
      ? previousSuccessfulChecks.get(row.domain)
      : row.checked_at;

    return {
      domain: row.domain,
      lookup_status: lookupFailed ? "failed" : "success",
      ...(lookupFailed ? { error_message: row.error_message } : {}),
      ...(lastSuccessfulCheckedAt
        ? { last_successful_checked_at: lastSuccessfulCheckedAt }
        : {}),
      current_attempted_at: checkedAt,
    };
  });

  const resolvedIps = uniqueStrings(
    dnsLookups.flatMap((record) => getDnsIps(record.dnsInfo)),
  ).sort();

  const deleteResult = await supabase
    .from("site_dns_records")
    .delete()
    .eq("site_id", site.id);

  if (deleteResult.error) {
    throw new Error("기존 DNS 정보를 정리하지 못했습니다.");
  }

  if (rows.length > 0) {
    const insertResult = await supabase.from("site_dns_records").insert(rows);

    if (insertResult.error) {
      throw new Error("DNS 정보를 저장하지 못했습니다.");
    }
  }

  const updateResult = await supabase
    .from("sites")
    .update({
      resolved_ips: resolvedIps,
      dns_checked_at: checkedAt,
    })
    .eq("id", site.id);

  if (updateResult.error) {
    throw new Error("사이트 DNS 요약 정보를 저장하지 못했습니다.");
  }

  return { resolvedIps, lookupStatuses };
}

function isSuccessfulWhoisPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;

  return !getPayloadString(payload as Record<string, unknown>, "errorMessage", "error");
}

function normalizeWhoisCacheDomain(value: string) {
  return extractDomain(value);
}

async function refreshWhoisRecords({
  supabase,
  domainTargets,
}: {
  supabase: SupabaseClient;
  domainTargets: string[];
}): Promise<{ lookupStatuses: DomainLookupStatus[] }> {
  const attemptedAt = new Date().toISOString();
  const domains = uniqueStrings(domainTargets.map(normalizeWhoisCacheDomain));
  const previousResult =
    domains.length > 0
      ? await supabase
          .from("domain_whois_cache")
          .select("domain, payload, fetched_at")
          .in("domain", domains)
      : { data: [], error: null };

  if (previousResult.error) {
    throw new Error(
      `기존 WHOIS 캐시를 불러오지 못했습니다: ${previousResult.error.message}`,
    );
  }

  const previousSuccessfulChecks = new Map<string, string>();
  for (const row of (previousResult.data ?? []) as DomainWhoisCacheDbRow[]) {
    if (!isSuccessfulWhoisPayload(row.payload)) continue;

    const existingCheckedAt = previousSuccessfulChecks.get(row.domain);
    if (!existingCheckedAt || row.fetched_at > existingCheckedAt) {
      previousSuccessfulChecks.set(row.domain, row.fetched_at);
    }
  }

  const whoisRecords = await Promise.all(
    domains.map(async (domain) => {
      try {
        const record = await getWhoisInfoForDomain(domain, { bypassCache: true });

        return {
          ...record,
          domain: normalizeWhoisCacheDomain(record.domain) || domain,
        };
      } catch (error) {
        return {
          domain,
          registrar: "",
          whoisServer: "",
          updatedDate: "",
          creationDate: "",
          expirationDate: "",
          nameServers: [],
          dnssec: "",
          registrantName: "",
          registrantEmail: "",
          registrantOrganization: "",
          errorMessage:
            error instanceof Error
              ? error.message
              : "WHOIS 정보를 조회하지 못했습니다.",
        } satisfies PublicWhoisInfo;
      }
    }),
  );

  const successfulRows = whoisRecords
    .filter((record) => !record.errorMessage)
    .map((record) => {
      const domain = normalizeWhoisCacheDomain(record.domain);

      return domain
        ? {
            domain,
            payload: {
              ...record,
              domain,
            },
            fetched_at: attemptedAt,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (successfulRows.length > 0) {
    const upsertResult = await supabase
      .from("domain_whois_cache")
      .upsert(successfulRows, { onConflict: "domain" });

    if (upsertResult.error) {
      throw new Error(
        `WHOIS 캐시를 갱신하지 못했습니다: ${upsertResult.error.message}`,
      );
    }
  }

  return {
    lookupStatuses: whoisRecords.map((record) => {
      const lookupFailed = Boolean(record.errorMessage);
      const lastSuccessfulCheckedAt = lookupFailed
        ? previousSuccessfulChecks.get(record.domain)
        : attemptedAt;

      return {
        domain: record.domain,
        display_domain: formatDisplayDomain(record.domain),
        lookup_status: lookupFailed ? "failed" : "success",
        ...(lookupFailed ? { error_message: record.errorMessage } : {}),
        ...(lastSuccessfulCheckedAt
          ? { last_successful_checked_at: lastSuccessfulCheckedAt }
          : {}),
        current_attempted_at: attemptedAt,
      };
    }),
  };
}

async function findExistingBlogBySource(
  supabase: SupabaseClient,
  siteId: string,
) {
  const bySite = await supabase
    .from("blog_posts")
    .select(existingBlogSelect)
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (!bySite.error && bySite.data?.[0]) {
    return bySite.data[0] as unknown as ExistingBlogRow;
  }

  const byLegacySource = await supabase
    .from("blog_posts")
    .select(existingBlogSelect)
    .eq("source_site_id", siteId)
    .maybeSingle<ExistingBlogRow>();

  if (byLegacySource.error) {
    throw new Error(
      "blog_posts.site_id 또는 source_site_id 컬럼을 확인하지 못했습니다. supabase/schema.sql을 먼저 적용해주세요.",
    );
  }

  return byLegacySource.data ?? null;
}

async function findPublishedBlogBySource(
  supabase: SupabaseClient,
  siteId: string,
) {
  const bySite = await supabase
    .from("blog_posts")
    .select(existingBlogSelect)
    .eq("site_id", siteId)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  if (!bySite.error && bySite.data?.[0]) {
    return bySite.data[0] as unknown as ExistingBlogRow;
  }

  const byLegacySource = await supabase
    .from("blog_posts")
    .select(existingBlogSelect)
    .eq("source_site_id", siteId)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1);

  if (byLegacySource.error) {
    throw new Error(
      "site_id 기준 published 블로그 글을 확인하지 못했습니다. supabase/schema.sql을 먼저 적용해주세요.",
    );
  }

  return byLegacySource.data?.[0]
    ? (byLegacySource.data[0] as unknown as ExistingBlogRow)
    : null;
}

async function findExistingBlogBySlug(
  supabase: SupabaseClient,
  slug: string,
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(existingBlogSelect)
    .eq("slug", slug)
    .maybeSingle<ExistingBlogRow>();

  if (error) {
    throw new Error("기존 블로그 글을 확인하지 못했습니다.");
  }

  return data ?? null;
}

function blogBelongsToSite(blog: ExistingBlogRow, siteId: string) {
  return blog.site_id === siteId || blog.source_site_id === siteId;
}

async function getAvailableBlogSlug(
  supabase: SupabaseClient,
  preferredSlug: string,
) {
  const slugBase = normalizeSlug(preferredSlug) || `blog-${randomUUID().slice(0, 8)}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? slugBase : `${slugBase}-${attempt + 1}`;
    const existingBlog = await findExistingBlogBySlug(supabase, slug);

    if (!existingBlog) return slug;
  }

  return `${slugBase}-${randomUUID().slice(0, 8)}`;
}

async function getBlogCategoryIdBySlug(
  supabase: SupabaseClient,
  slug: BlogCategorySlug,
) {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(
      `블로그 카테고리 ID를 조회하지 못했습니다. supabase/schema.sql 적용 여부를 확인해주세요: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error(`블로그 카테고리가 없습니다: ${slug}`);
  }

  return data.id;
}

async function getNextBlogPostVersionNo(
  supabase: SupabaseClient,
  postId: string,
) {
  const { data, error } = await supabase
    .from("blog_post_versions")
    .select("version_no")
    .eq("post_id", postId)
    .order("version_no", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      "blog_post_versions 테이블을 확인하지 못했습니다. supabase/schema.sql을 먼저 적용해주세요.",
    );
  }

  const latestVersionNo =
    Array.isArray(data) && typeof data[0]?.version_no === "number"
      ? data[0].version_no
      : 0;

  return latestVersionNo + 1;
}

function buildVersionChangeSummary({
  isUpdate,
  snapshot,
  finalDraft,
  updateContext,
}: {
  isUpdate: boolean;
  snapshot: SourceSnapshot;
  finalDraft: BlogDraft;
  updateContext?: BlogUpdateContext | null;
}) {
  const summary = finalDraft.summary.trim();
  const prefix = isUpdate
    ? "AI 블로그 업데이트 초안 생성"
    : "AI 블로그 최초 초안 생성";
  const snapshotAt = snapshot.snapshot_at ?? snapshot.generatedAt;
  const changeLines = updateContext
    ? formatSnapshotChangeSummary(updateContext.changeSummary)
    : [];

  return uniqueStrings([
    `${prefix}: ${snapshotAt} 기준 source snapshot 반영${
      snapshot.crawl_snapshot ? " / site_crawl_snapshot 반영" : ""
    }`,
    ...changeLines,
    summary,
  ]).join("\n");
}

function normalizeComparableValues(values: Array<string | null | undefined>) {
  return uniqueStrings(values.map((value) => value?.toLowerCase())).sort();
}

function diffStringArrays(previousValues: string[], nextValues: string[]) {
  const previousSet = new Set(previousValues);
  const nextSet = new Set(nextValues);

  return {
    added: nextValues.filter((value) => !previousSet.has(value)),
    removed: previousValues.filter((value) => !nextSet.has(value)),
  };
}

function getDnsFingerprint(snapshot: SourceSnapshot) {
  return normalizeComparableValues(
    snapshot.dns_records.map(
      (record) => `${record.domain}|${record.record_type}|${record.value}`,
    ),
  );
}

function getWhoisFingerprint(snapshot: SourceSnapshot) {
  return normalizeComparableValues(
    snapshot.whois.map((record) =>
      [
        record.domain,
        record.registrar,
        record.privacy_protected === null
          ? "unknown"
          : String(record.privacy_protected),
        record.created_date,
        record.updated_date,
        record.expiration_date,
        ...(record.name_servers ?? []),
      ].join("|"),
    ),
  );
}

function compareSourceSnapshots(
  previousSnapshot: SourceSnapshot | null,
  nextSnapshot: SourceSnapshot,
): SnapshotChangeSummary {
  const previousDomains = previousSnapshot
    ? normalizeComparableValues(previousSnapshot.domains.map((domain) => domain.domain))
    : [];
  const nextDomains = normalizeComparableValues(
    nextSnapshot.domains.map((domain) => domain.domain),
  );
  const domainDiff = diffStringArrays(previousDomains, nextDomains);
  const previousIps = previousSnapshot
    ? normalizeComparableValues(previousSnapshot.derived_facts.resolved_ips)
    : [];
  const nextIps = normalizeComparableValues(nextSnapshot.derived_facts.resolved_ips);
  const ipDiff = diffStringArrays(previousIps, nextIps);
  const previousReviewCount =
    previousSnapshot?.reviews_summary.approved_review_count ?? 0;
  const previousScamReportCount =
    previousSnapshot?.scam_reports_summary.approved_public_report_count ?? 0;
  const dnsDiff = previousSnapshot
    ? diffStringArrays(getDnsFingerprint(previousSnapshot), getDnsFingerprint(nextSnapshot))
    : { added: getDnsFingerprint(nextSnapshot), removed: [] };
  const whoisDiff = previousSnapshot
    ? diffStringArrays(
        getWhoisFingerprint(previousSnapshot),
        getWhoisFingerprint(nextSnapshot),
      )
    : { added: getWhoisFingerprint(nextSnapshot), removed: [] };
  const previousCrawlSnapshotId = previousSnapshot?.crawl_snapshot?.id ?? null;
  const nextCrawlSnapshotId = nextSnapshot.crawl_snapshot?.id ?? null;

  return {
    new_reviews_count: Math.max(
      0,
      nextSnapshot.reviews_summary.approved_review_count - previousReviewCount,
    ),
    new_scam_reports_count: Math.max(
      0,
      nextSnapshot.scam_reports_summary.approved_public_report_count -
        previousScamReportCount,
    ),
    dns_changed: dnsDiff.added.length > 0 || dnsDiff.removed.length > 0,
    whois_changed: whoisDiff.added.length > 0 || whoisDiff.removed.length > 0,
    crawl_snapshot_changed:
      Boolean(nextCrawlSnapshotId) &&
      previousCrawlSnapshotId !== nextCrawlSnapshotId,
    previous_crawl_snapshot_id: previousCrawlSnapshotId,
    next_crawl_snapshot_id: nextCrawlSnapshotId,
    new_domains: domainDiff.added,
    removed_domains: domainDiff.removed,
    new_resolved_ips: ipDiff.added,
    removed_resolved_ips: ipDiff.removed,
  };
}

function formatSnapshotChangeSummary(changeSummary: SnapshotChangeSummary) {
  return [
    `새 승인 리뷰 수: ${changeSummary.new_reviews_count}`,
    `새 승인 피해 제보 수: ${changeSummary.new_scam_reports_count}`,
    `DNS 변경 여부: ${changeSummary.dns_changed ? "있음" : "없음"}`,
    `WHOIS 변경 여부: ${changeSummary.whois_changed ? "있음" : "없음"}`,
    `site_crawl_snapshot 반영: ${
      changeSummary.next_crawl_snapshot_id
        ? changeSummary.crawl_snapshot_changed
          ? `변경됨 (${changeSummary.next_crawl_snapshot_id})`
          : `유지 (${changeSummary.next_crawl_snapshot_id})`
        : "없음"
    }`,
    changeSummary.new_domains.length
      ? `추가 도메인: ${changeSummary.new_domains.join(", ")}`
      : "",
    changeSummary.removed_domains.length
      ? `제거 도메인: ${changeSummary.removed_domains.join(", ")}`
      : "",
    changeSummary.new_resolved_ips.length
      ? `추가 IP: ${changeSummary.new_resolved_ips.join(", ")}`
      : "",
    changeSummary.removed_resolved_ips.length
      ? `제거 IP: ${changeSummary.removed_resolved_ips.join(", ")}`
      : "",
  ].filter(Boolean);
}

function getPreviousSnapshotFromBlog(blog: ExistingBlogRow | null) {
  if (!blog || !isRecord(blog.source_snapshot)) {
    return null;
  }

  const snapshot = blog.source_snapshot.snapshot;

  if (!isRecord(snapshot)) {
    return null;
  }

  return snapshot as SourceSnapshot;
}

function sourceSnapshotFromStoredRow(
  row: StoredBlogSourceSnapshotRow | null,
): SourceSnapshot | null {
  if (
    !row ||
    !isRecord(row.site_json) ||
    !Array.isArray(row.domains_json) ||
    !Array.isArray(row.dns_records_json) ||
    !Array.isArray(row.whois_json) ||
    !isRecord(row.reviews_summary_json) ||
    !isRecord(row.scam_reports_summary_json) ||
    !isRecord(row.derived_facts_json)
  ) {
    return null;
  }

  const site = row.site_json as SnapshotSite;

  return {
    source_snapshot_id: row.id,
    snapshot_at: row.snapshot_at,
    generatedAt: row.snapshot_at,
    site,
    site_detail_path: `/sites/${site.slug}`,
    crawl_snapshot: isRecord(row.crawl_snapshot_json)
      ? (row.crawl_snapshot_json as BlogSourceCrawlSnapshot)
      : null,
    domains: row.domains_json as SnapshotDomain[],
    dns_records: row.dns_records_json as SnapshotDnsRecord[],
    whois: row.whois_json as SnapshotWhoisRecord[],
    reviews_summary: row.reviews_summary_json as ReviewsSummary,
    scam_reports_summary: row.scam_reports_summary_json as ScamReportsSummary,
    derived_facts: row.derived_facts_json as DerivedFacts,
    site_specific_verification: buildBlogVerificationSummary({
      site,
      crawl_snapshot: isRecord(row.crawl_snapshot_json)
        ? row.crawl_snapshot_json
        : null,
      domains: row.domains_json,
      dns_records: row.dns_records_json,
      whois: row.whois_json,
      reviews_summary: row.reviews_summary_json,
      scam_reports_summary: row.scam_reports_summary_json,
      derived_facts: row.derived_facts_json,
      snapshot_at: row.snapshot_at,
      generatedAt: row.snapshot_at,
    }),
    seo_title_signals: buildSeoTitleSignals({
      site,
      dnsRecords: row.dns_records_json as SnapshotDnsRecord[],
      reviewsSummary: row.reviews_summary_json as ReviewsSummary,
      scamReportsSummary: row.scam_reports_summary_json as ScamReportsSummary,
      derivedFacts: row.derived_facts_json as DerivedFacts,
    }),
    sameIpSites: [],
    dataPolicy: [
      "기존 blog_source_snapshots 테이블에서 복원한 이전 snapshot이다.",
      "이전 snapshot은 업데이트 diff 계산에만 사용한다.",
      "crawl_snapshot은 조회 시점 기준 공개 HTML 관측 정보이며 이용 권유나 주소 안내 근거로 사용하지 않는다.",
    ],
  };
}

async function getBlogSourceSnapshotById(
  supabase: SupabaseClient,
  sourceSnapshotId: string | null,
) {
  if (!sourceSnapshotId) return null;

  const { data, error } = await supabase
    .from("blog_source_snapshots")
    .select(
      "id, snapshot_at, site_json, crawl_snapshot_json, domains_json, dns_records_json, whois_json, reviews_summary_json, scam_reports_summary_json, derived_facts_json",
    )
    .eq("id", sourceSnapshotId)
    .maybeSingle<StoredBlogSourceSnapshotRow>();

  if (error) {
    throw new Error(
      "기존 Source Snapshot을 조회하지 못했습니다. blog_source_snapshots 테이블을 확인해주세요.",
    );
  }

  return sourceSnapshotFromStoredRow(data ?? null);
}

function buildUpdateContext({
  previousPost,
  previousSnapshot,
  nextSnapshot,
}: {
  previousPost: ExistingBlogRow;
  previousSnapshot: SourceSnapshot | null;
  nextSnapshot: SourceSnapshot;
}): BlogUpdateContext {
  return {
    previousPost: {
      id: previousPost.id,
      slug: previousPost.slug,
      status: previousPost.status,
      title: previousPost.title,
      body_md: previousPost.body_md,
      source_snapshot_id: previousPost.source_snapshot_id,
      updated_at: previousPost.updated_at,
    },
    previousSnapshot,
    changeSummary: compareSourceSnapshots(previousSnapshot, nextSnapshot),
  };
}

function getRequestIdempotencyKey({
  request,
  siteId,
  jobType,
}: {
  request: Request;
  siteId: string;
  jobType: "create" | "update" | "validate";
}) {
  const headerKey =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");
  const normalizedHeaderKey = headerKey?.trim();

  if (normalizedHeaderKey) {
    return `site-blog:${siteId}:${jobType}:${normalizedHeaderKey}`;
  }

  return `site-blog:${siteId}:${jobType}:${randomUUID()}`;
}

async function createAiGenerationJob({
  supabase,
  siteId,
  postId,
  jobType,
  openaiPlannerModel,
  openaiValidatorModel,
  anthropicModel,
  promptVersion,
  idempotencyKey,
  createdBy,
}: {
  supabase: SupabaseClient;
  siteId: string;
  postId: string | null;
  jobType: "create" | "update" | "validate";
  openaiPlannerModel: string;
  openaiValidatorModel: string;
  anthropicModel: string;
  promptVersion: string;
  idempotencyKey: string;
  createdBy: string | null;
}) {
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .insert({
      site_id: siteId,
      post_id: postId,
      job_type: jobType,
      status: "running",
      provider: "mixed",
      openai_model: `${openaiPlannerModel}; ${openaiValidatorModel}`,
      anthropic_model: anthropicModel,
      prompt_version: promptVersion,
      source_snapshot_id: null,
      input_tokens: null,
      output_tokens: null,
      error_message: null,
      idempotency_key: idempotencyKey,
      created_by: createdBy,
      started_at: new Date().toISOString(),
      finished_at: null,
    })
    .select(
      "id, site_id, post_id, job_type, status, provider, source_snapshot_id, idempotency_key, created_at, started_at, finished_at",
    )
    .single<AiGenerationJobRow>();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "AI 생성 작업 로그를 시작하지 못했습니다. ai_generation_jobs 테이블을 확인해주세요.",
    );
  }

  return data;
}

async function findActiveAiGenerationJob(
  supabase: SupabaseClient,
  siteId: string,
) {
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .select(
      "id, site_id, post_id, job_type, status, provider, source_snapshot_id, idempotency_key, created_at, started_at, finished_at",
    )
    .eq("site_id", siteId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      "진행 중인 AI 생성 작업을 확인하지 못했습니다. ai_generation_jobs 테이블을 확인해주세요.",
    );
  }

  const activeJob = data?.[0] ? (data[0] as AiGenerationJobRow) : null;

  if (!activeJob) {
    return null;
  }

  if (
    !isActiveAiGenerationJobStale({
      status: activeJob.status,
      createdAt: activeJob.created_at,
      startedAt: activeJob.started_at,
      now: new Date(),
    })
  ) {
    return activeJob;
  }

  const staleAfterMinutes = Math.round(aiGenerationJobStaleAfterMs / 60000);
  const { error: updateError } = await supabase
    .from("ai_generation_jobs")
    .update({
      status: "failed",
      error_message: `stale_ai_generation_job_auto_reset: job exceeded ${staleAfterMinutes} minutes without finishing`,
      finished_at: new Date().toISOString(),
    })
    .eq("id", activeJob.id)
    .in("status", ["queued", "running"]);

  if (updateError) {
    throw new Error(
      "오래된 AI 생성 작업을 정리하지 못했습니다. ai_generation_jobs 테이블을 확인해주세요.",
    );
  }

  return null;
}

async function markAiGenerationJobSucceeded({
  supabase,
  jobId,
  postId,
  sourceSnapshotId,
}: {
  supabase: SupabaseClient;
  jobId: string;
  postId: string;
  sourceSnapshotId: string | null;
}) {
  const { error } = await supabase
    .from("ai_generation_jobs")
    .update({
      status: "succeeded",
      post_id: postId,
      source_snapshot_id: sourceSnapshotId,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("AI 생성 작업 성공 로그를 저장하지 못했습니다.");
  }
}

async function markAiGenerationJobSourceSnapshot({
  supabase,
  jobId,
  sourceSnapshotId,
}: {
  supabase: SupabaseClient;
  jobId: string;
  sourceSnapshotId: string | null;
}) {
  if (!sourceSnapshotId) {
    return;
  }

  const { error } = await supabase
    .from("ai_generation_jobs")
    .update({
      source_snapshot_id: sourceSnapshotId,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("AI 생성 작업 소스 스냅샷 로그를 저장하지 못했습니다.");
  }
}

async function markAiGenerationJobFailed({
  supabase,
  jobId,
  errorMessage,
  postId,
  sourceSnapshotId,
}: {
  supabase: SupabaseClient;
  jobId: string;
  errorMessage: string;
  postId?: string | null;
  sourceSnapshotId?: string | null;
}) {
  await supabase
    .from("ai_generation_jobs")
    .update({
      status: "failed",
      ...(postId !== undefined ? { post_id: postId } : {}),
      ...(sourceSnapshotId !== undefined
        ? { source_snapshot_id: sourceSnapshotId }
        : {}),
      error_message: errorMessage.slice(0, 2000),
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function createBlogPostVersion({
  supabase,
  postId,
  aiGenerationJobId,
  createdBy,
  isUpdate,
  snapshot,
  updateContext,
  finalReview,
  finalDraft,
}: {
  supabase: SupabaseClient;
  postId: string;
  aiGenerationJobId: string | null;
  createdBy: string | null;
  isUpdate: boolean;
  snapshot: SourceSnapshot;
  updateContext?: BlogUpdateContext | null;
  finalReview: FinalReviewOutput;
  finalDraft: BlogDraft;
}) {
  const versionNo = await getNextBlogPostVersionNo(supabase, postId);
  const { data, error } = await supabase
    .from("blog_post_versions")
    .insert({
      post_id: postId,
      version_no: versionNo,
      title: finalDraft.title,
      meta_title: finalDraft.meta_title,
      meta_description: finalDraft.description,
      body_md: normalizeBlogMarkdown(
        finalReview.body_md,
        getSeoH1(snapshot),
        snapshot.site_specific_verification,
        snapshot,
      ),
      faq_json: finalReview.faq_json,
      checklist_json: finalReview.checklist_json,
      change_summary: buildVersionChangeSummary({
        isUpdate,
        snapshot,
        finalDraft,
        updateContext,
      }),
      source_snapshot_id: snapshot.source_snapshot_id ?? null,
      ai_generation_job_id: aiGenerationJobId,
      created_by: createdBy,
    })
    .select("id, post_id, version_no, created_at")
    .single<BlogPostVersionRow>();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "블로그 버전 이력을 저장하지 못했습니다. blog_post_versions 테이블을 확인해주세요.",
    );
  }

  return data;
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getPayloadString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = toNullableString(payload[key]);

    if (value) return value;
  }

  return null;
}

function getPayloadStringArray(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string") {
      const items = uniqueStrings(value.split(/[\n,]+/));
      if (items.length > 0) return items;
    }

    if (Array.isArray(value)) {
      const items = uniqueStrings(
        value.map((item) => (typeof item === "string" ? item : null)),
      );
      if (items.length > 0) return items;
    }
  }

  return null;
}

function getScreenshotUrls(site: SiteRow) {
  const screenshots = uniqueStrings([
    site.screenshot_url,
    site.screenshot_thumb_url,
  ]);

  return screenshots.length > 0 ? screenshots : null;
}

function getSnapshotDomain(site: SiteRow) {
  const primaryDomain = extractDomain(site.url);
  if (primaryDomain) return primaryDomain;

  return (
    getDomainTargets(site)
      .map((domainUrl) => extractDomain(domainUrl))
      .find(Boolean) ?? ""
  );
}

function mapDnsRows(rows: SiteDnsRecordDbRow[]): SnapshotDnsRecord[] {
  const records: SnapshotDnsRecord[] = [];

  const pushRecords = (
    row: SiteDnsRecordDbRow,
    recordType: SnapshotDnsRecord["record_type"],
    values: string[] | null,
  ) => {
    for (const value of uniqueStrings(values ?? [])) {
      records.push({
        site_id: row.site_id,
        domain: row.domain,
        display_domain: formatDisplayDomain(row.domain),
        record_type: recordType,
        value,
        ttl: null,
        checked_at: row.checked_at,
      });
    }
  };

  for (const row of rows) {
    pushRecords(row, "A", row.a_records);
    pushRecords(row, "AAAA", row.aaaa_records);
    pushRecords(row, "CNAME", row.cname_records);
    pushRecords(row, "MX", row.mx_records);
    pushRecords(row, "NS", row.ns_records);
    pushRecords(row, "TXT", row.txt_records);

    const soa = toNullableString(row.soa_record);
    if (soa) {
      records.push({
        site_id: row.site_id,
        domain: row.domain,
        display_domain: formatDisplayDomain(row.domain),
        record_type: "SOA",
        value: soa,
        ttl: null,
        checked_at: row.checked_at,
      });
    }
  }

  return records;
}

function mapWhoisRow(row: DomainWhoisCacheDbRow): SnapshotWhoisRecord {
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : {};
  const registrantName = getPayloadString(
    payload,
    "registrantName",
    "registrant_name",
  );
  const registrantOrg = getPayloadString(
    payload,
    "registrantOrganization",
    "registrant_organization",
    "registrant_org",
  );
  const registrantEmail = getPayloadString(
    payload,
    "registrantEmail",
    "registrant_email",
  );
  const hasLookupError = Boolean(getPayloadString(payload, "errorMessage", "error"));
  const hasRegistrantDetails = Boolean(
    registrantName || registrantOrg || registrantEmail,
  );

  return {
    domain: row.domain,
    display_domain: formatDisplayDomain(row.domain),
    registrar: getPayloadString(payload, "registrar"),
    privacy_protected: hasLookupError ? null : !hasRegistrantDetails,
    created_date: getPayloadString(payload, "creationDate", "created_date"),
    updated_date: getPayloadString(payload, "updatedDate", "updated_date"),
    expiration_date: getPayloadString(
      payload,
      "expirationDate",
      "expiration_date",
    ),
    name_servers: getPayloadStringArray(payload, "nameServers", "name_servers"),
    checked_at: row.fetched_at,
  };
}

function mapReviewRow(row: ReviewDbRow): SnapshotReview {
  return {
    site_id: row.site_id,
    rating: toNullableNumber(row.rating),
    title: toNullableString(row.title),
    content: row.experience,
    status: "approved",
    is_public: true,
    created_at: row.created_at,
    approved_at: null,
  };
}

function mapScamReportRow(row: ScamReportDbRow): SnapshotScamReport {
  return {
    site_id: row.site_id,
    incident_type: toNullableString(row.main_category),
    incident_date: toNullableString(row.incident_date),
    content: row.situation_description,
    amount: toNullableNumber(row.damage_amount),
    amount_unknown: row.damage_amount_unknown,
    status: "approved",
    is_public: row.is_published,
    created_at: row.created_at,
    approved_at: row.approved_at,
  };
}

function mapDomainSubmissionRow(
  row: SiteDomainSubmissionDbRow,
): SnapshotDomainSubmission {
  return {
    site_id: row.site_id,
    domain: row.domain_url,
    status: "approved",
    submitted_at: row.created_at,
    approved_at: row.reviewed_at,
  };
}

function redactPii(value: string) {
  let redacted = value;

  const replacements: Array<[RegExp, string]> = [
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 마스킹]"],
    [
      /(?:\+?82[-\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b/g,
      "[전화번호 마스킹]",
    ],
    [/\b0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}\b/g, "[전화번호 마스킹]"],
    [/\b\d{6}[-\s]?[1-4]\d{6}\b/g, "[주민등록번호 마스킹]"],
    [
      /(?:계좌(?:번호)?|환전계좌|충전계좌|입금계좌|출금계좌)\s*[:：]?\s*[0-9-\s]{6,30}/gi,
      "[계좌번호 마스킹]",
    ],
    [/\b\d{2,6}-\d{2,8}-\d{2,8}(?:-\d{1,4})?\b/g, "[계좌번호 마스킹]"],
    [
      /(?:거래번호|승인번호|주문번호|입금번호|출금번호|충전번호|환전번호)\s*[:：]?\s*[A-Z0-9-]{6,}/gi,
      "[거래 식별정보 마스킹]",
    ],
    [
      /(?:텔레그램|telegram|텔레|TG|tg)\s*(?:ID|아이디|계정)?\s*[:：]?\s*@?[A-Za-z0-9_]{3,32}/gi,
      "[텔레그램 ID 마스킹]",
    ],
    [
      /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{3,32}/gi,
      "[텔레그램 ID 마스킹]",
    ],
    [/(^|[\s(])@[A-Za-z0-9_]{3,32}\b/g, "$1[텔레그램 ID 마스킹]"],
    [
      /(?:카카오톡|카톡|카카오|kakao|kakaotalk|오픈채팅)\s*(?:ID|아이디|계정)?\s*[:：]?\s*[A-Za-z0-9._-]{3,32}/gi,
      "[카카오톡 ID 마스킹]",
    ],
    [
      /(?:https?:\/\/)?open\.kakao\.com\/[^\s]+/gi,
      "[카카오톡 ID 마스킹]",
    ],
    [
      /(?:이름|성명|실명|본명|예금주|입금자|입금자명|계좌주|명의자|담당자|상담원)\s*[:：]?\s*[가-힣]{2,4}/g,
      "[이름 마스킹]",
    ],
    [/\b홍길동\b/g, "[이름 마스킹]"],
    [
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      "[IP 주소 마스킹]",
    ],
    [
      /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi,
      "[IP 주소 마스킹]",
    ],
    [
      /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\n,。]{0,60}(?:로|길|동|읍|면|리)\s*\d{0,5}(?:-\d{1,5})?/g,
      "[주소 마스킹]",
    ],
    [
      /(?:주소|거주지|집주소|배송지)\s*[:：]?\s*[^\n,。]{6,80}/g,
      "[주소 마스킹]",
    ],
    [
      /(?:은행|입금은행|환전은행)\s*[:：]?\s*[가-힣A-Za-z0-9\s]{2,30}/g,
      "[금융기관 정보 마스킹]",
    ],
  ];

  for (const [pattern, replacement] of replacements) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
}

function summarizeRedactedText(value: string, maxLength = 500) {
  const normalized = redactPii(value).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentences = normalized
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
  const summary = sentences.slice(0, 3).join(" ");
  const base =
    summary.length > 0 && summary.length <= maxLength
      ? summary
      : normalized.slice(0, maxLength).trim();

  return `${base}...`;
}

function getLatestDate(values: Array<string | null | undefined>) {
  const dates = values.filter(
    (value): value is string =>
      typeof value === "string" && Number.isFinite(new Date(value).getTime()),
  );

  return dates.length > 0
    ? dates.reduce((latest, date) => (date > latest ? date : latest))
    : null;
}

function getAverageRating(reviews: SnapshotReview[]) {
  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");

  if (ratings.length === 0) return null;

  return Number(
    (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(2),
  );
}

function summarizeReviewSentiment(reviews: SnapshotReview[]) {
  const averageRating = getAverageRating(reviews);

  if (reviews.length === 0 || averageRating === null) {
    return "조회 시점 기준 승인된 리뷰는 확인되지 않았습니다.";
  }

  if (averageRating >= 4) {
    return "승인된 리뷰 평점은 높은 편이지만, 개별 경험 차이가 있을 수 있습니다.";
  }

  if (averageRating >= 2.5) {
    return "승인된 리뷰 평점은 중간 수준이며, 긍정과 부정 경험을 함께 검토해야 합니다.";
  }

  return "승인된 리뷰 평점은 낮은 편이며, 구체적인 불편 사례를 확인할 필요가 있습니다.";
}

function buildReviewsSummary(reviews: SnapshotReview[]): ReviewsSummary {
  return {
    approved_review_count: reviews.length,
    average_rating: getAverageRating(reviews),
    latest_review_at: getLatestDate(reviews.map((review) => review.created_at)),
    review_sentiment_summary: summarizeReviewSentiment(reviews),
    sample_reviews_redacted: reviews.slice(0, 20).map((review) => ({
      rating: review.rating,
      title: review.title ? summarizeRedactedText(review.title, 120) : null,
      content: summarizeRedactedText(review.content),
      created_at: review.created_at,
      approved_at: review.approved_at,
    })),
  };
}

function buildScamReportsSummary(
  reports: SnapshotScamReport[],
): ScamReportsSummary {
  const totalReportedAmount = reports.reduce(
    (total, report) => total + Number(report.amount ?? 0),
    0,
  );
  const hasKnownAmount = reports.some((report) => typeof report.amount === "number");

  return {
    approved_public_report_count: reports.length,
    total_reported_amount: hasKnownAmount ? totalReportedAmount : null,
    latest_report_at: getLatestDate(reports.map((report) => report.created_at)),
    sample_reports_redacted: reports.slice(0, 20).map((report) => ({
      incident_type: report.incident_type
        ? summarizeRedactedText(report.incident_type, 120)
        : null,
      incident_date: report.incident_date,
      content: summarizeRedactedText(report.content),
      amount: report.amount,
      amount_unknown: report.amount_unknown,
      created_at: report.created_at,
      approved_at: report.approved_at,
    })),
  };
}

function buildSnapshotDomains({
  site,
  approvedDomainSubmissions,
}: {
  site: SiteRow;
  approvedDomainSubmissions: SnapshotDomainSubmission[];
}) {
  const primaryUrl = site.url;
  const primaryDomain = getSnapshotDomain(site);
  const domains = new Map<string, SnapshotDomain>();

  if (primaryDomain) {
    domains.set(primaryDomain, {
      domain: primaryDomain,
      display_domain: formatDisplayDomain(primaryDomain),
      url: primaryUrl,
      display_url: formatDisplayUrl(primaryUrl),
      source: "primary",
      status: "approved",
      submitted_at: null,
      approved_at: null,
    });
  }

  for (const domainUrl of getDomainTargets(site)) {
    const domain = extractDomain(domainUrl);
    if (!domain || domains.has(domain)) continue;

    domains.set(domain, {
      domain,
      display_domain: formatDisplayDomain(domain),
      url: domainUrl,
      display_url: formatDisplayUrl(domainUrl),
      source: "registered",
      status: "approved",
      submitted_at: null,
      approved_at: null,
    });
  }

  for (const submission of approvedDomainSubmissions) {
    const domain = extractDomain(submission.domain);
    if (!domain || domains.has(domain)) continue;

    domains.set(domain, {
      domain,
      display_domain: formatDisplayDomain(domain),
      url: submission.domain,
      display_url: formatDisplayUrl(submission.domain),
      source: "approved_submission",
      status: "approved",
      submitted_at: submission.submitted_at,
      approved_at: submission.approved_at,
    });
  }

  return Array.from(domains.values());
}

function getOldestCreationDate(records: SnapshotWhoisRecord[]) {
  const dates = records
    .map((record) => record.created_date)
    .filter(
      (date): date is string =>
        typeof date === "string" && Number.isFinite(new Date(date).getTime()),
    );

  return dates.length > 0
    ? dates.reduce((oldest, date) => (date < oldest ? date : oldest))
    : undefined;
}

function getPrimaryWhoisRecord(
  primaryDomain: string,
  whoisRecords: SnapshotWhoisRecord[],
) {
  return (
    whoisRecords.find((record) => record.domain === primaryDomain) ??
    whoisRecords[0] ??
    null
  );
}

function buildDerivedFacts({
  site,
  domains,
  dnsRecords,
  whoisRecords,
  resolvedIps,
  dnsCheckedAt,
  dnsLookupStatuses,
  whoisLookupStatuses,
}: {
  site: SiteRow;
  domains: SnapshotDomain[];
  dnsRecords: SnapshotDnsRecord[];
  whoisRecords: SnapshotWhoisRecord[];
  resolvedIps: string[];
  dnsCheckedAt: string | null;
  dnsLookupStatuses: DomainLookupStatus[];
  whoisLookupStatuses: DomainLookupStatus[];
}): DerivedFacts {
  const primaryDomain = getSnapshotDomain(site);
  const primaryWhois = getPrimaryWhoisRecord(primaryDomain, whoisRecords);
  const nameServers = uniqueStrings([
    ...whoisRecords.flatMap((record) => record.name_servers ?? []),
    ...dnsRecords
      .filter((record) => record.record_type === "NS")
      .map((record) => record.value),
  ]).sort();

  return {
    primary_domain: primaryDomain,
    primary_domain_display: formatDisplayDomain(primaryDomain),
    additional_domains: domains
      .filter((domain) => domain.domain !== primaryDomain)
      .map((domain) => domain.domain),
    additional_domains_display: domains
      .filter((domain) => domain.domain !== primaryDomain)
      .map((domain) => domain.display_domain),
    resolved_ips: resolvedIps,
    name_servers: nameServers,
    has_whois_privacy: primaryWhois?.privacy_protected ?? null,
    domain_created_date: primaryWhois?.created_date ?? null,
    domain_updated_date: primaryWhois?.updated_date ?? null,
    domain_expiration_date: primaryWhois?.expiration_date ?? null,
    dns_last_checked_at: dnsCheckedAt,
    whois_last_checked_at: getLatestDate(
      whoisRecords.map((record) => record.checked_at),
    ),
    dns_lookup_statuses: dnsLookupStatuses,
    whois_lookup_statuses: whoisLookupStatuses,
  };
}

function buildMinimumPublishCheck({
  site,
  reviewsSummary,
  scamReportsSummary,
  dnsRecords,
  derivedFacts,
}: {
  site: SnapshotSite;
  reviewsSummary: ReviewsSummary;
  scamReportsSummary: ScamReportsSummary;
  dnsRecords: SnapshotDnsRecord[];
  derivedFacts: DerivedFacts;
}): MinimumPublishCheck {
  const reviewsCount = reviewsSummary.approved_review_count;
  const scamReportsCount =
    scamReportsSummary.approved_public_report_count;
  const dnsRecordsCount = dnsRecords.length;
  const hasWhoisCreatedDate = Boolean(derivedFacts.domain_created_date);
  const canGenerateDraft = Boolean(
    site.name.trim() &&
      site.domain.trim() &&
      derivedFacts.dns_last_checked_at,
  );
  const needsMoreData =
    reviewsCount === 0 &&
    scamReportsCount === 0 &&
    dnsRecordsCount === 0 &&
    !hasWhoisCreatedDate;
  const reasons = [
    !site.name.trim() ? "사이트명이 확인되지 않았습니다." : "",
    !site.domain.trim() ? "대표 도메인이 확인되지 않았습니다." : "",
    !derivedFacts.dns_last_checked_at
      ? "DNS 조회 시각이 확인되지 않았습니다."
      : "",
    reviewsCount === 0 ? "승인 리뷰가 없습니다." : "",
    scamReportsCount === 0 ? "승인 피해 제보가 없습니다." : "",
    dnsRecordsCount === 0 ? "DNS 레코드가 없습니다." : "",
    !hasWhoisCreatedDate ? "WHOIS 생성일이 확인되지 않았습니다." : "",
  ].filter(Boolean);
  const automaticPublishBlocked = !canGenerateDraft || needsMoreData;

  return {
    can_generate_draft: canGenerateDraft,
    needs_more_data: needsMoreData,
    automatic_publish_blocked: automaticPublishBlocked,
    warning: automaticPublishBlocked ? insufficientSourceDataWarning : null,
    reasons,
    reviews_count: reviewsCount,
    scam_reports_count: scamReportsCount,
    dns_records_count: dnsRecordsCount,
    has_whois_created_date: hasWhoisCreatedDate,
  };
}

function buildSeoTitleSignals({
  site,
  dnsRecords,
  reviewsSummary,
  scamReportsSummary,
  derivedFacts,
}: {
  site: Pick<SnapshotSite, "name">;
  dnsRecords: SnapshotDnsRecord[];
  reviewsSummary: ReviewsSummary;
  scamReportsSummary: ScamReportsSummary;
  derivedFacts: DerivedFacts;
}): SeoTitleSignals {
  return {
    site_name: site.name,
    approved_review_count: reviewsSummary.approved_review_count,
    approved_public_scam_report_count:
      scamReportsSummary.approved_public_report_count,
    additional_domain_count: derivedFacts.additional_domains.length,
    resolved_ip_count: derivedFacts.resolved_ips.length,
    has_whois_created_date: Boolean(derivedFacts.domain_created_date),
    has_whois_privacy: derivedFacts.has_whois_privacy,
    name_server_count: derivedFacts.name_servers.length,
    dns_record_types: uniqueStrings(
      dnsRecords.map((record) => record.record_type),
    ).sort(),
    latest_review_at: reviewsSummary.latest_review_at,
    latest_scam_report_at: scamReportsSummary.latest_report_at,
    dns_last_checked_at: derivedFacts.dns_last_checked_at,
    whois_last_checked_at: derivedFacts.whois_last_checked_at,
  };
}

function calculateSnapshotTrustScore({
  reviews,
  scamReports,
  whoisRecords,
}: {
  reviews: SnapshotReview[];
  scamReports: ScamReportDbRow[];
  whoisRecords: SnapshotWhoisRecord[];
}) {
  const ratings = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
      : 0;
  const scamDamageAmount = scamReports.reduce(
    (total, report) => total + Number(report.damage_amount ?? 0),
    0,
  );
  const scamDamageAmountUnknownCount = scamReports.filter(
    (report) => report.damage_amount_unknown,
  ).length;

  return calculateSiteTrustScore({
    averageRating,
    reviewCount: reviews.length,
    scamReportCount: scamReports.length,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
    oldestDomainCreationDate: getOldestCreationDate(whoisRecords),
  }).total;
}

async function getLatestBlogSourceCrawlSnapshot(
  supabase: SupabaseClient,
  site: SiteRow,
) {
  if (site.latest_crawl_snapshot_id) {
    const pinnedResult = await supabase
      .from("site_crawl_snapshots")
      .select(blogSourceCrawlSnapshotSelect)
      .eq("id", site.latest_crawl_snapshot_id)
      .eq("site_id", site.id)
      .maybeSingle<BlogSourceCrawlSnapshotRow>();

    if (pinnedResult.error || pinnedResult.data) {
      return pinnedResult;
    }
  }

  return supabase
    .from("site_crawl_snapshots")
    .select(blogSourceCrawlSnapshotSelect)
    .eq("site_id", site.id)
    .order("collected_at", { ascending: false })
    .limit(1)
    .maybeSingle<BlogSourceCrawlSnapshotRow>();
}

async function createSourceSnapshot({
  supabase,
  site,
  resolvedIps,
  dnsLookupStatuses,
  whoisLookupStatuses,
  maxReviews,
  maxScamReports,
}: {
  supabase: SupabaseClient;
  site: SiteRow;
  resolvedIps: string[];
  dnsLookupStatuses: DomainLookupStatus[];
  whoisLookupStatuses: DomainLookupStatus[];
  maxReviews: number;
  maxScamReports: number;
}): Promise<SourceSnapshot> {
  const reviewLimit = Math.min(maxReviews, 20);
  const scamReportLimit = Math.min(maxScamReports, 20);
  const [
    reviewsResult,
    scamReportsResult,
    domainSubmissionsResult,
    dnsRecordsResult,
    sameIpSitesResult,
    crawlSnapshotResult,
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "site_id, rating, title, experience, status, created_at",
      )
      .eq("site_id", site.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(reviewLimit),
    supabase
      .from("scam_reports")
      .select(
        "site_id, incident_date, main_category, damage_amount, damage_amount_unknown, situation_description, review_status, is_published, created_at, approved_at",
      )
      .eq("site_id", site.id)
      .eq("review_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(scamReportLimit),
    supabase
      .from("site_domain_submissions")
      .select("site_id, domain_url, status, reviewed_at, created_at")
      .eq("site_id", site.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("site_dns_records")
      .select(
        "site_id, domain, a_records, aaaa_records, cname_records, mx_records, ns_records, txt_records, soa_record, checked_at",
      )
      .eq("site_id", site.id)
      .order("checked_at", { ascending: false }),
    resolvedIps.length > 0
      ? supabase
          .from("sites")
          .select("id, slug, name, url, resolved_ips")
          .eq("status", "approved")
          .neq("id", site.id)
          .overlaps("resolved_ips", resolvedIps)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    getLatestBlogSourceCrawlSnapshot(supabase, site),
  ]);

  if (reviewsResult.error) {
    throw new Error("승인된 리뷰 데이터를 불러오지 못했습니다.");
  }

  if (scamReportsResult.error) {
    throw new Error("공개 승인된 피해 제보 데이터를 불러오지 못했습니다.");
  }

  if (domainSubmissionsResult.error) {
    throw new Error("승인된 추가 도메인 데이터를 불러오지 못했습니다.");
  }

  if (dnsRecordsResult.error) {
    throw new Error("DNS 레코드 데이터를 불러오지 못했습니다.");
  }

  if (sameIpSitesResult.error) {
    throw new Error("동일 IP 관측 데이터를 불러오지 못했습니다.");
  }

  if (crawlSnapshotResult.error) {
    throw new Error("최신 원본 사이트 관측 정보를 불러오지 못했습니다.");
  }

  const approvedReviews = ((reviewsResult.data ?? []) as ReviewDbRow[]).map(
    mapReviewRow,
  );
  const rawScamReports = (scamReportsResult.data ?? []) as ScamReportDbRow[];
  const publishedScamReports = rawScamReports.map(mapScamReportRow);
  const approvedDomainSubmissions =
    ((domainSubmissionsResult.data ?? []) as SiteDomainSubmissionDbRow[]).map(
      mapDomainSubmissionRow,
    );
  const dnsRecords = mapDnsRows(
    (dnsRecordsResult.data ?? []) as SiteDnsRecordDbRow[],
  );
  const whoisDomains = uniqueStrings([
    ...getDomainTargets(site).map(extractDomain),
    ...approvedDomainSubmissions.map((submission) =>
      extractDomain(submission.domain),
    ),
    ...dnsRecords.map((record) => record.domain),
    ...dnsLookupStatuses.map((status) => status.domain),
    ...whoisLookupStatuses.map((status) => status.domain),
  ]);
  const whoisResult =
    whoisDomains.length > 0
      ? await supabase
          .from("domain_whois_cache")
          .select("domain, payload, fetched_at")
          .in("domain", whoisDomains)
      : { data: [], error: null };

  if (whoisResult.error) {
    throw new Error("WHOIS 캐시 데이터를 불러오지 못했습니다.");
  }

  const whoisRecords = ((whoisResult.data ?? []) as DomainWhoisCacheDbRow[]).map(
    mapWhoisRow,
  );
  const dnsCheckedAt =
    dnsRecords.map((record) => record.checked_at).sort().at(-1) ??
    site.dns_checked_at;
  const snapshotResolvedIps = resolvedIps.length > 0
    ? resolvedIps
    : uniqueStrings(site.resolved_ips ?? []);
  const domains = buildSnapshotDomains({
    site,
    approvedDomainSubmissions,
  });
  const reviewsSummary = buildReviewsSummary(approvedReviews);
  const scamReportsSummary = buildScamReportsSummary(publishedScamReports);
  const derivedFacts = buildDerivedFacts({
    site,
    domains,
    dnsRecords,
    whoisRecords,
    resolvedIps: snapshotResolvedIps,
    dnsCheckedAt,
    dnsLookupStatuses,
    whoisLookupStatuses,
  });
  const snapshotSite = {
    id: site.id,
    name: site.name,
    slug: site.slug,
    url: site.url,
    display_url: formatDisplayUrl(site.url),
    domain: getSnapshotDomain(site),
    display_domain: formatDisplayDomain(getSnapshotDomain(site)),
    description: site.description || null,
    description_source_snapshot_id: site.description_source_snapshot_id ?? null,
    description_generated_at: site.description_generated_at ?? null,
    screenshot_url: site.screenshot_url,
    screenshot_thumb_url: site.screenshot_thumb_url,
    screenshots: getScreenshotUrls(site),
    logo_url: site.logo_url,
    favicon_url: site.favicon_url,
    trust_score: calculateSnapshotTrustScore({
      reviews: approvedReviews,
      scamReports: rawScamReports,
      whoisRecords,
    }),
    resolved_ips: snapshotResolvedIps.length > 0 ? snapshotResolvedIps : null,
    dns_checked_at: dnsCheckedAt,
    created_at: site.created_at,
    updated_at: site.updated_at,
  };
  const crawlSnapshot = toBlogSourceCrawlSnapshot(crawlSnapshotResult.data ?? null);
  const minimumPublishCheck = buildMinimumPublishCheck({
    site: snapshotSite,
    reviewsSummary,
    scamReportsSummary,
    dnsRecords,
    derivedFacts,
  });
  const generatedAt = new Date().toISOString();
  const siteSpecificVerification = buildBlogVerificationSummary({
    generatedAt,
    site: snapshotSite,
    crawl_snapshot: crawlSnapshot,
    domains,
    dns_records: dnsRecords,
    whois: whoisRecords,
    reviews_summary: reviewsSummary,
    scam_reports_summary: scamReportsSummary,
    derived_facts: derivedFacts,
  });
  const seoTitleSignals = buildSeoTitleSignals({
    site: snapshotSite,
    dnsRecords,
    reviewsSummary,
    scamReportsSummary,
    derivedFacts,
  });

  return {
    generatedAt,
    site: snapshotSite,
    site_detail_path: `/sites/${site.slug}`,
    crawl_snapshot: crawlSnapshot,
    domains,
    dns_records: dnsRecords,
    whois: whoisRecords,
    reviews_summary: reviewsSummary,
    scam_reports_summary: scamReportsSummary,
    derived_facts: derivedFacts,
    site_specific_verification: siteSpecificVerification,
    minimum_publish_check: minimumPublishCheck,
    seo_title_signals: seoTitleSignals,
    sameIpSites: (sameIpSitesResult.data ?? []) as SameIpSiteRow[],
    dataPolicy: [
      ...blogGenerationImplementationPrinciples,
      "승인된 리뷰와 승인된 피해 제보만 본문 근거로 사용한다.",
      "AI 입력용 리뷰와 피해 제보는 각각 최근 20개까지만 포함한다.",
      "데이터가 부족하면 자동 발행하지 않고 관리자 경고를 남긴다.",
      "SEO fallback 제목은 데이터가 부족할 때만 사용하고, 실제 title/meta_title/H1은 사이트별 고유 데이터 2~3개를 조합한다.",
      "피해 제보가 없다는 사실은 안전 보장 또는 먹튀 없음으로 표현하지 않는다.",
      "WHOIS 비공개, CDN 사용, 동일 IP 관측은 단독으로 운영 주체 또는 위험도를 단정하는 근거가 아니다.",
      "WHOIS 원문은 전달하지 않고 registrar, 주요 날짜, name server, privacy 여부, 조회 시각만 포함한다.",
      "일부 DNS 또는 WHOIS 조회가 실패하면 조회 시점에 확인되지 않은 정보로 표현한다.",
      "리뷰와 피해 제보 샘플은 AI 전달 전에 개인정보 마스킹과 긴 본문 요약을 적용한다.",
      "피해 제보 증빙 이미지와 스크린샷 OCR 원문은 Source Snapshot에 포함하지 않는다.",
      "crawl_snapshot 또는 manual_html_snapshot은 원본 페이지의 공개 HTML에서 조회 시점 기준 관측된 정보이며 사이트 식별과 화면 기록 확인의 보조 자료로만 사용한다.",
      "crawl_snapshot의 promotional_flags_json과 excluded_terms_json은 AI 입력에는 포함하지만 공개 본문에서는 가입, 입금, 충전, 환전, 보너스, 이벤트, 추천, 바로가기, 최신 주소, 우회 주소를 강조하지 않는다.",
      "crawl_snapshot에 raw HTML 또는 raw_html_storage_path는 포함하지 않는다.",
      "모든 글은 가입 또는 이용 권유가 아닌 공개 데이터 기반 정보 정리로 작성한다.",
    ],
  };
}

async function saveBlogSourceSnapshot(
  supabase: SupabaseClient,
  siteId: string,
  snapshot: SourceSnapshot,
): Promise<SourceSnapshot> {
  const { data, error } = await supabase
    .from("blog_source_snapshots")
    .insert({
      site_id: siteId,
      site_json: snapshot.site,
      crawl_snapshot_json: getBlogSourceCrawlSnapshotJson(snapshot),
      domains_json: snapshot.domains,
      dns_records_json: snapshot.dns_records,
      whois_json: snapshot.whois,
      reviews_summary_json: snapshot.reviews_summary,
      scam_reports_summary_json: snapshot.scam_reports_summary,
      derived_facts_json: snapshot.derived_facts,
      pii_redaction_version: piiRedactionVersion,
    })
    .select("id, snapshot_at")
    .single<BlogSourceSnapshotRow>();

  if (error || !data) {
    throw new Error(
      "Source Snapshot을 저장하지 못했습니다. blog_source_snapshots 테이블을 먼저 적용해주세요.",
    );
  }

  const persistedSnapshot = {
    ...snapshot,
    source_snapshot_id: data.id,
    snapshot_at: data.snapshot_at,
  };

  return {
    ...persistedSnapshot,
    site_specific_verification:
      buildBlogVerificationSummary(persistedSnapshot) ??
      snapshot.site_specific_verification,
  };
}

function scanDraft(draft: BlogDraft): SafetyViolation[] {
  const text = [
    draft.title,
    draft.meta_title,
    draft.description,
    draft.primary_keyword,
    draft.secondary_keywords.join(" "),
    draft.search_intent,
    draft.reader_question,
    draft.summary,
    draft.sections
      .flatMap((section) => [
        section.heading,
        ...section.paragraphs,
        ...section.bullets,
      ])
      .join(" "),
    draft.checklist.join(" "),
    draft.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(" "),
  ].join("\n");

  const violations: SafetyViolation[] = [];

  for (const phrase of prohibitedPhrases) {
    if (text.includes(phrase)) {
      violations.push({
        pattern: phrase,
        reason: "코드 기반 금지어 목록에 포함된 표현입니다.",
        sample: phrase,
      });
    }
  }

  for (const pattern of riskyPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);

    if (match) {
      violations.push({
        pattern: pattern.source,
        reason: "코드 기반 위험 문장 패턴에 해당합니다.",
        sample: match[0],
      });
    }
  }

  for (const item of forbiddenPatterns) {
    item.pattern.lastIndex = 0;
    const match = item.pattern.exec(text);

    if (match) {
      violations.push({
        pattern: item.label,
        reason: item.reason,
        sample: match[0],
      });
    }
  }

  return violations;
}

function normalizeDraft(draft: BlogDraft, preferredSlug: string): BlogDraft {
  const slug = normalizeSlug(preferredSlug || draft.slug);
  const sections = draft.sections
    .map((section) => ({
      heading: section.heading.trim(),
      paragraphs: section.paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean),
      bullets: section.bullets.map((bullet) => bullet.trim()).filter(Boolean),
    }))
    .filter((section) => section.heading && section.paragraphs.length > 0);

  return {
    ...draft,
    slug,
    category: getBlogCategoryLabel(draft.primary_category),
    primary_category: draft.primary_category,
    secondary_categories: Array.from(new Set(draft.secondary_categories)).slice(0, 2),
    tags: uniqueStrings(draft.tags.map((tag) => tag.trim()).filter(Boolean))
      .filter((tag) => !isBlogCategoryValue(tag))
      .slice(0, 20),
    priority:
      draft.priority === "상" || draft.priority === "중" || draft.priority === "하"
        ? draft.priority
        : "중",
    title: draft.title.trim(),
    meta_title: draft.meta_title.trim() || draft.title.trim(),
    description: draft.description.trim(),
    primary_keyword: draft.primary_keyword.trim(),
    secondary_keywords: draft.secondary_keywords.map((item) => item.trim()).filter(Boolean),
    search_intent: draft.search_intent.trim(),
    reader_question: draft.reader_question.trim(),
    recommended_title_pattern: draft.recommended_title_pattern.trim() || "정보 검증 리포트형",
    summary: draft.summary.trim(),
    reading_minutes: Math.max(1, Math.min(30, Math.round(draft.reading_minutes || 5))),
    internal_links: normalizeBlogInternalLinks(draft),
    sections,
    checklist: draft.checklist.map((item) => item.trim()).filter(Boolean),
    faqs: draft.faqs
      .map((faq) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }))
      .filter((faq) => faq.question && faq.answer),
    safety_notes: draft.safety_notes.map((item) => item.trim()).filter(Boolean),
  };
}

function normalizeBlogInternalLinks(draft: BlogDraft): BlogDraft["internal_links"] {
  const siteName =
    draft.primary_keyword.replace(/\s*토토사이트\s*$/u, "").trim() ||
    draft.title.replace(/\s*토토사이트[\s\S]*$/u, "").trim() ||
    "{사이트명}";

  return normalizeInternalLinkAnchorTexts({
    siteName,
    internalLinks: draft.internal_links.map((link) => ({
      href: link.href.trim(),
      label: link.label.trim(),
      placement: link.placement,
      purpose: link.purpose,
    })),
  }).flatMap((link) => {
    const href = typeof link.href === "string" ? link.href.trim() : "";
    const label = typeof link.label === "string" ? link.label.trim() : "";
    const placement = normalizeBlogInternalLinkPlacement(link.placement);
    const purpose = normalizeBlogInternalLinkPurpose(link.purpose);

    if (!href.startsWith("/") || href.startsWith("//") || !label) {
      return [];
    }

    return [
      {
        href,
        label,
        placement,
        purpose,
      },
    ];
  });
}

function buildRenderedBlogDetailInternalAnchors({
  draft,
  site,
}: {
  draft: BlogDraft;
  site: SiteRow;
}): BlogRenderedInternalAnchorInput {
  const primaryCategoryLabel = getBlogCategoryLabel(draft.primary_category);
  const sourceSiteHref =
    draft.internal_links.find((link) => link.purpose === "source_detail")?.href ??
    `/sites/${site.slug}`;

  return {
    breadcrumbLinks: [
      { href: "/", label: "홈" },
      { href: "/blog", label: "블로그" },
      {
        href: `/blog/category/${draft.primary_category}`,
        label: `${primaryCategoryLabel} 카테고리`,
      },
    ],
    bodyInternalLinks: [
      {
        href: `/blog/category/${draft.primary_category}`,
        label: primaryCategoryLabel,
      },
      {
        href: sourceSiteHref,
        label: `${site.name} 확인 데이터`,
      },
      ...draft.internal_links,
      { href: "/blog", label: "전체 글 보기" },
    ],
  };
}

function normalizeBlogInternalLinkPlacement(
  value: string | null | undefined,
): InternalAnchorPlacement {
  if (
    value === "summary" ||
    value === "address_domain_section" ||
    value === "dns_section" ||
    value === "reports_section" ||
    value === "reviews_section" ||
    value === "faq"
  ) {
    return value;
  }

  return "summary";
}

function normalizeBlogInternalLinkPurpose(
  value: string | null | undefined,
): BlogDraft["internal_links"][number]["purpose"] {
  if (
    value === "source_detail" ||
    value === "address_domain_detail" ||
    value === "dns_detail" ||
    value === "report_detail" ||
    value === "review_detail"
  ) {
    return value;
  }

  return "source_detail";
}

function getSeoKeywords(snapshot: SourceSnapshot) {
  const siteName = snapshot.site.name;
  const primaryKeyword = `${siteName} 토토사이트`;

  return {
    siteName,
    primaryKeyword,
    secondaryKeywords: [
      `${siteName} 토토사이트 검증`,
      `${siteName} 주소`,
      `${siteName} 도메인`,
      `${siteName} 먹튀`,
      `${siteName} 먹튀 제보`,
      `${siteName} 후기`,
    ],
  };
}

function getFallbackSeoTitle(snapshot: SourceSnapshot) {
  const signals = getSeoTitleSignals(snapshot);
  const siteName = signals.site_name || snapshot.site.name;

  return `${siteName} 토토사이트 기본 정보 확인: 관측 정보·먹튀 제보 ${signals.approved_public_scam_report_count}건·후기 ${signals.approved_review_count}건`;
}

function getSeoTitleSignals(snapshot: SourceSnapshot): SeoTitleSignals {
  return (
    snapshot.seo_title_signals ??
    buildSeoTitleSignals({
      site: snapshot.site,
      dnsRecords: snapshot.dns_records,
      reviewsSummary: snapshot.reviews_summary,
      scamReportsSummary: snapshot.scam_reports_summary,
      derivedFacts: snapshot.derived_facts,
    })
  );
}

function getBlogFacts(
  snapshot: SourceSnapshot,
  updateContext?: BlogUpdateContext | null,
): BlogFacts {
  const signals = getSeoTitleSignals(snapshot);
  const changeSummary = updateContext?.changeSummary;

  return {
    ...signals,
    dns_record_count: snapshot.dns_records.length,
    dns_changed: changeSummary?.dns_changed ?? false,
    whois_changed: changeSummary?.whois_changed ?? false,
    new_domains: changeSummary?.new_domains ?? [],
    new_reviews_count: changeSummary?.new_reviews_count ?? 0,
    new_scam_reports_count: changeSummary?.new_scam_reports_count ?? 0,
  };
}

function resolveBlogCategories(facts: BlogFacts): {
  primary: BlogCategorySlug;
  secondary: BlogCategorySlug[];
} {
  const hasDomainDnsData =
    (facts.dns_record_count ?? facts.dns_record_types.length) > 0 ||
    facts.whois_last_checked_at ||
    facts.resolved_ip_count > 0;
  const hasScamReports = facts.approved_public_scam_report_count > 0;
  const hasUserReviews = facts.approved_review_count > 0;
  const hasChangeHistory =
    facts.dns_changed ||
    facts.whois_changed ||
    (facts.new_domains?.length ?? 0) > 0 ||
    (facts.new_reviews_count ?? 0) > 0 ||
    (facts.new_scam_reports_count ?? 0) > 0;
  const secondaryCandidates: BlogCategorySlug[] = [
    ...(hasChangeHistory ? (["change-history"] as const) : []),
    ...(hasDomainDnsData ? (["domain-dns"] as const) : []),
    ...(hasScamReports ? (["scam-reports"] as const) : []),
    ...(hasUserReviews ? (["user-reviews"] as const) : []),
  ];

  return {
    primary: "site-reports",
    secondary: secondaryCandidates.slice(0, 2),
  };
}

function formatSeoTitleDate(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${values.year}.${values.month}.${values.day}`;
}

function getDnsTypesForTitle(signals: SeoTitleSignals) {
  const preferredOrder = ["A", "AAAA", "CNAME", "NS", "TXT", "MX", "SOA"];
  const recordTypes = [...signals.dns_record_types].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    const normalizedAIndex = aIndex === -1 ? preferredOrder.length : aIndex;
    const normalizedBIndex = bIndex === -1 ? preferredOrder.length : bIndex;

    return normalizedAIndex - normalizedBIndex || a.localeCompare(b);
  });

  return recordTypes.slice(0, 3).join("·");
}

function getDnsTitleSegment(signals: SeoTitleSignals) {
  const dnsTypes = getDnsTypesForTitle(signals);

  return dnsTypes ? `DNS ${dnsTypes}` : "DNS 기록 없음";
}

function getWhoisTitleSegment(signals: SeoTitleSignals) {
  if (signals.has_whois_created_date && signals.name_server_count > 0) {
    return `WHOIS 등록일·NS ${signals.name_server_count}개`;
  }

  if (signals.has_whois_created_date) {
    return "WHOIS 등록일 확인";
  }

  if (signals.name_server_count > 0) {
    return `네임서버 ${signals.name_server_count}개`;
  }

  return "WHOIS 등록일 미확인";
}

function hasRichDnsTitleData(signals: SeoTitleSignals) {
  return signals.dns_record_types.length >= 3;
}

function hasInsufficientSeoTitleData(signals: SeoTitleSignals) {
  return (
    signals.approved_public_scam_report_count === 0 &&
    signals.approved_review_count === 0 &&
    signals.additional_domain_count <= 1 &&
    !signals.has_whois_created_date &&
    !hasRichDnsTitleData(signals)
  );
}

function getSeoTitleDataWarning(snapshot: SourceSnapshot) {
  return hasInsufficientSeoTitleData(getSeoTitleSignals(snapshot))
    ? insufficientSeoTitleDataWarning
    : null;
}

function hasForbiddenSeoTitlePhrase(title: string) {
  return (
    prohibitedPhrases.some((phrase) => title.includes(phrase)) ||
    riskyPatterns.some((pattern) => pattern.test(title))
  );
}

function getSeoTitle(snapshot: SourceSnapshot) {
  const signals = getSeoTitleSignals(snapshot);
  const siteName = signals.site_name || snapshot.site.name;
  const dnsSegment = getDnsTitleSegment(signals);
  const whoisSegment = getWhoisTitleSegment(signals);

  if (signals.approved_public_scam_report_count > 0) {
    return `${siteName} 토토사이트 먹튀 제보 ${signals.approved_public_scam_report_count}건·후기 ${signals.approved_review_count}건: 관측 정보와 ${dnsSegment}`;
  }

  if (signals.approved_review_count > 0) {
    return `${siteName} 토토사이트 후기 ${signals.approved_review_count}건·먹튀 제보 0건: 관측 정보와 ${dnsSegment}`;
  }

  if (signals.additional_domain_count > 1) {
    return `${siteName} 토토사이트 도메인 ${signals.additional_domain_count}개 관측 현황: ${whoisSegment}·제보 정리`;
  }

  if (signals.has_whois_created_date) {
    return `${siteName} 토토사이트 ${whoisSegment}: 원본 관측과 ${dnsSegment}`;
  }

  if (hasRichDnsTitleData(signals)) {
    return `${siteName} 토토사이트 ${dnsSegment} 분석: 원본 관측·IP ${signals.resolved_ip_count}개`;
  }

  return getFallbackSeoTitle(snapshot);
}

function getSeoTitleStrategy(snapshot: SourceSnapshot, titleSimilarityWarning = false) {
  const signals = getSeoTitleSignals(snapshot);
  const title = getSeoTitle(snapshot);
  const metaTitle = getSeoMetaTitle(snapshot);
  const h1 = getSeoH1(snapshot);

  if (
    signals.approved_public_scam_report_count > 0 ||
    signals.approved_review_count > 0
  ) {
    return {
      selected_pattern: "reviews_and_reports" as const,
      reason: "먹튀 제보 수와 승인 리뷰 수를 제목의 핵심 차별 데이터로 사용했습니다.",
      unique_data_points_used: [
        "approved_review_count",
        "approved_public_scam_report_count",
        "dns_record_types",
      ],
      title,
      meta_title: metaTitle,
      h1,
      title_similarity_warning: titleSimilarityWarning,
    };
  }

  if (signals.additional_domain_count > 1) {
    return {
      selected_pattern: "domain_count" as const,
      reason: "추가 도메인 수가 관측되어 도메인 개수를 제목의 핵심 차별 데이터로 사용했습니다.",
      unique_data_points_used: [
        "additional_domain_count",
        "approved_public_scam_report_count",
        "has_whois_created_date",
      ],
      title,
      meta_title: metaTitle,
      h1,
      title_similarity_warning: titleSimilarityWarning,
    };
  }

  if (signals.has_whois_created_date || signals.name_server_count > 0) {
    return {
      selected_pattern: "whois_dns" as const,
      reason: "WHOIS 등록일 또는 네임서버 정보가 확인되어 WHOIS/DNS 중심 제목을 사용했습니다.",
      unique_data_points_used: [
        "has_whois_created_date",
        "name_server_count",
        "dns_record_types",
      ],
      title,
      meta_title: metaTitle,
      h1,
      title_similarity_warning: titleSimilarityWarning,
    };
  }

  if (hasRichDnsTitleData(signals)) {
    return {
      selected_pattern: "dns_records" as const,
      reason: "DNS 레코드 유형과 IP 관측 수가 제목 차별 데이터로 충분합니다.",
      unique_data_points_used: [
        "dns_record_types",
        "resolved_ip_count",
        "approved_public_scam_report_count",
      ],
      title,
      meta_title: metaTitle,
      h1,
      title_similarity_warning: titleSimilarityWarning,
    };
  }

  return {
    selected_pattern: "low_data" as const,
    reason: "리뷰, 먹튀 제보, DNS/WHOIS 데이터가 부족해 낮은 데이터용 제목을 사용했습니다.",
    unique_data_points_used: [
      "approved_review_count",
      "approved_public_scam_report_count",
      "additional_domain_count",
    ],
    title,
    meta_title: metaTitle,
    h1,
    title_similarity_warning: titleSimilarityWarning,
  };
}

function getSeoMetaTitle(snapshot: SourceSnapshot) {
  const signals = getSeoTitleSignals(snapshot);
  const siteName = signals.site_name || snapshot.site.name;

  if (signals.approved_public_scam_report_count > 0) {
    return `${siteName} 토토사이트 | 먹튀 제보 ${signals.approved_public_scam_report_count}건·후기 ${signals.approved_review_count}건`;
  }

  if (signals.approved_review_count > 0) {
    return `${siteName} 토토사이트 | 후기 ${signals.approved_review_count}건·제보 0건`;
  }

  if (signals.additional_domain_count > 1) {
    return `${siteName} 토토사이트 | 도메인 ${signals.additional_domain_count}개·제보 0건`;
  }

  if (signals.has_whois_created_date) {
    return `${siteName} 토토사이트 | WHOIS 확인·제보 0건`;
  }

  if (hasRichDnsTitleData(signals)) {
    return `${siteName} 토토사이트 | DNS ${signals.dns_record_types.length}종·IP ${signals.resolved_ip_count}개`;
  }

  return `${siteName} 토토사이트 | 제보 0건·후기 0건`;
}

function getSeoH1(snapshot: SourceSnapshot) {
  const signals = getSeoTitleSignals(snapshot);
  const siteName = signals.site_name || snapshot.site.name;

  if (
    signals.approved_review_count > 0 ||
    signals.approved_public_scam_report_count > 0
  ) {
    return `${siteName} 토토사이트 종합 정보 리포트: 관측 정보, 먹튀 제보 ${signals.approved_public_scam_report_count}건, 후기 ${signals.approved_review_count}건`;
  }

  if (signals.additional_domain_count > 1 || signals.has_whois_created_date) {
    return `${siteName} 토토사이트 종합 정보 리포트: 도메인 ${signals.additional_domain_count}개, ${getWhoisTitleSegment(signals)}, 관측 정보`;
  }

  if (hasRichDnsTitleData(signals)) {
    return `${siteName} 토토사이트 종합 정보 확인: 관측 정보, ${getDnsTitleSegment(signals)}, IP ${signals.resolved_ip_count}개`;
  }

  return `${siteName} 토토사이트 기본 정보 리포트: 관측 정보, 먹튀 제보 0건, 후기 0건, 도메인 ${signals.additional_domain_count}개 기준`;
}

function getSeoMetaDescription(snapshot: SourceSnapshot) {
  const signals = getSeoTitleSignals(snapshot);
  const dnsTypes = getDnsTypesForTitle(signals) || "DNS";
  const checkedAt =
    formatSeoTitleDate(signals.dns_last_checked_at) ||
    formatSeoTitleDate(signals.whois_last_checked_at) ||
    "조회 시점";

  return `${signals.site_name} 토토사이트의 원본 사이트 관측 정보, 후기 ${signals.approved_review_count}건, 먹튀 제보 ${signals.approved_public_scam_report_count}건, 추가 도메인 ${signals.additional_domain_count}개와 ${dnsTypes}/WHOIS 정보를 ${checkedAt} 기준으로 정리했습니다.`;
}

function buildSiteInternalLinks(snapshot: SourceSnapshot): BlogDraft["internal_links"] {
  const siteName = snapshot.site.name;
  const siteHref = snapshot.site_detail_path;

  return [
    {
      label: getPlacementInternalAnchorText({
        siteName,
        placement: "summary",
      }),
      href: siteHref,
      placement: "summary",
      purpose: "source_detail",
    },
    {
      label: getPlacementInternalAnchorText({
        siteName,
        placement: "address_domain_section",
      }),
      href: `${siteHref}#dns`,
      placement: "address_domain_section",
      purpose: "address_domain_detail",
    },
    {
      label: getPlacementInternalAnchorText({
        siteName,
        placement: "dns_section",
      }),
      href: `${siteHref}#dns`,
      placement: "dns_section",
      purpose: "dns_detail",
    },
    {
      label: getPlacementInternalAnchorText({
        siteName,
        placement: "reports_section",
      }),
      href: `${siteHref}#reports`,
      placement: "reports_section",
      purpose: "report_detail",
    },
    {
      label: getPlacementInternalAnchorText({
        siteName,
        placement: "reviews_section",
      }),
      href: `${siteHref}#reviews`,
      placement: "reviews_section",
      purpose: "review_detail",
    },
  ];
}

function getBlogCategoryClassification(
  snapshot: SourceSnapshot,
  updateContext?: BlogUpdateContext | null,
): Pick<BlogDraft, "category" | "primary_category" | "secondary_categories" | "tags"> {
  const facts = getBlogFacts(snapshot, updateContext);
  const resolvedCategories = resolveBlogCategories(facts);
  const hasCloudflare =
    snapshot.derived_facts.name_servers.some((value) =>
      value.toLowerCase().includes("cloudflare"),
    ) ||
    snapshot.dns_records.some((record) =>
      record.value.toLowerCase().includes("cloudflare"),
    );

  const tags = uniqueStrings([
    snapshot.site.name,
    ...(resolvedCategories.secondary.includes("domain-dns")
      ? ["DNS", "WHOIS", "도메인"]
      : []),
    ...(snapshot.derived_facts.name_servers.length > 0 ? ["네임서버"] : []),
    ...(facts.approved_public_scam_report_count > 0 ? ["먹튀 제보"] : []),
    ...(facts.approved_review_count > 0 ? ["리뷰"] : []),
    ...(snapshot.derived_facts.additional_domains.length > 0
      ? ["추가 도메인"]
      : []),
    ...(hasCloudflare ? ["Cloudflare"] : []),
    ...(updateContext ? ["변경 이력"] : []),
  ]).slice(0, 12);

  return {
    category: getBlogCategoryLabel(resolvedCategories.primary),
    primary_category: resolvedCategories.primary,
    secondary_categories: resolvedCategories.secondary,
    tags,
  };
}

function getBlogCategoryStrategy(
  snapshot: SourceSnapshot,
  updateContext?: BlogUpdateContext | null,
): CategoryStrategy {
  const categoryClassification = getBlogCategoryClassification(snapshot, updateContext);
  const facts = getBlogFacts(snapshot, updateContext);
  const resolvedCategories = resolveBlogCategories(facts);
  const hasCloudflare =
    snapshot.derived_facts.name_servers.some((value) =>
      value.toLowerCase().includes("cloudflare"),
    ) ||
    snapshot.dns_records.some((record) =>
      record.value.toLowerCase().includes("cloudflare"),
    );
  const tagSlugs = uniqueStrings([
    getBlogTagSlug(snapshot.site.slug) || getBlogTagSlug(snapshot.site.name),
    ...(resolvedCategories.secondary.includes("domain-dns")
      ? ["dns", "whois"]
      : []),
    ...(facts.approved_public_scam_report_count > 0 ? ["scam-reports"] : []),
    ...(facts.approved_review_count > 0 ? ["user-reviews"] : []),
    ...(snapshot.derived_facts.additional_domains.length > 0 ? ["domains"] : []),
    ...(snapshot.derived_facts.name_servers.length > 0 ? ["nameservers"] : []),
    ...(hasCloudflare ? ["cloudflare"] : []),
    ...(resolvedCategories.secondary.includes("change-history")
      ? ["change-history"]
      : []),
  ]).filter(Boolean);

  return {
    primary_category_slug: categoryClassification.primary_category,
    secondary_category_slugs: categoryClassification.secondary_categories,
    tag_slugs: tagSlugs.slice(0, 12),
    reason:
      "이 글은 특정 토토사이트의 도메인, DNS, WHOIS, 먹튀 제보, 승인 리뷰를 종합 정리하는 사이트 정보 리포트이므로 site-reports를 대표 카테고리로 지정한다.",
  };
}

function normalizeTitle(title: string, siteName: string) {
  return title
    .replace(siteName, "{사이트명}")
    .replace(/\d+건/g, "{n}건")
    .replace(/\d+개/g, "{n}개")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTitleUniqueness(title: string, facts: BlogFacts) {
  let score = 0;

  if (title.includes(String(facts.approved_review_count))) score += 1;
  if (title.includes(String(facts.approved_public_scam_report_count))) score += 1;
  if (title.includes(String(facts.additional_domain_count))) score += 1;
  if (title.includes("WHOIS")) score += 1;
  if (title.includes("DNS")) score += 1;
  if (title.includes("네임서버")) score += 1;
  if (title.includes("리뷰")) score += 1;
  if (title.includes("먹튀 제보")) score += 1;

  return score;
}

function getBlogSourceSnapshotSiteName(sourceSnapshot: unknown) {
  if (!isRecord(sourceSnapshot)) return null;

  const seoTitleSignals =
    sourceSnapshot.seoTitleSignals ?? sourceSnapshot.seo_title_signals;

  if (isRecord(seoTitleSignals) && typeof seoTitleSignals.site_name === "string") {
    return seoTitleSignals.site_name;
  }

  const snapshot = sourceSnapshot.snapshot;

  if (!isRecord(snapshot)) return null;

  const site = snapshot.site;

  if (isRecord(site) && typeof site.name === "string") {
    return site.name;
  }

  return null;
}

async function countBlogPostsByNormalizedTitlePattern({
  supabase,
  normalizedPattern,
  siteName,
}: {
  supabase: SupabaseClient;
  normalizedPattern: string;
  siteName: string;
}) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("title, source_snapshot")
    .eq("status", "published")
    .limit(1000);

  if (error) {
    throw new Error(`제목 패턴 반복 검사를 수행하지 못했습니다: ${error.message}`);
  }

  return ((data ?? []) as Array<{ title: string | null; source_snapshot: unknown }>)
    .filter((row) => row.title)
    .filter((row) => {
      const existingSiteName =
        getBlogSourceSnapshotSiteName(row.source_snapshot) ?? siteName;

      return normalizeTitle(row.title ?? "", existingSiteName) === normalizedPattern;
    }).length;
}

async function reviewTitleQuality({
  supabase,
  title,
  siteName,
  snapshot,
}: {
  supabase: SupabaseClient;
  title: string;
  siteName: string;
  snapshot: SourceSnapshot;
}): Promise<TitleQualityReview> {
  const facts = getSeoTitleSignals(snapshot);
  const normalizedPattern = normalizeTitle(title, siteName);
  const samePatternCount = await countBlogPostsByNormalizedTitlePattern({
    supabase,
    normalizedPattern,
    siteName,
  });
  const uniquenessScore = scoreTitleUniqueness(title, facts);
  const warnings: string[] = [];

  if (samePatternCount >= 5) {
    warnings.push(
      "동일한 제목 패턴이 여러 글에서 반복되고 있습니다. 사이트 고유 데이터가 더 반영된 제목으로 수정하세요.",
    );
  }

  if (uniquenessScore < 2) {
    warnings.push("제목에 사이트 고유 데이터가 부족합니다.");
  }

  return {
    normalized_pattern: normalizedPattern,
    same_pattern_count: samePatternCount,
    uniqueness_score: uniquenessScore,
    title_similarity_warning: samePatternCount >= 5,
    warnings,
    requires_legal_review: samePatternCount >= 5,
  };
}

const duplicateRiskRank: Record<BlogDuplicateRisk, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  failed: 4,
};

function getDuplicateRiskFromTitleQuality(
  titleQualityReview: TitleQualityReview,
): BlogDuplicateRisk {
  if (titleQualityReview.same_pattern_count >= 5) return "high";
  if (titleQualityReview.same_pattern_count >= 2) return "medium";
  return "low";
}

function getDuplicateRiskFromFinalReview({
  finalReview,
  titleQualityReview,
}: {
  finalReview: FinalReviewOutput;
  titleQualityReview: TitleQualityReview;
}): BlogDuplicateRisk {
  const finalReviewRisk = finalReview.duplicate_risk_check.estimated_duplicate_risk;
  const titleRisk = getDuplicateRiskFromTitleQuality(titleQualityReview);

  return duplicateRiskRank[finalReviewRisk] >= duplicateRiskRank[titleRisk]
    ? finalReviewRisk
    : titleRisk;
}

function maxDuplicateRisk(...risks: BlogDuplicateRisk[]): BlogDuplicateRisk {
  return risks.reduce<BlogDuplicateRisk>(
    (maxRisk, risk) =>
      duplicateRiskRank[risk] > duplicateRiskRank[maxRisk] ? risk : maxRisk,
    "unknown",
  );
}

function getUniqueFactScoreFromFinalReview(
  finalReview: FinalReviewOutput,
  fallback: number,
) {
  const scores = [
    finalReview.unique_fact_score,
    finalReview.duplicate_risk_check.unique_fact_score,
  ].filter((score) => Number.isFinite(score) && score >= 0);

  if (scores.length === 0) return fallback;
  return Math.round(Math.min(...scores));
}

function getSeoReviewStatusFromQuality(
  titleQualityReview: TitleQualityReview,
  duplicateRisk: BlogDuplicateRisk,
  draftSeoReviewStatus: BlogSeoReviewStatus,
): BlogSeoReviewStatus {
  if (draftSeoReviewStatus === "failed") return "failed";
  if (duplicateRisk === "failed") return "failed";
  if (
    draftSeoReviewStatus === "warning" ||
    duplicateRisk === "high" ||
    duplicateRisk === "medium" ||
    titleQualityReview.warnings.length > 0
  ) {
    return "warning";
  }

  return "passed";
}

function getSectionHeadingsFromUnknown(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.heading !== "string") return [];
    return [item.heading];
  });
}

function mapDuplicateComparisonBlogRow(
  row: DuplicateComparisonBlogRow,
  fallbackSiteName: string,
): BlogDuplicateComparisonPost {
  return {
    id: row.id,
    slug: row.slug,
    siteName: getBlogSourceSnapshotSiteName(row.source_snapshot) ?? fallbackSiteName,
    title: row.title,
    bodyMd: row.body_md,
    h2Headings: getSectionHeadingsFromUnknown(row.sections),
    normalizedTitlePattern: row.normalized_title_pattern,
    normalizedH2Pattern: row.normalized_h2_pattern,
  };
}

async function getDuplicateComparisonPosts({
  supabase,
  primaryCategory,
  excludePostId,
  fallbackSiteName,
}: {
  supabase: SupabaseClient;
  primaryCategory: BlogCategorySlug;
  excludePostId?: string | null;
  fallbackSiteName: string;
}) {
  const [recentResult, categoryResult] = await Promise.all([
    supabase
      .from("blog_posts")
      .select(duplicateComparisonBlogSelect)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from("blog_posts")
      .select(duplicateComparisonBlogSelect)
      .eq("status", "published")
      .eq("primary_category", primaryCategory)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100),
  ]);

  if (recentResult.error) {
    throw new Error(
      `최근 published 블로그 중복 검사를 수행하지 못했습니다: ${recentResult.error.message}`,
    );
  }

  if (categoryResult.error) {
    throw new Error(
      `같은 카테고리 published 블로그 중복 검사를 수행하지 못했습니다: ${categoryResult.error.message}`,
    );
  }

  const byId = new Map<string, DuplicateComparisonBlogRow>();

  for (const row of [
    ...((recentResult.data ?? []) as unknown as DuplicateComparisonBlogRow[]),
    ...((categoryResult.data ?? []) as unknown as DuplicateComparisonBlogRow[]),
  ]) {
    if (excludePostId && row.id === excludePostId) continue;
    byId.set(row.id, row);
  }

  return Array.from(byId.values()).map((row) =>
    mapDuplicateComparisonBlogRow(row, fallbackSiteName),
  );
}

function createSha256Hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function saveBlogContentFingerprint({
  supabase,
  postId,
  siteId,
  bodyMd,
  duplicateReview,
}: {
  supabase: SupabaseClient;
  postId: string;
  siteId: string;
  bodyMd: string;
  duplicateReview: BlogDuplicateRiskReview;
}) {
  const { error } = await supabase.from("blog_content_fingerprints").insert({
    post_id: postId,
    site_id: siteId,
    title_pattern: duplicateReview.normalizedTitlePattern,
    h2_pattern: duplicateReview.normalizedH2Pattern,
    content_hash: createSha256Hash(bodyMd),
    normalized_content_hash: createSha256Hash(duplicateReview.normalizedBody),
    unique_fact_score: duplicateReview.uniqueFactScore,
    similarity_score: duplicateReview.maxBodySimilarity,
  });

  if (error) {
    throw new Error(
      `블로그 콘텐츠 fingerprint를 저장하지 못했습니다: ${error.message}`,
    );
  }
}

function normalizeMarkdownTitle(markdown: string, title: string) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return `# ${title}`;
  }

  const lines = normalized.split("\n");

  if (lines[0]?.startsWith("# ")) {
    lines[0] = `# ${title}`;
    return lines.join("\n").trim();
  }

  return [`# ${title}`, "", ...lines].join("\n").trim();
}

function parseHttpUrl(value: string) {
  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl;
    }
  } catch {
    return null;
  }

  return null;
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function isBlockedExternalLinkTarget(url: string) {
  const parsedUrl = parseHttpUrl(url);

  if (!parsedUrl) return false;

  const targetText = [
    parsedUrl.hostname,
    parsedUrl.pathname,
    parsedUrl.search,
    parsedUrl.hash,
  ].join(" ");

  try {
    return blockedExternalLinkTargetPattern.test(decodeURIComponent(targetText));
  } catch {
    return blockedExternalLinkTargetPattern.test(targetText);
  }
}

function toNonClickableUrlText(url: string) {
  const parsedUrl = parseHttpUrl(url);
  const rawText = parsedUrl
    ? `${parsedUrl.hostname}${parsedUrl.pathname === "/" ? "" : parsedUrl.pathname}`
    : url.replace(/^https?:\/\//i, "");

  return rawText.replace(/\./g, "[.]");
}

function replaceExternalUrlWithText(url: string, label = "") {
  const trimmedLabel = stripHtmlTags(label);

  if (isBlockedExternalLinkTarget(url)) {
    return trimmedLabel || "외부 연결 정보";
  }

  const nonClickableUrl = toNonClickableUrlText(url);
  return trimmedLabel ? `${trimmedLabel} (${nonClickableUrl})` : nonClickableUrl;
}

function replaceRawExternalUrl(match: string) {
  const trailingPunctuationMatch = match.match(/[),.;:!?]+$/);
  const trailingPunctuation = trailingPunctuationMatch?.[0] ?? "";
  const url = trailingPunctuation
    ? match.slice(0, -trailingPunctuation.length)
    : match;

  return `${replaceExternalUrlWithText(url)}${trailingPunctuation}`;
}

function sanitizeExternalLinksInMarkdown(markdown: string) {
  return markdown
    .replace(
      /<a\s+[^>]*href\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_match, url: string, label: string) =>
        replaceExternalUrlWithText(url, label),
    )
    .replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/gi,
      (_match, label: string, url: string) =>
        replaceExternalUrlWithText(url, label || "외부 이미지"),
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)/gi,
      (_match, label: string, url: string) =>
        replaceExternalUrlWithText(url, label),
    )
    .replace(/<https?:\/\/[^>\s]+>/gi, (match) =>
      replaceRawExternalUrl(match.slice(1, -1)),
    )
    .replace(/https?:\/\/[^\s<>"']+/gi, replaceRawExternalUrl);
}

function rewriteRepeatedInternalMarkdownAnchors(markdown: string, h1: string) {
  const siteName = extractSiteNameFromH1(h1);
  const usedAnchorsByHref = new Map<string, Set<string>>();
  let currentHeading = "";

  return markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const headingMatch = line.trim().match(/^#{1,6}\s+(.+)$/);

      if (headingMatch) {
        currentHeading = headingMatch[1]?.trim() ?? "";
      }

      return line.replace(
        /(^|[^!])\[([^\]\n]+)\]\((\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
        (match, prefix: string, label: string, href: string) => {
          if (href.startsWith("//")) return match;

          const hrefKey = normalizeInternalMarkdownHrefKey(href);
          const usedAnchors =
            usedAnchorsByHref.get(hrefKey) ?? new Set<string>();
          const placement = getMarkdownInternalAnchorPlacement({
            href,
            heading: currentHeading,
          });
          let nextLabel = label.trim();
          let normalizedLabel = normalizeInternalAnchorLabel(nextLabel);

          if (
            usedAnchors.has(normalizedLabel) ||
            (placement !== "summary" &&
              isGenericSiteDetailAnchor(nextLabel, siteName))
          ) {
            nextLabel = getPlacementInternalAnchorText({ siteName, placement });
            normalizedLabel = normalizeInternalAnchorLabel(nextLabel);
          }

          if (usedAnchors.has(normalizedLabel)) {
            nextLabel = `${nextLabel} ${usedAnchors.size + 1}`;
            normalizedLabel = normalizeInternalAnchorLabel(nextLabel);
          }

          usedAnchors.add(normalizedLabel);
          usedAnchorsByHref.set(hrefKey, usedAnchors);

          return `${prefix}[${nextLabel}](${href})`;
        },
      );
    })
    .join("\n");
}

function extractSiteNameFromH1(h1: string) {
  const normalized = h1.replace(/^#\s+/, "").trim();
  const siteNameMatch = normalized.match(/^(.+?)\s*토토사이트/u);

  return siteNameMatch?.[1]?.trim() || "{사이트명}";
}

function normalizeInternalMarkdownHrefKey(href: string) {
  const normalizedHref = href.trim();

  if (/^\/sites\/[^/?#]+(?:[?#].*)?$/i.test(normalizedHref)) {
    return normalizedHref.split("#")[0]?.split("?")[0] ?? normalizedHref;
  }

  return normalizedHref;
}

function normalizeInternalAnchorLabel(label: string) {
  return label.replace(/\s+/g, " ").trim().toLowerCase();
}

function getMarkdownInternalAnchorPlacement({
  href,
  heading,
}: {
  href: string;
  heading: string;
}): InternalAnchorPlacement {
  const hash = href.split("#")[1]?.trim().toLowerCase() ?? "";
  const normalizedHeading = heading.toLowerCase();

  if (hash === "reports" || hash === "scam-reports") {
    return "reports_section";
  }

  if (hash === "reviews") {
    return "reviews_section";
  }

  if (
    hash === "dns" &&
    (normalizedHeading.includes("주소") ||
      normalizedHeading.includes("도메인")) &&
    !isDnsSpecificHeading(normalizedHeading)
  ) {
    return "address_domain_section";
  }

  if (hash === "dns" || isDnsSpecificHeading(normalizedHeading)) {
    return "dns_section";
  }

  if (
    normalizedHeading.includes("피해") ||
    normalizedHeading.includes("제보") ||
    normalizedHeading.includes("먹튀")
  ) {
    return "reports_section";
  }

  if (
    normalizedHeading.includes("리뷰") ||
    normalizedHeading.includes("후기") ||
    normalizedHeading.includes("이용 경험")
  ) {
    return "reviews_section";
  }

  if (
    normalizedHeading.includes("주소") ||
    normalizedHeading.includes("도메인")
  ) {
    return "address_domain_section";
  }

  return "summary";
}

function isDnsSpecificHeading(heading: string) {
  return (
    heading.includes("dns") ||
    heading.includes("whois") ||
    heading.includes("네임서버") ||
    heading.includes("ip")
  );
}

function isGenericSiteDetailAnchor(label: string, siteName: string) {
  const normalizedLabel = normalizeInternalAnchorLabel(label);
  const normalizedSiteName = normalizeInternalAnchorLabel(siteName);
  const genericLabels = [
    `${normalizedSiteName} 상세`,
    `${normalizedSiteName} 상세 정보`,
    `${normalizedSiteName} 상세 정보 페이지`,
    "상세",
    "상세 정보",
    "상세 정보 페이지",
  ];

  return genericLabels.includes(normalizedLabel);
}

function withoutExactNoticeLines(markdown: string) {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n*##\s+작성 기준 및 고지[\s\S]*?(?=\n##\s|$)/g, "")
    .split("\n")
    .filter((line) => {
      const normalizedLine = line.trim().replace(/^[-*]\s+/, "");
      return !requiredBlogNoticeLines.some(
        (noticeLine) => normalizedLine === noticeLine,
      );
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendRequiredBlogNotices(markdown: string) {
  const bodyWithoutDuplicateNotices = withoutExactNoticeLines(markdown);
  const heading = "## 작성 기준 및 고지";
  const lastHeading = Array.from(
    bodyWithoutDuplicateNotices.matchAll(/^##\s+(.+)$/gm),
  ).at(-1)?.[1]?.trim();
  const noticeBlock = requiredBlogNoticeLines.join("\n\n");

  if (lastHeading === "작성 기준 및 고지") {
    return `${bodyWithoutDuplicateNotices}\n\n${noticeBlock}`.trim();
  }

  return `${bodyWithoutDuplicateNotices}\n\n${heading}\n\n${noticeBlock}`.trim();
}

const internalPlanningContentPatterns = [
  /\bai\s*planner\b/i,
  /\bwriting\s*brief\b/i,
  /\bsearch\s*intent\b/i,
  /\bconfirmed\s*facts?\b/i,
  /\binferences?\b/i,
  /\bunknowns?\b/i,
  /\bclaim\s*map\b/i,
  /\bkeyword\s*list\b/i,
  /\bprimary_keyword\b/i,
  /\bsecondary_keywords\b/i,
  /\bsearch_intent\b/i,
  /\bconfirmed_facts\b/i,
  /\bwriting_brief\b/i,
  /\bprohibited_phrase_check\b/i,
  /검색\s*의도/,
  /확인된\s*사실/,
  /미확인\s*항목/,
  /현재\s*확인되지\s*않은\s*항목/,
  /클레임\s*맵/,
  /키워드\s*(목록|리스트)/,
  /작성\s*브리프/,
];

function isInternalPlanningContent(value: string) {
  const text = value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .trim();

  if (!text) return false;
  return internalPlanningContentPatterns.some((pattern) => pattern.test(text));
}

function stripInternalPlanningMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let skipSection = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      skipSection = isInternalPlanningContent(headingMatch[2]);
      if (skipSection) continue;
    }

    if (skipSection) continue;

    if (/^[-*]?\s*[^:：]{1,40}[:：]/.test(trimmed) && isInternalPlanningContent(trimmed)) {
      continue;
    }

    output.push(rawLine);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function appendMissingRequiredBlogReportSections(
  markdown: string,
  snapshot: SourceSnapshot,
) {
  const coverage = validateRequiredBlogReportSectionCoverage({
    siteName: snapshot.site.name,
    bodyMd: markdown,
  });

  if (coverage.missingHeadings.length === 0) {
    return markdown;
  }

  const expectedHeadings = getRequiredBlogReportHeadings(snapshot.site.name);
  const missingSections = expectedHeadings
    .filter((heading) => coverage.missingHeadings.includes(heading))
    .map((heading) =>
      [`## ${heading}`, buildRequiredSectionFallbackText(heading, snapshot)]
        .filter(Boolean)
        .join("\n\n"),
    );

  return [markdown.trim(), ...missingSections]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildRequiredSectionFallbackText(
  heading: string,
  snapshot: SourceSnapshot,
) {
  const siteName = snapshot.site.name;
  const crawlSnapshot = snapshot.crawl_snapshot;
  const representativeDomain = snapshot.derived_facts.primary_domain_display;
  const additionalDomainCount = snapshot.derived_facts.additional_domains.length;
  const dnsRecordTypes = uniqueStrings(
    snapshot.dns_records.map((record) => record.record_type),
  );
  const checkedAt =
    snapshot.snapshot_at ??
    snapshot.generatedAt ??
    snapshot.derived_facts.dns_last_checked_at ??
    snapshot.derived_facts.whois_last_checked_at;

  if (heading.includes("토토사이트 정보 요약")) {
    return `${siteName} 토토사이트는 ${representativeDomain || "대표 도메인 미확인"} 기준으로 주소·도메인, 원본 사이트 관측 정보, DNS·WHOIS, 먹튀 제보와 후기 현황을 함께 확인하는 정보 리포트 대상입니다. 조회 시점 기준 승인 리뷰 ${snapshot.reviews_summary.approved_review_count}건, 승인 피해 제보 ${snapshot.scam_reports_summary.approved_public_report_count}건, 추가 도메인 ${additionalDomainCount}개가 저장 데이터에 정리되어 있습니다.`;
  }

  if (heading.includes("원본 사이트 관측 정보")) {
    if (!crawlSnapshot) {
      return "조회 시점 기준 연결된 원본 사이트 관측 스냅샷은 아직 확인되지 않았습니다. 따라서 이 글에서는 저장된 사이트 설명과 도메인·DNS·WHOIS 데이터 중심으로 한계를 분리해 설명합니다.";
    }

    return `원본 사이트 관측 정보는 ${formatSectionDate(crawlSnapshot.collected_at)} 기준 공개 HTML에서 확인된 화면 기록입니다. page title과 H1, 메타 설명은 사이트 식별 보조 자료로만 사용하며, 원문 문구를 그대로 옮기거나 이용을 권유하는 방식으로 해석하지 않습니다.`;
  }

  if (heading.includes("주소와 도메인 현황")) {
    const domains = [snapshot.derived_facts.primary_domain_display, ...snapshot.derived_facts.additional_domains_display]
      .filter(Boolean)
      .slice(0, 5)
      .join(", ");

    return `${siteName} 주소와 도메인 현황은 대표 도메인 ${representativeDomain || "확인되지 않음"}과 추가 승인 도메인 ${additionalDomainCount}개를 기준으로 정리합니다.${domains ? ` 확인된 도메인 표기는 ${domains}입니다.` : ""} 외부 사이트로 이동하는 링크는 제공하지 않고 내부 상세 기록에서 변동 여부를 확인하도록 구성합니다.`;
  }

  if (heading.includes("도메인 DNS·WHOIS 조회 결과")) {
    const dnsSummary = dnsRecordTypes.length
      ? `${dnsRecordTypes.join(", ")} 레코드 유형`
      : "저장된 DNS 레코드 없음";

    return `${siteName} 도메인 DNS·WHOIS 조회 결과는 ${dnsSummary}, WHOIS 등록일 ${snapshot.derived_facts.domain_created_date ?? "확인되지 않음"}, 네임서버 ${snapshot.derived_facts.name_servers.length}개를 기준으로 요약합니다. DNS와 WHOIS 정보는 조회 시점에 따라 달라질 수 있어 운영 주체나 안전성을 단정하는 근거로 사용하지 않습니다.`;
  }

  if (heading.includes("화면 구성에서 관측된 주요 요소")) {
    const menuSummary = formatObservationSummary(
      crawlSnapshot?.observed_menu_labels,
      "주요 메뉴",
    );
    const badgeSummary = formatObservationSummary(
      crawlSnapshot?.observed_badges,
      "배지",
    );
    const footerSummary = formatObservationSummary(
      crawlSnapshot?.observed_footer_text,
      "footer/copyright",
    );

    return `${siteName} 화면 구성은 ${menuSummary}, ${badgeSummary}, ${footerSummary} 관측값을 중심으로 요약합니다. 세부 메뉴 전체를 나열하기보다 사이트 식별과 화면 기록 확인에 필요한 흐름만 정리합니다.`;
  }

  if (heading.includes("계정·게임·결제 관련 관측 정보")) {
    const accountSummary = formatObservationSummary(
      crawlSnapshot?.observed_account_features,
      "계정 관련 요소",
    );
    const bettingSummary = formatObservationSummary(
      crawlSnapshot?.observed_betting_features,
      "게임·베팅 관련 요소",
    );
    const paymentSummary = formatObservationSummary(
      crawlSnapshot?.observed_payment_flags,
      "결제 관련 표현",
    );

    return `${siteName} 계정·게임·결제 관련 관측 정보는 ${accountSummary}, ${bettingSummary}, ${paymentSummary}를 구분해 기록합니다. 이 항목은 화면에 어떤 유형의 요소가 보였는지 설명하는 자료일 뿐 이용 절차나 혜택을 안내하는 문맥으로 사용하지 않습니다.`;
  }

  if (heading.includes("먹튀 제보 현황")) {
    return `${siteName} 먹튀 제보 현황은 조회 시점 기준 승인되어 공개 처리된 피해 제보 ${snapshot.scam_reports_summary.approved_public_report_count}건을 기준으로 합니다. 제보가 확인되지 않는 경우에도 위험이 없다는 의미로 해석하지 않고, 현재 승인된 제보가 확인되지 않았다는 사실만 분리합니다.`;
  }

  if (heading.includes("후기 데이터 현황")) {
    const averageRating = snapshot.reviews_summary.average_rating;

    return `${siteName} 후기 데이터 현황은 승인 리뷰 ${snapshot.reviews_summary.approved_review_count}건${typeof averageRating === "number" ? `, 평균 평점 ${averageRating.toFixed(1)}점` : ""}을 기준으로 요약합니다. 후기 내용은 결제, 고객지원, 계정 제한, 화면 이용 경험처럼 반복되는 신호를 확인하는 보조 데이터로 다룹니다.`;
  }

  if (heading.includes("확인되지 않은 항목과 해석상 한계")) {
    return `${siteName} 관련 자료 중 DNS·WHOIS 조회 실패, 관측 스냅샷 부재, 리뷰 또는 제보 부족처럼 확인되지 않은 항목은 별도로 분리해야 합니다. 조회 시점 기준 데이터만으로 운영 주체, 안전성, 피해 가능성을 단정하지 않습니다.`;
  }

  if (heading.includes("이용 전 확인할 체크리스트")) {
    return [
      `- 대표 도메인과 추가 도메인 ${additionalDomainCount}개가 내부 상세 기록과 일치하는지 확인합니다.`,
      `- DNS·WHOIS 조회 시각과 레코드 유형이 ${formatSectionDate(checkedAt)} 기준인지 확인합니다.`,
      "- 승인된 먹튀 제보와 후기 수를 함께 확인하되, 제보 부재를 안전 보장으로 해석하지 않습니다.",
      "- 원본 사이트 관측 정보는 화면 기록 확인용 자료로만 보고 이용 절차 안내로 사용하지 않습니다.",
    ].join("\n");
  }

  if (heading.includes("토토사이트 FAQ")) {
    return [
      `**${siteName} 주소는 어떻게 확인하나요?** 내부 사이트 상세 기록의 대표 도메인과 추가 승인 도메인 기준으로 확인합니다.`,
      `**${siteName} 먹튀 제보는 어떻게 보나요?** 승인되어 공개 처리된 피해 제보 수와 접수 시점을 기준으로 확인합니다.`,
      `**${siteName} 후기는 어떤 기준으로 해석하나요?** 승인 리뷰 수, 작성 시점, 반복되는 이용 경험 신호를 함께 봅니다.`,
    ].join("\n\n");
  }

  return `${siteName} 관련 정보는 조회 시점 기준 저장된 확인 데이터만 사용해 정리합니다.`;
}

function formatObservationSummary(
  values: unknown[] | null | undefined,
  label: string,
) {
  const safeItems = toSafeObservationItems(values);

  if (safeItems.length === 0) {
    return `${label} 확인 항목 없음`;
  }

  return `${label} ${safeItems.length}개${safeItems.length ? ` (${safeItems.slice(0, 3).join(", ")})` : ""}`;
}

function toSafeObservationItems(values: unknown[] | null | undefined) {
  if (!Array.isArray(values)) return [];

  return uniqueStrings(
    values.flatMap((value) => {
      if (typeof value === "string") return [value];
      if (!isRecord(value)) return [];

      return [
        value.label,
        value.text,
        value.title,
        value.name,
      ].filter((item): item is string => typeof item === "string");
    }),
  )
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value && !isPromotionalObservationTerm(value))
    .slice(0, 8);
}

function isPromotionalObservationTerm(value: string) {
  return /가입|보너스|이벤트|추천|바로가기|최신\s*주소|우회\s*주소|첫충|매충|쿠폰/i.test(
    value,
  );
}

function formatSectionDate(value: string | null | undefined) {
  return value ? formatSeoTitleDate(value) || value : "조회 시점";
}

function normalizeBlogMarkdown(
  markdown: string,
  h1: string,
  verificationSummary?: BlogVerificationSummary | null,
  snapshot?: SourceSnapshot | null,
) {
  const normalized = normalizeMarkdownTitle(
    stripInternalPlanningMarkdown(
      rewriteRepeatedInternalMarkdownAnchors(
        sanitizeExternalLinksInMarkdown(markdown),
        h1,
      ),
    ),
    h1,
  );
  const withRequiredSections = snapshot
    ? appendMissingRequiredBlogReportSections(normalized, snapshot)
    : normalized;
  const withVerification = verificationSummary
    ? appendBlogVerificationMarkdown(withRequiredSections, verificationSummary)
    : withRequiredSections;

  return appendRequiredBlogNotices(
    withVerification,
  );
}

function sanitizePublicBody({
  markdown,
  h1,
  verificationSummary,
  snapshot,
}: {
  markdown: string;
  h1: string;
  verificationSummary?: BlogVerificationSummary | null;
  snapshot?: SourceSnapshot | null;
}) {
  return normalizeBlogMarkdown(markdown, h1, verificationSummary, snapshot);
}

function normalizeSeoPlan(
  seoPlan: SeoPlanningOutput,
  snapshot: SourceSnapshot,
  updateContext?: BlogUpdateContext | null,
): SeoPlanningOutput {
  const { primaryKeyword, secondaryKeywords } = getSeoKeywords(snapshot);
  const recommendedTitle = getSeoTitle(snapshot);
  const metaTitle = getSeoMetaTitle(snapshot);
  const metaDescription = getSeoMetaDescription(snapshot);
  const requiredRiskWarnings = [
    "추천, 홍보, 가입 유도 표현 금지",
    "안전 보장 또는 먹튀 없음 단정 금지",
    "WHOIS 비공개, CDN, 동일 IP 관측만으로 운영 주체 또는 위험도 단정 금지",
    "원본 사이트 관측 정보는 사이트 식별과 화면 기록 확인 목적으로만 사용",
  ];
  const plannedSectionFacts = uniqueStrings([
    ...seoPlan.confirmed_facts,
    ...seoPlan.section_plan.flatMap((section) => section.must_include_facts),
  ]);

  return {
    ...seoPlan,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondaryKeywords,
    recommended_title: recommendedTitle,
    title_strategy: getSeoTitleStrategy(snapshot),
    title_candidates: uniqueStrings([
      recommendedTitle,
      ...seoPlan.title_candidates.filter(
        (title) => title.trim() && !hasForbiddenSeoTitlePhrase(title),
      ),
    ]),
    category_strategy: getBlogCategoryStrategy(snapshot, updateContext),
    meta_title: metaTitle,
    meta_description: metaDescription,
    search_intent: {
      main_intent: seoPlan.search_intent.main_intent || "정보 확인",
      sub_intents: seoPlan.search_intent.sub_intents.length
        ? seoPlan.search_intent.sub_intents
        : [
            "현재 알려진 도메인 확인",
            "먹튀 피해 제보 여부 확인",
            "이용자 리뷰 확인",
            "DNS/WHOIS 기반 정보 확인",
          ],
    },
    section_plan: getRequiredBlogReportHeadings(snapshot.site.name).map(
      (heading) => ({
        heading,
        purpose:
          "사이트 관측 정보, 주소·도메인, DNS·WHOIS, 먹튀 제보, 후기 현황을 종합 리포트 흐름으로 설명합니다.",
        must_include_facts: plannedSectionFacts,
        must_avoid: requiredRiskWarnings,
      }),
    ),
    risk_warnings: uniqueStrings([
      ...seoPlan.risk_warnings,
      ...requiredRiskWarnings,
    ]),
  };
}

function normalizeFinalReviewCategoryStrategy(
  finalReview: FinalReviewOutput,
  seoPlan: SeoPlanningOutput,
): FinalReviewOutput {
  return {
    ...finalReview,
    category_strategy: seoPlan.category_strategy,
  };
}

function buildOpenAiAnalysisPrompt(
  snapshot: SourceSnapshot,
  preferredSlug: string,
  updateContext?: BlogUpdateContext | null,
) {
  const hasLookupFailures = hasDnsOrWhoisLookupFailures(snapshot);
  const { siteName, primaryKeyword, secondaryKeywords } = getSeoKeywords(snapshot);

  return buildOpenAiPlannerPrompt({
    siteName,
    primaryKeyword,
    secondaryKeywords,
    seoTitle: getSeoTitle(snapshot),
    seoMetaTitle: getSeoMetaTitle(snapshot),
    seoH1: getSeoH1(snapshot),
    seoMetaDescription: getSeoMetaDescription(snapshot),
    preferredSlug,
    noticeLines: requiredBlogNoticeLines,
    hasLookupFailures,
    snapshot,
    updateContext: updateContext
      ? {
          previous_post: updateContext.previousPost,
          change_summary: updateContext.changeSummary,
        }
      : undefined,
  });
}

function hasDnsOrWhoisLookupFailures(snapshot: SourceSnapshot) {
  return (
    snapshot.derived_facts.dns_lookup_statuses.some(
      (status) => status.lookup_status === "failed",
    ) ||
    snapshot.derived_facts.whois_lookup_statuses.some(
      (status) => status.lookup_status === "failed",
    )
  );
}

function buildClaudePrompt(
  snapshot: SourceSnapshot,
  seoPlan: SeoPlanningOutput,
  updateContext?: BlogUpdateContext | null,
) {
  return buildClaudeWriterPrompt({
    snapshot,
    seoPlan,
    seoTitle: getSeoTitle(snapshot),
    seoH1: getSeoH1(snapshot),
    noticeLines: requiredBlogNoticeLines,
    hasLookupFailures: hasDnsOrWhoisLookupFailures(snapshot),
    updateContext,
  });
}

function buildFinalOpenAiPrompt({
  snapshot,
  seoPlan,
  claudeDraft,
  preferredSlug,
  updateContext,
  previousViolations,
}: {
  snapshot: SourceSnapshot;
  seoPlan: SeoPlanningOutput;
  claudeDraft: ClaudeDraftOutput;
  preferredSlug: string;
  updateContext?: BlogUpdateContext | null;
  previousViolations?: SafetyViolation[];
}) {
  const { primaryKeyword, secondaryKeywords } = getSeoKeywords(snapshot);

  return buildOpenAiValidatorPrompt({
    snapshot,
    siteName: snapshot.site.name,
    seoPlan,
    claudeDraft,
    preferredSlug,
    primaryKeyword,
    secondaryKeywords,
    seoTitle: getSeoTitle(snapshot),
    seoMetaTitle: getSeoMetaTitle(snapshot),
    seoH1: getSeoH1(snapshot),
    seoMetaDescription: getSeoMetaDescription(snapshot),
    noticeLines: requiredBlogNoticeLines,
    hasLookupFailures: hasDnsOrWhoisLookupFailures(snapshot),
    updateContext,
    previousViolations,
  });
}

function normalizeClaudeDraft(
  draft: ClaudeDraftOutput,
  snapshot: SourceSnapshot,
): ClaudeDraftOutput {
  const fallbackTitle = `# ${getSeoH1(snapshot)}`;
  const markdown = draft.draft_markdown.trim();
  const titledMarkdown = markdown.startsWith("#")
    ? markdown
    : `${fallbackTitle}\n\n${markdown}`;

  return {
    draft_markdown: appendRequiredBlogNotices(titledMarkdown),
    faq: draft.faq
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer),
    checklist: draft.checklist
      .map((item) => ({
        item: item.item.trim(),
        reason: item.reason.trim(),
      }))
      .filter((item) => item.item && item.reason),
    editor_notes: draft.editor_notes.map((item) => item.trim()).filter(Boolean),
  };
}

function markdownToSections(markdown: string): BlogDraft["sections"] {
  const sections: BlogDraft["sections"] = [];
  let current: BlogDraft["sections"][number] | null = null;

  const pushCurrent = () => {
    if (current && current.heading && current.paragraphs.length > 0) {
      sections.push(current);
    }
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const [, hashes, heading] = headingMatch;
      if (hashes === "#") continue;

      pushCurrent();
      current = {
        heading: heading.trim(),
        paragraphs: [],
        bullets: [],
      };
      continue;
    }

    if (!current) {
      current = {
        heading: "핵심 요약",
        paragraphs: [],
        bullets: [],
      };
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      current.bullets.push(bulletMatch[1].trim());
      continue;
    }

    current.paragraphs.push(line.replace(/^>\s*/, ""));
  }

  pushCurrent();

  if (sections.length > 0) return sections;

  return [
    {
      heading: "핵심 요약",
      paragraphs: [markdown.trim()].filter(Boolean),
      bullets: [],
    },
  ];
}

function finalSummaryToText(snapshot: SourceSnapshot) {
  const siteName = snapshot.site.name;
  const reviewCount = snapshot.reviews_summary.approved_review_count;
  const reportCount = snapshot.scam_reports_summary.approved_public_report_count;
  const domainCount = snapshot.derived_facts.additional_domains.length;
  const checkedAt =
    formatSeoTitleDate(snapshot.derived_facts.dns_last_checked_at) ||
    formatSeoTitleDate(snapshot.derived_facts.whois_last_checked_at) ||
    "조회 시점";

  return `${siteName} 토토사이트의 원본 사이트 관측 정보, 후기 ${reviewCount}건, 먹튀 제보 ${reportCount}건, 추가 도메인 ${domainCount}개와 DNS/WHOIS 정보를 ${checkedAt} 기준으로 정리했습니다.`;
}

function prohibitedCheckViolations(
  output: FinalReviewOutput,
): SafetyViolation[] {
  const labels: Array<[keyof ProhibitedPhraseCheck, string, string]> = [
    [
      "contains_recommendation",
      "추천 표현",
      "최종 OpenAI 검수에서 추천 표현 가능성이 감지되었습니다.",
    ],
    [
      "contains_signup_cta",
      "가입 유도",
      "최종 OpenAI 검수에서 가입 유도 가능성이 감지되었습니다.",
    ],
    [
      "contains_bonus_or_event_promo",
      "혜택 홍보",
      "최종 OpenAI 검수에서 보너스 또는 이벤트 홍보 가능성이 감지되었습니다.",
    ],
    [
      "contains_absolute_safety_claim",
      "안전 단정",
      "최종 OpenAI 검수에서 안전 보장 또는 단정 표현 가능성이 감지되었습니다.",
    ],
    [
      "contains_uncited_claims",
      "근거 없는 주장",
      "최종 OpenAI 검수에서 확인되지 않은 주장 가능성이 감지되었습니다.",
    ],
    [
      "contains_access_facilitation",
      "접근 지원",
      "최종 OpenAI 검수에서 이용 또는 접근을 돕는 표현 가능성이 감지되었습니다.",
    ],
  ];

  return labels
    .filter(([key]) => output.prohibited_phrase_check[key])
    .map(([key, label, reason]) => ({
      pattern: label,
      reason,
      sample: key,
    }));
}

function normalizeFinalReviewOutput({
  output,
  snapshot,
  seoPlan,
  preferredSlug,
  updateContext,
}: {
  output: FinalReviewOutput;
  snapshot: SourceSnapshot;
  seoPlan: SeoPlanningOutput;
  preferredSlug: string;
  updateContext?: BlogUpdateContext | null;
}): BlogDraft {
  const slug = normalizeSlug(preferredSlug || output.slug);
  const { primaryKeyword, secondaryKeywords } = getSeoKeywords(snapshot);
  const title = getSeoTitle(snapshot);
  const metaTitle = getSeoMetaTitle(snapshot);
  const h1 = getSeoH1(snapshot);
  const description = getSeoMetaDescription(snapshot);
  const bodyMarkdown = normalizeBlogMarkdown(
    output.body_md,
    h1,
    snapshot.site_specific_verification,
    snapshot,
  );
  const checklist = output.checklist_json
    .map((item) => `${item.item.trim()}: ${item.reason.trim()}`)
    .filter((item) => item.length > 1);
  const adminWarnings = output.admin_warnings.map((item) => item.trim()).filter(Boolean);
  const legalReviewNote = output.needs_human_legal_review
    ? ["관리자 법무/정책 검토가 필요합니다."]
    : [];
  const categoryClassification = getBlogCategoryClassification(
    snapshot,
    updateContext,
  );

  return {
    slug,
    category: categoryClassification.category,
    primary_category: categoryClassification.primary_category,
    secondary_categories: categoryClassification.secondary_categories,
    tags: categoryClassification.tags,
    priority: output.needs_human_legal_review ? "상" : "중",
    title,
    meta_title: metaTitle,
    description,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondaryKeywords,
    search_intent: [
      seoPlan.search_intent.main_intent,
      ...seoPlan.search_intent.sub_intents,
    ]
      .filter(Boolean)
      .join(" / "),
    reader_question: `${snapshot.site.name} 토토사이트의 먹튀 제보, 주소, 도메인, DNS/WHOIS 정보를 확인하려는 검색자 질문`,
    recommended_title_pattern: "정보 검증 리포트형",
    summary: finalSummaryToText(snapshot),
    reading_minutes: Math.max(3, Math.min(30, Math.ceil(bodyMarkdown.length / 900))),
    internal_links: buildSiteInternalLinks(snapshot),
    sections: markdownToSections(bodyMarkdown),
    checklist,
    faqs: output.faq_json
      .map((faq) => ({
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }))
      .filter((faq) => faq.question && faq.answer),
    safety_notes: uniqueStrings([
      ...adminWarnings,
      ...legalReviewNote,
      ...seoPlan.risk_warnings,
    ]),
  };
}

function getLegalReviewStatus({
  finalReview,
}: {
  finalReview: FinalReviewOutput;
}): "not_reviewed" | "needs_review" {
  return finalReview.needs_human_legal_review ? "needs_review" : "not_reviewed";
}

function buildAdminWarnings({
  finalReview,
  claudeDraft,
  safetyViolations,
  minimumPublishWarning,
  seoTitleDataWarning,
  titleQualityWarnings,
}: {
  finalReview: FinalReviewOutput;
  claudeDraft: ClaudeDraftOutput;
  safetyViolations: SafetyViolation[];
  minimumPublishWarning?: string | null;
  seoTitleDataWarning?: string | null;
  titleQualityWarnings?: string[];
}) {
  return uniqueStrings([
    ...finalReview.admin_warnings,
    ...claudeDraft.editor_notes,
    ...(minimumPublishWarning ? [minimumPublishWarning] : []),
    ...(seoTitleDataWarning ? [seoTitleDataWarning] : []),
    ...(titleQualityWarnings ?? []),
    ...(finalReview.needs_human_legal_review
      ? ["관리자 법무/정책 검토가 필요합니다."]
      : []),
    ...(safetyViolations.length > 0
      ? ["금지 표현 또는 홍보성 표현이 감지되었습니다."]
      : []),
    ...safetyViolations.map(
      (violation) => `${violation.pattern}: ${violation.reason}`,
    ),
  ]).slice(0, 50);
}

function getAiCallTimeoutMs({
  startedAt,
  providerTimeoutMs,
  generationDeadlineMs,
  stepLabel,
}: {
  startedAt: number;
  providerTimeoutMs: number;
  generationDeadlineMs: number;
  stepLabel: string;
}) {
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = generationDeadlineMs - elapsedMs;

  if (remainingMs < 1_500) {
    throw new AiProviderTimeoutError(
      `${stepLabel} 실행 전 AI 생성 제한 시간 ${Math.round(
        generationDeadlineMs / 1000,
      )}초를 초과해 검토용 fallback 초안으로 전환합니다.`,
    );
  }

  return Math.max(1_000, Math.min(providerTimeoutMs, remainingMs));
}

function formatKstDateTime(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();

  if (!Number.isFinite(date.getTime())) {
    return "조회 시점";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute} KST`;
}

function getDeterministicFactLines(snapshot: SourceSnapshot) {
  const siteName = snapshot.site.name;
  const primaryDomain =
    snapshot.derived_facts.primary_domain_display ||
    snapshot.site.display_domain ||
    snapshot.site.domain ||
    "확인되지 않음";
  const dnsTypes = uniqueStrings(
    snapshot.dns_records.map((record) => record.record_type),
  );
  const nameServers = snapshot.derived_facts.name_servers;
  const resolvedIps = snapshot.derived_facts.resolved_ips;
  const crawlCheckedAt = snapshot.crawl_snapshot?.collected_at ?? null;

  return uniqueStrings([
    `${siteName} 대표 도메인: ${primaryDomain}`,
    `추가 승인 도메인 수: ${snapshot.derived_facts.additional_domains.length}개`,
    `DNS 레코드 유형: ${dnsTypes.length ? dnsTypes.join(", ") : "저장된 레코드 없음"}`,
    `WHOIS 등록일: ${snapshot.derived_facts.domain_created_date ?? "확인되지 않음"}`,
    `네임서버 수: ${nameServers.length}개`,
    `관측 IP 수: ${resolvedIps.length}개`,
    `승인 리뷰 수: ${snapshot.reviews_summary.approved_review_count}건`,
    `승인 피해 제보 수: ${snapshot.scam_reports_summary.approved_public_report_count}건`,
    crawlCheckedAt
      ? `원본 사이트 관측 시각: ${formatKstDateTime(crawlCheckedAt)}`
      : "원본 사이트 관측 스냅샷: 확인되지 않음",
  ]);
}

function getDeterministicUnknownLines(snapshot: SourceSnapshot) {
  const unknowns: string[] = [];

  if (!snapshot.derived_facts.domain_created_date) {
    unknowns.push("WHOIS 등록일은 조회 시점 기준 확인되지 않았습니다.");
  }

  if (snapshot.derived_facts.dns_lookup_statuses.some(
    (status) => status.lookup_status === "failed",
  )) {
    unknowns.push("일부 DNS 정보는 조회 시점에 확인되지 않았습니다.");
  }

  if (snapshot.derived_facts.whois_lookup_statuses.some(
    (status) => status.lookup_status === "failed",
  )) {
    unknowns.push("일부 WHOIS 정보는 조회 시점에 확인되지 않았습니다.");
  }

  if (snapshot.reviews_summary.approved_review_count === 0) {
    unknowns.push("승인 리뷰는 아직 확인되지 않았습니다.");
  }

  if (snapshot.scam_reports_summary.approved_public_report_count === 0) {
    unknowns.push("조회 시점 기준 승인된 피해 제보는 확인되지 않았습니다.");
  }

  return uniqueStrings(unknowns);
}

function buildDeterministicSeoPlan(
  snapshot: SourceSnapshot,
  updateContext?: BlogUpdateContext | null,
): SeoPlanningOutput {
  const { primaryKeyword, secondaryKeywords } = getSeoKeywords(snapshot);
  const confirmedFacts = getDeterministicFactLines(snapshot);
  const unknowns = getDeterministicUnknownLines(snapshot);
  const title = getSeoTitle(snapshot);
  const metaTitle = getSeoMetaTitle(snapshot);
  const metaDescription = getSeoMetaDescription(snapshot);
  const sectionPlan = getRequiredBlogReportHeadings(snapshot.site.name).map(
    (heading) => ({
      heading,
      purpose:
        "서버 수집 데이터 기준으로 사이트 관측 정보, 주소·도메인, DNS·WHOIS, 먹튀 제보, 후기 현황을 구분해 정리합니다.",
      must_include_facts: confirmedFacts,
      must_avoid: [
        "추천, 홍보, 가입 유도 표현",
        "안전 보장 또는 먹튀 없음 단정",
        "외부 토토사이트 링크",
      ],
    }),
  );

  return normalizeSeoPlan(
    {
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      search_intent: {
        main_intent: "정보 확인",
        sub_intents: [
          "주소와 도메인 현황 확인",
          "DNS/WHOIS 조회 결과 확인",
          "먹튀 제보와 후기 현황 확인",
        ],
      },
      recommended_title: title,
      title_candidates: [title],
      title_strategy: getSeoTitleStrategy(snapshot),
      category_strategy: getBlogCategoryStrategy(snapshot, updateContext),
      meta_title: metaTitle,
      meta_description: metaDescription,
      section_plan: sectionPlan,
      confirmed_facts: confirmedFacts,
      inferences: [
        "DNS, WHOIS, 원본 화면 관측값은 조회 시점에 따라 달라질 수 있는 기술 정보입니다.",
      ],
      unknowns,
      claim_map: confirmedFacts.map((claim) => ({
        claim,
        claim_type: "confirmed_fact" as const,
        source: claim.includes("리뷰")
          ? ("reviews" as const)
          : claim.includes("피해 제보")
            ? ("scam_reports" as const)
            : claim.includes("WHOIS")
              ? ("whois" as const)
              : claim.includes("DNS") || claim.includes("IP") || claim.includes("네임서버")
                ? ("dns" as const)
                : ("sites" as const),
        confidence: "medium" as const,
      })),
      writing_brief_for_claude:
        "AI provider timeout fallback에서 사용한 서버 결정형 브리프입니다. 공개 본문에는 이 내부 설명을 출력하지 않습니다.",
      risk_warnings: [
        "AI provider 응답 지연으로 서버 수집 데이터 기반 fallback 초안을 생성했습니다.",
        "관리자 검토 후 발행 여부를 결정해야 합니다.",
      ],
    },
    snapshot,
    updateContext,
  );
}

function buildDeterministicMarkdown(snapshot: SourceSnapshot) {
  const h1 = getSeoH1(snapshot);
  const siteName = snapshot.site.name;
  const checkedAt = formatKstDateTime(
    snapshot.snapshot_at ??
      snapshot.generatedAt ??
      snapshot.derived_facts.dns_last_checked_at ??
      snapshot.derived_facts.whois_last_checked_at,
  );
  const intro = `${siteName} 토토사이트는 조회 시점 기준 저장된 사이트 설명, 원본 화면 관측 정보, 주소·도메인, DNS·WHOIS, 먹튀 제보와 후기 데이터를 함께 확인하는 정보 리포트 대상입니다. 마지막 정보 확인 시각: ${checkedAt}.`;
  const sections = getRequiredBlogReportHeadings(siteName).map((heading) =>
    [`## ${heading}`, buildRequiredSectionFallbackText(heading, snapshot)]
      .filter(Boolean)
      .join("\n\n"),
  );

  return appendRequiredBlogNotices(
    [`# ${h1}`, intro, ...sections].filter(Boolean).join("\n\n"),
  );
}

function buildDeterministicFaq(snapshot: SourceSnapshot): FinalReviewOutput["faq_json"] {
  const siteName = snapshot.site.name;

  return [
    {
      question: `${siteName} 주소는 어떤 기준으로 확인하나요?`,
      answer:
        "내부 사이트 상세 기록에 저장된 대표 도메인과 승인된 추가 도메인, DNS 조회 시각을 함께 확인합니다. 외부 사이트로 이동하는 링크는 제공하지 않습니다.",
      risk_level: "low" as const,
    },
    {
      question: `${siteName} 먹튀 제보는 어떻게 해석하나요?`,
      answer: `조회 시점 기준 승인되어 공개 처리된 피해 제보 ${snapshot.scam_reports_summary.approved_public_report_count}건을 기준으로 봅니다. 제보가 없더라도 안전성을 보장한다는 의미는 아닙니다.`,
      risk_level: "medium" as const,
    },
    {
      question: `${siteName} 후기는 어떤 데이터로 보나요?`,
      answer: `승인 리뷰 ${snapshot.reviews_summary.approved_review_count}건과 작성 시점, 반복되는 이용 경험 신호를 보조 자료로 확인합니다.`,
      risk_level: "low" as const,
    },
  ];
}

function buildDeterministicChecklist(
  snapshot: SourceSnapshot,
): FinalReviewOutput["checklist_json"] {
  return [
    {
      item: "대표 도메인과 추가 도메인 확인",
      reason: `대표 도메인과 추가 승인 도메인 ${snapshot.derived_facts.additional_domains.length}개가 내부 상세 기록과 일치하는지 확인합니다.`,
    },
    {
      item: "DNS·WHOIS 조회 시각 확인",
      reason:
        "DNS와 WHOIS 정보는 조회 시점에 따라 달라질 수 있어 마지막 조회 시각과 함께 봅니다.",
    },
    {
      item: "먹튀 제보와 후기 현황 분리 확인",
      reason:
        "피해 제보 수와 후기 수를 함께 보되, 제보 부재를 안전성 보장으로 해석하지 않습니다.",
    },
  ];
}

function buildDeterministicGeneratedDraft({
  snapshot,
  preferredSlug,
  updateContext,
  reason,
}: {
  snapshot: SourceSnapshot;
  preferredSlug: string;
  updateContext?: BlogUpdateContext | null;
  reason: string;
}) {
  const seoPlan = buildDeterministicSeoPlan(snapshot, updateContext);
  const bodyMd = buildDeterministicMarkdown(snapshot);
  const faqJson = buildDeterministicFaq(snapshot);
  const checklistJson = buildDeterministicChecklist(snapshot);
  const confirmedFacts = getDeterministicFactLines(snapshot);
  const unknowns = getDeterministicUnknownLines(snapshot);
  const uniqueFactScore = Math.max(5, Math.min(10, confirmedFacts.length));
  const claudeDraft = normalizeClaudeDraft(
    {
      draft_markdown: bodyMd,
      faq: faqJson.map(({ question, answer }) => ({ question, answer })),
      checklist: checklistJson,
      editor_notes: [
        `AI provider timeout fallback 사용: ${reason}`,
        "서버 수집 데이터로 구성한 초안이므로 관리자 검토가 필요합니다.",
      ],
    },
    snapshot,
  );
  const finalReview = normalizeFinalReviewCategoryStrategy(
    {
      title: getSeoTitle(snapshot),
      slug: preferredSlug,
      meta_title: getSeoMetaTitle(snapshot),
      meta_description: getSeoMetaDescription(snapshot),
      h1: getSeoH1(snapshot),
      primary_keyword: getSeoKeywords(snapshot).primaryKeyword,
      secondary_keywords: getSeoKeywords(snapshot).secondaryKeywords,
      content_angle: "AI provider timeout fallback draft",
      category_strategy: seoPlan.category_strategy,
      duplicate_risk_check: {
        title_pattern_reused: false,
        h2_pattern_reused: false,
        intro_too_similar: false,
        faq_too_similar: false,
        unique_fact_score: uniqueFactScore,
        estimated_duplicate_risk: "medium",
        reason:
          "AI provider timeout으로 서버 수집 데이터 기반 fallback 구조를 사용했으므로 관리자 중복 검토가 필요합니다.",
      },
      unique_fact_score: uniqueFactScore,
      internal_links: buildSiteInternalLinks(snapshot),
      external_references: [],
      body_md: claudeDraft.draft_markdown,
      faq_json: faqJson,
      checklist_json: checklistJson,
      summary: {
        confirmed_facts: confirmedFacts,
        inferences: seoPlan.inferences,
        unknowns,
      },
      admin_warnings: [
        `AI provider timeout fallback 사용: ${reason}`,
        "AI provider 응답 지연으로 서버 수집 데이터 기반 검토용 초안을 저장했습니다.",
        "발행 전 본문 자연스러움, 중복성, 금지 표현을 관리자가 확인해야 합니다.",
      ],
      prohibited_phrase_check: {
        contains_recommendation: false,
        contains_signup_cta: false,
        contains_bonus_or_event_promo: false,
        contains_absolute_safety_claim: false,
        contains_uncited_claims: false,
        contains_access_facilitation: false,
      },
      needs_human_legal_review: true,
    },
    seoPlan,
  );
  const finalDraft = normalizeDraft(
    normalizeFinalReviewOutput({
      output: finalReview,
      snapshot,
      seoPlan,
      preferredSlug,
      updateContext,
    }),
    preferredSlug,
  );
  const safetyViolations = [
    ...prohibitedCheckViolations(finalReview),
    ...scanDraft(finalDraft),
  ];

  return {
    seoPlan,
    claudeDraft,
    finalReview,
    finalDraft,
    safetyViolations,
  };
}

async function generateDraft({
  snapshot,
  preferredSlug,
  updateContext,
  openaiApiKey,
  openaiPlannerModel,
  openaiValidatorModel,
  anthropicApiKey,
  anthropicModel,
  aiProviderTimeoutMs,
  aiGenerationDeadlineMs,
}: {
  snapshot: SourceSnapshot;
  preferredSlug: string;
  updateContext?: BlogUpdateContext | null;
  openaiApiKey: string;
  openaiPlannerModel: string;
  openaiValidatorModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  aiProviderTimeoutMs: number;
  aiGenerationDeadlineMs: number;
}) {
  const startedAt = Date.now();
  const getStepTimeoutMs = (stepLabel: string) =>
    getAiCallTimeoutMs({
      startedAt,
      providerTimeoutMs: aiProviderTimeoutMs,
      generationDeadlineMs: aiGenerationDeadlineMs,
      stepLabel,
    });

  try {
    const seoPlan = normalizeSeoPlan(
      await callOpenAiJson<SeoPlanningOutput>({
        apiKey: openaiApiKey,
        model: openaiPlannerModel,
        schemaName: "site_blog_seo_plan",
        schema: seoPlanningSchema,
        system: OPENAI_PLANNER_SYSTEM_PROMPT,
        user: buildOpenAiAnalysisPrompt(snapshot, preferredSlug, updateContext),
        timeoutMs: getStepTimeoutMs("OpenAI SEO 설계"),
      }),
      snapshot,
      updateContext,
    );

    const claudeDraft = normalizeClaudeDraft(
      await callClaudeJson<ClaudeDraftOutput>({
        apiKey: anthropicApiKey,
        model: anthropicModel,
        system: CLAUDE_WRITER_SYSTEM_PROMPT,
        user: buildClaudePrompt(snapshot, seoPlan, updateContext),
        timeoutMs: getStepTimeoutMs("Claude 본문 작성"),
      }),
      snapshot,
    );

    let finalReview = normalizeFinalReviewCategoryStrategy(
      await callOpenAiJson<FinalReviewOutput>({
        apiKey: openaiApiKey,
        model: openaiValidatorModel,
        schemaName: "site_blog_final_review",
        schema: finalReviewSchema,
        system: OPENAI_VALIDATOR_SYSTEM_PROMPT,
        user: buildFinalOpenAiPrompt({
          snapshot,
          seoPlan,
          claudeDraft,
          preferredSlug,
          updateContext,
        }),
        timeoutMs: getStepTimeoutMs("OpenAI 최종 검수"),
      }),
      seoPlan,
    );
    let finalDraft = normalizeDraft(
      normalizeFinalReviewOutput({
        output: finalReview,
        snapshot,
        seoPlan,
        preferredSlug,
        updateContext,
      }),
      preferredSlug,
    );

    let safetyViolations = [
      ...prohibitedCheckViolations(finalReview),
      ...scanDraft(finalDraft),
    ];

    if (safetyViolations.length > 0) {
      finalReview = normalizeFinalReviewCategoryStrategy(
        await callOpenAiJson<FinalReviewOutput>({
          apiKey: openaiApiKey,
          model: openaiValidatorModel,
          schemaName: "site_blog_final_review",
          schema: finalReviewSchema,
          system: OPENAI_VALIDATOR_REPAIR_SYSTEM_PROMPT,
          user: buildFinalOpenAiPrompt({
            snapshot,
            seoPlan,
            claudeDraft,
            preferredSlug,
            updateContext,
            previousViolations: safetyViolations,
          }),
          timeoutMs: getStepTimeoutMs("OpenAI 금지 표현 보정"),
        }),
        seoPlan,
      );
      finalDraft = normalizeDraft(
        normalizeFinalReviewOutput({
          output: finalReview,
          snapshot,
          seoPlan,
          preferredSlug,
          updateContext,
        }),
        preferredSlug,
      );
      safetyViolations = [
        ...prohibitedCheckViolations(finalReview),
        ...scanDraft(finalDraft),
      ];
    }

    return {
      seoPlan,
      claudeDraft,
      finalReview,
      finalDraft,
      safetyViolations,
    };
  } catch (error) {
    if (isAiProviderTimeoutError(error)) {
      return buildDeterministicGeneratedDraft({
        snapshot,
        preferredSlug,
        updateContext,
        reason: error.message,
      });
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = token ? await getAdminSession(token) : null;

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const {
    openaiApiKey,
    anthropicApiKey,
    openaiPlannerModel,
    openaiValidatorModel,
    anthropicModel,
    blogPromptVersion,
    blogGenerationMaxReviews,
    blogGenerationMaxScamReports,
    blogAiProviderTimeoutMs,
    blogAiGenerationDeadlineMs,
  } = getEnv();

  if (!openaiApiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 환경변수가 필요합니다." },
      { status: 400 },
    );
  }

  if (!anthropicApiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY 환경변수가 필요합니다." },
      { status: 400 },
    );
  }

  const missingModelEnvNames = [
    !openaiPlannerModel ? "OPENAI_BLOG_PLANNER_MODEL" : "",
    !openaiValidatorModel ? "OPENAI_BLOG_VALIDATOR_MODEL" : "",
    !anthropicModel ? "ANTHROPIC_BLOG_WRITER_MODEL" : "",
  ].filter(Boolean);

  if (missingModelEnvNames.length > 0) {
    return NextResponse.json(
      {
        error: `AI 블로그 모델 환경변수가 필요합니다: ${missingModelEnvNames.join(
          ", ",
        )}`,
      },
      { status: 400 },
    );
  }

  if (blogPromptVersion !== BLOG_PROMPT_VERSION) {
    return NextResponse.json(
      {
        error: `BLOG_PROMPT_VERSION은 현재 프롬프트 파일 버전인 ${BLOG_PROMPT_VERSION}이어야 합니다.`,
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    siteId?: unknown;
    siteSlug?: unknown;
    blogPostId?: unknown;
    mode?: unknown;
    allowAdditionalPostForSameSite?: unknown;
  } | null;
  const siteId = typeof body?.siteId === "string" ? body.siteId.trim() : "";
  const siteSlug = typeof body?.siteSlug === "string" ? body.siteSlug.trim() : "";
  const blogPostId =
    typeof body?.blogPostId === "string" ? body.blogPostId.trim() : "";
  const mode = body?.mode === "update" ? "update" : "create";
  const allowAdditionalPostForSameSite =
    body?.allowAdditionalPostForSameSite === true;

  if (!siteId && !siteSlug) {
    return NextResponse.json(
      { error: "초안을 생성할 사이트 ID 또는 slug가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  let aiJob: AiGenerationJobRow | null = null;
  let persistedSnapshotForFailure: SourceSnapshot | null = null;
  let savedPostForFailure: BlogPostRow | null = null;
  const siteQuery = supabase
    .from("sites")
    .select(
      "id, slug, name, name_ko, name_en, url, domains, logo_url, favicon_url, screenshot_url, screenshot_thumb_url, status, description, latest_crawl_snapshot_id, content_crawled_at, description_source_snapshot_id, description_generated_at, resolved_ips, dns_checked_at, created_at, updated_at",
    )
    .limit(1);
  const siteResult = siteId
    ? await siteQuery.eq("id", siteId).maybeSingle<SiteRow>()
    : await siteQuery.eq("slug", siteSlug).maybeSingle<SiteRow>();

  if (siteResult.error || !siteResult.data) {
    return NextResponse.json(
      { error: "사이트 정보를 찾지 못했습니다." },
      { status: 404 },
    );
  }

  const site = siteResult.data;

  try {
    const requestedBlog = blogPostId
      ? await supabase
          .from("blog_posts")
          .select(existingBlogSelect)
          .eq("id", blogPostId)
          .maybeSingle<ExistingBlogRow>()
      : { data: null, error: null };

    if (requestedBlog.error) {
      throw new Error("선택한 기존 블로그 글을 확인하지 못했습니다.");
    }

    if (blogPostId && !requestedBlog.data) {
      return NextResponse.json(
        { error: "선택한 기존 블로그 글을 찾지 못했습니다." },
        { status: 404 },
      );
    }

    if (
      requestedBlog.data &&
      !blogBelongsToSite(requestedBlog.data, site.id)
    ) {
      return NextResponse.json(
        { error: "선택한 블로그 글이 요청한 사이트에 속하지 않습니다." },
        { status: 400 },
      );
    }

    const publishedBlog = requestedBlog.data
      ? null
      : await findPublishedBlogBySource(supabase, site.id);
    const reusableExistingBlog =
      !requestedBlog.data &&
      mode === "create" &&
      !allowAdditionalPostForSameSite &&
      !publishedBlog
        ? await findExistingBlogBySource(supabase, site.id)
        : null;
    const draftTarget = resolveBlogDraftTarget({
      requestedBlog: requestedBlog.data,
      publishedBlog,
      existingBlog: reusableExistingBlog,
      mode,
      allowAdditionalPostForSameSite,
    });
    const existingBlog = draftTarget.targetBlog;

    if (mode === "update" && !existingBlog) {
      return NextResponse.json(
        {
          error:
            "업데이트할 기존 블로그 글이 없습니다. 먼저 AI 블로그 초안 생성을 실행해주세요.",
        },
        { status: 404 },
      );
    }

    const isAdditionalPost = draftTarget.isAdditionalPost;
    const jobType = draftTarget.jobType;
    const activeJob = await findActiveAiGenerationJob(supabase, site.id);

    if (activeJob) {
      return NextResponse.json(
        {
          error:
            "이 사이트에 대해 이미 진행 중인 AI 블로그 생성 작업이 있습니다. 완료 후 다시 시도해주세요.",
          job: activeJob,
        },
        { status: 409 },
      );
    }

    aiJob = await createAiGenerationJob({
      supabase,
      siteId: site.id,
      postId: existingBlog?.id ?? null,
      jobType,
      openaiPlannerModel,
      openaiValidatorModel,
      anthropicModel,
      promptVersion: blogPromptVersion,
      idempotencyKey: getRequestIdempotencyKey({
        request,
        siteId: site.id,
        jobType,
      }),
      createdBy: adminSession.userId,
    });

    const fallbackSlug = getFallbackBlogSlug(site);
    const preferredSlug = getPreferredBlogSlug({
      existingSlug: existingBlog?.slug,
      fallbackSlug,
      isAdditionalPost,
      now: new Date(),
    });
    const approvedDomainSubmissions = await getApprovedDomainSubmissionRows(
      supabase,
      site.id,
    );
    const refreshDomainTargets = getRefreshDomainTargets(
      site,
      approvedDomainSubmissions,
    );
    const dnsResult = await refreshDnsRecords({
      supabase,
      site,
      domainTargets: refreshDomainTargets,
    });
    const whoisResult = await refreshWhoisRecords({
      supabase,
      domainTargets: refreshDomainTargets,
    });
    const snapshot = await createSourceSnapshot({
      supabase,
      site,
      resolvedIps: dnsResult.resolvedIps,
      dnsLookupStatuses: dnsResult.lookupStatuses,
      whoisLookupStatuses: whoisResult.lookupStatuses,
      maxReviews: blogGenerationMaxReviews,
      maxScamReports: blogGenerationMaxScamReports,
    });
    const persistedSnapshot = await saveBlogSourceSnapshot(
      supabase,
      site.id,
      snapshot,
    );
    persistedSnapshotForFailure = persistedSnapshot;
    await markAiGenerationJobSourceSnapshot({
      supabase,
      jobId: aiJob.id,
      sourceSnapshotId: persistedSnapshot.source_snapshot_id ?? null,
    });
    aiJob = {
      ...aiJob,
      source_snapshot_id: persistedSnapshot.source_snapshot_id ?? null,
    };
    const previousSnapshot =
      existingBlog
        ? (await getBlogSourceSnapshotById(
            supabase,
            existingBlog.source_snapshot_id,
          )) ?? getPreviousSnapshotFromBlog(existingBlog)
        : null;
    const updateContext =
      existingBlog
        ? buildUpdateContext({
            previousPost: existingBlog,
            previousSnapshot,
            nextSnapshot: persistedSnapshot,
          })
        : null;
    const generated = await generateDraft({
      snapshot: persistedSnapshot,
      preferredSlug,
      updateContext,
      openaiApiKey,
      openaiPlannerModel,
      openaiValidatorModel,
      anthropicApiKey,
      anthropicModel,
      aiProviderTimeoutMs: blogAiProviderTimeoutMs,
      aiGenerationDeadlineMs: blogAiGenerationDeadlineMs,
    });

    const rawFinalSlug = existingBlog?.slug ?? generated.finalDraft.slug;
    const slugMatchedBlog = isAdditionalPost
      ? null
      : await findExistingBlogBySlug(supabase, rawFinalSlug);
    const targetBlog =
      existingBlog ??
      (slugMatchedBlog && blogBelongsToSite(slugMatchedBlog, site.id)
        ? slugMatchedBlog
        : null);
    const finalSlug = targetBlog
      ? targetBlog.slug
      : await getAvailableBlogSlug(supabase, rawFinalSlug);
    const today = new Date().toISOString().slice(0, 10);
    const titleQualityReview = await reviewTitleQuality({
      supabase,
      title: generated.finalDraft.title,
      siteName: site.name,
      snapshot: persistedSnapshot,
    });
    let legalReviewStatus = getLegalReviewStatus({
      finalReview: generated.finalReview,
    });

    if (titleQualityReview.requires_legal_review) {
      legalReviewStatus = "needs_review";
    }

    const seoPlanForStorage: SeoPlanningOutput = {
      ...generated.seoPlan,
      title_strategy: {
        ...generated.seoPlan.title_strategy,
        title_similarity_warning: titleQualityReview.title_similarity_warning,
      },
    };
    const primaryCategoryId = await getBlogCategoryIdBySlug(
      supabase,
      generated.finalDraft.primary_category,
    );
    const h1 = getSeoH1(persistedSnapshot);
    const finalBodyMarkdown = sanitizePublicBody({
      markdown: generated.finalReview.body_md,
      h1,
      verificationSummary: persistedSnapshot.site_specific_verification,
      snapshot: persistedSnapshot,
    });
    const blogVisualImages = selectBlogVisualImages({
      siteName: site.name,
      screenshots: persistedSnapshot.site.screenshots,
      logoUrl: persistedSnapshot.site.logo_url,
      faviconUrl: persistedSnapshot.site.favicon_url,
      snapshotAt: persistedSnapshot.snapshot_at ?? persistedSnapshot.generatedAt,
    });
    const seoDraftValidation = validateBlogSeoDraft({
      siteName: site.name,
      slug: finalSlug,
      title: generated.finalDraft.title,
      metaTitle: generated.finalDraft.meta_title,
      metaDescription: generated.finalDraft.description,
      h1,
      bodyMd: finalBodyMarkdown,
      faq: generated.finalReview.faq_json,
      internalLinks: generated.finalDraft.internal_links,
      externalLinks: generated.finalReview.external_references,
      facts: generated.finalReview.summary.confirmed_facts,
      renderedInternalAnchors: buildRenderedBlogDetailInternalAnchors({
        draft: generated.finalDraft,
        site,
      }),
      imageSeo: {
        screenshots: persistedSnapshot.site.screenshots,
        featuredImageUrl: blogVisualImages.featuredImageUrl,
        featuredImageAlt: blogVisualImages.featuredImageAlt,
        logoUrl: blogVisualImages.siteLogoUrl,
      },
    });
    const duplicateComparisonPosts = await getDuplicateComparisonPosts({
      supabase,
      primaryCategory: generated.finalDraft.primary_category,
      excludePostId: targetBlog?.id,
      fallbackSiteName: site.name,
    });
    const duplicateReview = reviewBlogDuplicateRisk({
      siteName: site.name,
      title: generated.finalDraft.title,
      bodyMd: finalBodyMarkdown,
      h2Headings: generated.finalDraft.sections.map((section) => section.heading),
      facts: generated.finalReview.summary.confirmed_facts,
      comparisonPosts: duplicateComparisonPosts,
    });
    const duplicateRisk = maxDuplicateRisk(
      getDuplicateRiskFromFinalReview({
        finalReview: generated.finalReview,
        titleQualityReview,
      }),
      duplicateReview.duplicateRisk,
    );
    const uniqueFactScore = Math.min(
      getUniqueFactScoreFromFinalReview(
        generated.finalReview,
        titleQualityReview.uniqueness_score,
      ),
      seoDraftValidation.uniqueFactScore,
      duplicateReview.uniqueFactScore,
    );

    if (duplicateRisk === "high" || duplicateRisk === "failed") {
      legalReviewStatus = "needs_review";
    }

    const adminWarnings = uniqueStrings([
      ...buildAdminWarnings({
        finalReview: generated.finalReview,
        claudeDraft: generated.claudeDraft,
        safetyViolations: generated.safetyViolations,
        minimumPublishWarning: persistedSnapshot.minimum_publish_check?.warning,
        seoTitleDataWarning: getSeoTitleDataWarning(persistedSnapshot),
        titleQualityWarnings: titleQualityReview.warnings,
      }),
      ...seoDraftValidation.adminWarnings,
      ...duplicateReview.adminWarnings,
    ]);
    const blogPayload = {
      site_id: site.id,
      slug: finalSlug,
      status: "draft",
      legal_review_status: legalReviewStatus,
      admin_warnings: adminWarnings,
      category: generated.finalDraft.category,
      primary_category_id: primaryCategoryId,
      primary_category: generated.finalDraft.primary_category,
      secondary_categories: generated.finalDraft.secondary_categories,
      tags: generated.finalDraft.tags,
      priority: generated.finalDraft.priority,
      title: generated.finalDraft.title,
      h1,
      meta_title: generated.finalDraft.meta_title,
      meta_description: generated.finalDraft.description,
      description: generated.finalDraft.description,
      featured_image_url: blogVisualImages.featuredImageUrl,
      featured_image_alt: blogVisualImages.featuredImageAlt,
      featured_image_caption: blogVisualImages.featuredImageCaption,
      featured_image_captured_at: blogVisualImages.featuredImageCapturedAt,
      site_logo_url: blogVisualImages.siteLogoUrl,
      site_logo_alt: blogVisualImages.siteLogoAlt,
      primary_keyword: generated.finalDraft.primary_keyword,
      secondary_keywords: generated.finalDraft.secondary_keywords,
      body_md: finalBodyMarkdown,
      faq_json: generated.finalReview.faq_json,
      checklist_json: generated.finalReview.checklist_json,
      source_snapshot_id: persistedSnapshot.source_snapshot_id ?? null,
      ai_provider: "mixed",
      prompt_version: blogPromptVersion,
      reviewed_by: null,
      seo_review_status: getSeoReviewStatusFromQuality(
        titleQualityReview,
        duplicateRisk,
        seoDraftValidation.seoReviewStatus,
      ),
      duplicate_risk: duplicateRisk,
      unique_fact_score: uniqueFactScore,
      content_angle:
        generated.finalReview.content_angle.trim() ||
        generated.seoPlan.title_strategy.selected_pattern,
      normalized_title_pattern: duplicateReview.normalizedTitlePattern,
      normalized_h2_pattern: duplicateReview.normalizedH2Pattern,
      search_intent: generated.finalDraft.search_intent,
      reader_question: generated.finalDraft.reader_question,
      recommended_title_pattern: generated.finalDraft.recommended_title_pattern,
      summary: generated.finalDraft.summary,
      published_at: null,
      content_updated_at: today,
      reading_minutes: generated.finalDraft.reading_minutes,
      internal_links: generated.finalDraft.internal_links,
      sections: generated.finalDraft.sections,
      checklist: generated.finalDraft.checklist,
      faqs: generated.finalDraft.faqs,
      source_site_id: isAdditionalPost ? null : site.id,
      source_snapshot: {
        sourceSnapshotId: persistedSnapshot.source_snapshot_id,
        snapshot: persistedSnapshot,
        seoPlan: seoPlanForStorage,
        claudeDraft: generated.claudeDraft,
        finalReview: generated.finalReview,
        canonicalSeo: {
          title: generated.finalDraft.title,
          metaTitle: generated.finalDraft.meta_title,
          metaDescription: generated.finalDraft.description,
          h1,
          primaryKeyword: generated.finalDraft.primary_keyword,
          secondaryKeywords: generated.finalDraft.secondary_keywords,
        },
        prohibitedPhraseCheck: generated.finalReview.prohibited_phrase_check,
        siteSpecificVerification: persistedSnapshot.site_specific_verification,
        minimumPublishCheck: persistedSnapshot.minimum_publish_check,
        seoTitleSignals: persistedSnapshot.seo_title_signals,
        seoTitleDataWarning: getSeoTitleDataWarning(persistedSnapshot),
        titleQualityReview,
        seoDraftValidation,
        duplicateRiskReview: duplicateReview,
        blogVisualImages,
        duplicateRisk,
        uniqueFactScore,
        allowAdditionalPostForSameSite,
        isAdditionalPost,
        internalLinks: generated.finalDraft.internal_links,
        categoryStructure: {
          primaryCategoryId,
          primaryCategory: generated.finalDraft.primary_category,
          secondaryCategories: generated.finalDraft.secondary_categories,
          tags: generated.finalDraft.tags,
          categoryStrategy: seoPlanForStorage.category_strategy,
          finalReviewCategoryStrategy: generated.finalReview.category_strategy,
        },
        updateContext,
        adminWarnings,
        legalReviewStatus,
        needsHumanLegalReview: generated.finalReview.needs_human_legal_review,
        codeSafetyViolations: generated.safetyViolations,
        editorNotes: generated.claudeDraft.editor_notes,
        safetyNotes: generated.finalDraft.safety_notes,
      },
      ai_generated_at: new Date().toISOString(),
      ai_model: `${openaiPlannerModel} + ${anthropicModel} + ${openaiValidatorModel}`,
    };
    const saveResult = targetBlog
      ? await supabase
          .from("blog_posts")
          .update(blogPayload)
          .eq("id", targetBlog.id)
          .select(blogPostSelect)
          .single<BlogPostRow>()
      : await supabase
          .from("blog_posts")
          .insert(blogPayload)
          .select(blogPostSelect)
          .single<BlogPostRow>();

    if (saveResult.error || !saveResult.data) {
      throw new Error(
        saveResult.error?.message ??
          "블로그 초안을 저장하지 못했습니다. schema.sql 적용 여부를 확인해주세요.",
      );
    }

    savedPostForFailure = saveResult.data;
    await saveBlogContentFingerprint({
      supabase,
      postId: saveResult.data.id,
      siteId: site.id,
      bodyMd: finalBodyMarkdown,
      duplicateReview,
    });

    const version = await createBlogPostVersion({
      supabase,
      postId: saveResult.data.id,
      aiGenerationJobId: aiJob.id,
      createdBy: adminSession.userId,
      isUpdate: Boolean(targetBlog),
      snapshot: persistedSnapshot,
      updateContext,
      finalReview: generated.finalReview,
      finalDraft: generated.finalDraft,
    });

    await markAiGenerationJobSucceeded({
      supabase,
      jobId: aiJob.id,
      postId: saveResult.data.id,
      sourceSnapshotId: persistedSnapshot.source_snapshot_id ?? null,
    });

    if (aiJob) {
      aiJob = {
        ...aiJob,
        post_id: saveResult.data.id,
        status: "succeeded",
        source_snapshot_id: persistedSnapshot.source_snapshot_id ?? null,
      };
    }

    return NextResponse.json({
      ok: true,
      post: saveResult.data,
      version,
      job: aiJob,
      site: {
        id: site.id,
        slug: site.slug,
        name: site.name,
      },
      snapshotSummary: {
        sourceSnapshotId: persistedSnapshot.source_snapshot_id,
        reviews: persistedSnapshot.reviews_summary.approved_review_count,
        scamReports:
          persistedSnapshot.scam_reports_summary.approved_public_report_count,
        dnsRecords: persistedSnapshot.dns_records.length,
        whoisRecords: persistedSnapshot.whois.length,
        dnsLookupFailures: persistedSnapshot.derived_facts.dns_lookup_statuses.filter(
          (status) => status.lookup_status === "failed",
        ).length,
        whoisLookupFailures: persistedSnapshot.derived_facts.whois_lookup_statuses.filter(
          (status) => status.lookup_status === "failed",
        ).length,
        adminWarnings: adminWarnings.length,
        safetyViolations: generated.safetyViolations.length,
        changes: updateContext?.changeSummary ?? null,
        legalReviewStatus,
        needsHumanLegalReview: generated.finalReview.needs_human_legal_review,
        minimumPublishCheck: persistedSnapshot.minimum_publish_check ?? null,
        seoTitleSignals: persistedSnapshot.seo_title_signals ?? null,
        seoTitleDataWarning: getSeoTitleDataWarning(persistedSnapshot),
        titleQualityReview,
        seoDraftValidation,
        duplicateRiskReview: duplicateReview,
        duplicateRisk,
        uniqueFactScore,
        isAdditionalPost,
        sameIpSites: persistedSnapshot.sameIpSites.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI 블로그 초안 생성 중 문제가 발생했습니다.";

    if (aiJob) {
      await markAiGenerationJobFailed({
        supabase,
        jobId: aiJob.id,
        errorMessage: message,
        postId: savedPostForFailure?.id ?? aiJob.post_id,
        sourceSnapshotId:
          persistedSnapshotForFailure?.source_snapshot_id ??
          aiJob.source_snapshot_id,
      });
    }

    return NextResponse.json(
      {
        error: message,
        ...(aiJob ? { job: { id: aiJob.id, status: "failed" } } : {}),
      },
      { status: 500 },
    );
  }
}
