"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  blogCategories,
  blogPosts,
  canIndexBlogCategory,
  getBlogCategoryLabel,
  getBlogPrimaryCategoryFromLabel,
  getBlogTagSlug,
  isBlogCategoryValue,
  type BlogCategorySlug,
  type BlogPost,
} from "@/app/data/blog-posts";
import { supabase } from "@/lib/supabase/client";

type BlogStatus = "draft" | "published" | "archived";
type LegalReviewStatus = "not_reviewed" | "needs_review" | "approved";

type BlogPostRow = {
  id: string;
  site_id: string | null;
  source_site_id: string | null;
  slug: string;
  status: BlogStatus;
  legal_review_status: LegalReviewStatus;
  admin_warnings: string[] | null;
  category: string;
  primary_category_id: string | null;
  primary_category: BlogCategorySlug | null;
  secondary_categories: BlogCategorySlug[] | null;
  tags: string[] | null;
  priority: BlogPost["priority"];
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  description: string;
  primary_keyword: string | null;
  secondary_keywords: string[] | null;
  body_md: string | null;
  faq_json: unknown;
  checklist_json: unknown;
  source_snapshot_id: string | null;
  source_snapshot: unknown;
  ai_model: string | null;
  prompt_version: string | null;
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

type BlogPostFormValues = {
  id: string;
  status: BlogStatus;
  slug: string;
  category: string;
  primaryCategory: BlogCategorySlug;
  secondaryCategoriesText: string;
  tagsText: string;
  priority: BlogPost["priority"];
  title: string;
  metaTitle: string;
  metaDescription: string;
  bodyMarkdown: string;
  primaryKeyword: string;
  secondaryKeywordsText: string;
  searchIntent: string;
  readerQuestion: string;
  recommendedTitlePattern: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: string;
  internalLinksJson: string;
  sectionsJson: string;
  checklistText: string;
  checklistJson: string;
  faqJson: string;
};

type BlogPostPayload = {
  slug: string;
  status: BlogStatus;
  category: string;
  primary_category: BlogCategorySlug;
  secondary_categories: BlogCategorySlug[];
  tags: string[];
  priority: BlogPost["priority"];
  title: string;
  meta_title: string;
  meta_description: string;
  description: string;
  primary_keyword: string;
  secondary_keywords: string[];
  body_md: string;
  faq_json: unknown[];
  checklist_json: unknown[];
  search_intent: string;
  reader_question: string;
  recommended_title_pattern: string;
  summary: string;
  published_at: string | null;
  content_updated_at: string;
  reading_minutes: number;
  internal_links: unknown[];
  sections: unknown[];
  checklist: string[];
  faqs: unknown[];
};

type GenerateBlogDraftResponse = {
  ok?: boolean;
  post?: BlogPostRow;
  error?: string;
  violations?: Array<{
    pattern: string;
    reason: string;
    sample: string;
  }>;
  snapshotSummary?: {
    reviews: number;
    scamReports: number;
    dnsRecords: number;
    whoisRecords: number;
    dnsLookupFailures?: number;
    whoisLookupFailures?: number;
    adminWarnings?: number;
    safetyViolations?: number;
    legalReviewStatus?: string;
    sameIpSites: number;
  };
};

const blogPostSelect = [
  "id",
  "site_id",
  "source_site_id",
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
  "meta_title",
  "meta_description",
  "description",
  "primary_keyword",
  "secondary_keywords",
  "body_md",
  "faq_json",
  "checklist_json",
  "source_snapshot_id",
  "source_snapshot",
  "ai_model",
  "prompt_version",
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

const statusLabels: Record<BlogStatus, string> = {
  draft: "초안",
  published: "공개",
  archived: "보관",
};

const legalReviewStatusLabels: Record<LegalReviewStatus, string> = {
  not_reviewed: "미검토",
  needs_review: "검토 필요",
  approved: "검수 완료",
};

const prohibitedPhraseCheckKeys = [
  "contains_recommendation",
  "contains_signup_cta",
  "contains_bonus_or_event_promo",
  "contains_absolute_safety_claim",
  "contains_uncited_claims",
  "contains_access_facilitation",
] as const;

const maxSecondaryCategoryCount = 2;

const today = () => new Date().toISOString().slice(0, 10);

const emptyFormValues: BlogPostFormValues = {
  id: "",
  status: "draft",
  slug: "",
  category: getBlogCategoryLabel("site-reports"),
  primaryCategory: "site-reports",
  secondaryCategoriesText: "domain-dns, scam-reports",
  tagsText: "",
  priority: "중",
  title: "",
  metaTitle: "",
  metaDescription: "",
  bodyMarkdown: "",
  primaryKeyword: "",
  secondaryKeywordsText: "",
  searchIntent: "",
  readerQuestion: "",
  recommendedTitlePattern: "기준형",
  summary: "",
  publishedAt: today(),
  updatedAt: today(),
  readingMinutes: "3",
  internalLinksJson: "[]",
  sectionsJson: JSON.stringify(
    [
      {
        heading: "첫 번째 소제목",
        paragraphs: ["본문 문단을 입력하세요."],
        bullets: [],
      },
    ],
    null,
    2,
  ),
  checklistText: "",
  checklistJson: "[]",
  faqJson: "[]",
};

function formatJson(value: unknown) {
  return JSON.stringify(value ?? [], null, 2);
}

function formatJsonObject(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function formatDate(value: string | null | undefined) {
  if (!value) return today();

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return today();

  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "확인되지 않음";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "확인되지 않음";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitTextList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBlogCategorySlug(value: string) {
  const normalized = value.trim();
  const normalizedSlug = normalized.toLowerCase();
  const matchedCategory = blogCategories.find(
    (category) =>
      category.slug === normalizedSlug || category.name === normalized,
  );

  if (!matchedCategory && isBlogCategoryValue(normalized)) {
    return getBlogPrimaryCategoryFromLabel(normalized);
  }

  return matchedCategory?.slug ?? null;
}

function splitCategorySlugs(value: string) {
  const items = splitTextList(value);
  const unknownItems = items.filter((item) => !parseBlogCategorySlug(item));

  if (unknownItems.length > 0) {
    throw new Error(
      `보조 카테고리는 정해진 카테고리 slug 또는 이름만 사용할 수 있습니다: ${unknownItems.join(", ")}`,
    );
  }

  return Array.from(
    new Set(
      items
        .map(parseBlogCategorySlug)
        .filter((item): item is BlogCategorySlug => Boolean(item)),
    ),
  );
}

function splitTagList(value: string) {
  const items = splitTextList(value);
  const categoryLikeItems = items.filter(isBlogCategoryValue);

  if (categoryLikeItems.length > 0) {
    throw new Error(
      `태그에는 카테고리명을 넣지 마세요. 카테고리는 대표/보조 카테고리 필드에서만 관리합니다: ${categoryLikeItems.join(", ")}`,
    );
  }

  const bySlug = new Map<string, string>();

  for (const item of items) {
    const slug = getBlogTagSlug(item);
    if (!slug || bySlug.has(slug)) continue;
    bySlug.set(slug, item);
  }

  return Array.from(bySlug.values()).slice(0, 20);
}

function getSafeCategorySlugs(value: string) {
  try {
    return splitCategorySlugs(value);
  } catch {
    return [];
  }
}

function getSafeTagList(value: string) {
  try {
    return splitTagList(value);
  } catch {
    return splitTextList(value).slice(0, 20);
  }
}

function parseJsonArray(value: string, label: string): unknown[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${label}은 JSON 배열이어야 합니다.`);
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function checklistJsonToTextItems(value: unknown[]) {
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!isRecord(item)) return "";

      const itemText = getString(item.item);
      const reason = getString(item.reason);

      if (!itemText) return "";
      return reason ? `${itemText}: ${reason}` : itemText;
    })
    .filter(Boolean);
}

function normalizeSlugInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function createSlug(value: string) {
  const baseSlug = normalizeSlugInput(value);

  return baseSlug || `blog-${Date.now().toString(36)}`;
}

function normalizeSiteSourceInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const siteSlug = url.pathname
      .split("/")
      .filter(Boolean)
      .at(-1);

    return siteSlug ?? trimmed;
  } catch {
    return trimmed.replace(/^\/?sites\//, "").trim();
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getInitialSourceSiteInput() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  return params.get("siteSlug") ?? params.get("siteId") ?? "";
}

function getSnapshotRecord(post: BlogPostRow | null) {
  if (!post || !isRecord(post.source_snapshot)) return null;

  const snapshot = post.source_snapshot.snapshot;
  return isRecord(snapshot) ? snapshot : null;
}

function getSourceSnapshotValue(post: BlogPostRow | null, key: string) {
  const snapshot = getSnapshotRecord(post);

  if (!snapshot) return undefined;
  return snapshot[key];
}

function getSnapshotObject(post: BlogPostRow | null, key: string) {
  const value = getSourceSnapshotValue(post, key);
  return isRecord(value) ? value : null;
}

function getDerivedFacts(post: BlogPostRow | null) {
  return getSnapshotObject(post, "derived_facts");
}

function getReviewsSummary(post: BlogPostRow | null) {
  return getSnapshotObject(post, "reviews_summary");
}

function getScamReportsSummary(post: BlogPostRow | null) {
  return getSnapshotObject(post, "scam_reports_summary");
}

function getProhibitedPhraseCheck(post: BlogPostRow | null) {
  if (!post || !isRecord(post.source_snapshot)) return null;

  const directCheck = post.source_snapshot.prohibitedPhraseCheck;
  if (isRecord(directCheck)) return directCheck;

  const finalReview = post.source_snapshot.finalReview;
  if (isRecord(finalReview) && isRecord(finalReview.prohibited_phrase_check)) {
    return finalReview.prohibited_phrase_check;
  }

  return null;
}

function getCategoryRecommendationReason(post: BlogPostRow | null) {
  if (!post || !isRecord(post.source_snapshot)) return "";

  const categoryStructure = post.source_snapshot.categoryStructure;
  const finalReview = post.source_snapshot.finalReview;
  const seoPlan = post.source_snapshot.seoPlan;
  const candidates = [
    isRecord(categoryStructure)
      ? categoryStructure.finalReviewCategoryStrategy
      : null,
    isRecord(categoryStructure) ? categoryStructure.categoryStrategy : null,
    isRecord(finalReview) ? finalReview.category_strategy : null,
    isRecord(seoPlan) ? seoPlan.category_strategy : null,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const reason = getString(candidate.reason);
    if (reason) return reason;
  }

  return "";
}

function getProhibitedPhraseCheckBlockingReasons(post: BlogPostRow | null) {
  const prohibitedPhraseCheck = getProhibitedPhraseCheck(post);

  if (!prohibitedPhraseCheck) {
    return ["금지 표현 검사 결과가 없습니다."];
  }

  return prohibitedPhraseCheckKeys
    .filter((key) => prohibitedPhraseCheck[key] !== false)
    .map((key) => `금지 표현 검사 항목 ${key}가 false가 아닙니다.`);
}

function getSnapshotSummary(post: BlogPostRow | null) {
  const derivedFacts = getDerivedFacts(post);
  const reviewsSummary = getReviewsSummary(post);
  const scamReportsSummary = getScamReportsSummary(post);

  return {
    dnsCheckedAt: getString(derivedFacts?.dns_last_checked_at),
    whoisCheckedAt: getString(derivedFacts?.whois_last_checked_at),
    approvedReviewCount:
      getNumber(reviewsSummary?.approved_review_count) ?? 0,
    approvedPublicReportCount:
      getNumber(scamReportsSummary?.approved_public_report_count) ?? 0,
  };
}

function postBelongsToCategory(
  post: BlogPostRow,
  categorySlug: BlogCategorySlug,
) {
  const primaryCategory =
    post.primary_category ?? getBlogPrimaryCategoryFromLabel(post.category);

  return (
    primaryCategory === categorySlug ||
    (post.secondary_categories ?? []).includes(categorySlug)
  );
}

function getPublishedPostCountByCategory(
  posts: BlogPostRow[],
  categorySlug: BlogCategorySlug,
) {
  return posts.filter(
    (post) =>
      post.status === "published" &&
      postBelongsToCategory(post, categorySlug),
  ).length;
}

function getCategoryIndexInfo(
  posts: BlogPostRow[],
  categorySlug: BlogCategorySlug,
) {
  const category = blogCategories.find((item) => item.slug === categorySlug);
  const publishedPostCount = getPublishedPostCountByCategory(
    posts,
    categorySlug,
  );
  const canIndex = category
    ? canIndexBlogCategory(category, publishedPostCount)
    : false;

  return {
    canIndex,
    publishedPostCount,
    descriptionLength: category?.description.length ?? 0,
    isActive: category?.is_active ?? false,
  };
}

function getPublishBlockingReasons({
  post,
  payload,
}: {
  post: BlogPostRow | null;
  payload: BlogPostPayload;
}) {
  const reasons: string[] = [];

  if (!post) {
    return ["공개할 블로그 글을 선택해주세요."];
  }

  if (post.status !== "draft") {
    reasons.push("published 전환은 draft 상태에서만 가능합니다.");
  }

  if (post.legal_review_status !== "approved") {
    reasons.push("관리자 검수 완료 상태가 아닙니다.");
  }

  reasons.push(...getProhibitedPhraseCheckBlockingReasons(post));

  if (!payload.body_md.trim()) {
    reasons.push("본문 Markdown이 비어 있습니다.");
  }

  if (!payload.title.trim()) {
    reasons.push("제목이 비어 있습니다.");
  }

  if (!payload.meta_description.trim()) {
    reasons.push("메타 설명이 비어 있습니다.");
  }

  if (!post.source_snapshot_id) {
    reasons.push("source snapshot ID가 없습니다.");
  }

  return reasons;
}

function rowToFormValues(row: BlogPostRow): BlogPostFormValues {
  const faqJson = Array.isArray(row.faq_json) ? row.faq_json : row.faqs;
  const checklistJson = Array.isArray(row.checklist_json)
    ? row.checklist_json
    : [];
  const primaryCategory =
    row.primary_category ?? getBlogPrimaryCategoryFromLabel(row.category);

  return {
    id: row.id,
    status: row.status,
    slug: row.slug,
    category: getBlogCategoryLabel(primaryCategory),
    primaryCategory,
    secondaryCategoriesText: (row.secondary_categories ?? []).join(", "),
    tagsText: (row.tags ?? []).join(", "),
    priority: row.priority,
    title: row.title,
    metaTitle: row.meta_title ?? row.title,
    metaDescription: row.meta_description ?? row.description,
    bodyMarkdown: row.body_md ?? "",
    primaryKeyword: row.primary_keyword ?? "",
    secondaryKeywordsText: (row.secondary_keywords ?? []).join(", "),
    searchIntent: row.search_intent ?? "",
    readerQuestion: row.reader_question ?? "",
    recommendedTitlePattern: row.recommended_title_pattern ?? "",
    summary: row.summary ?? "",
    publishedAt: formatDate(row.published_at),
    updatedAt: formatDate(row.content_updated_at),
    readingMinutes: String(row.reading_minutes ?? 3),
    internalLinksJson: formatJson(row.internal_links),
    sectionsJson: formatJson(row.sections),
    checklistText: (row.checklist ?? []).join("\n"),
    checklistJson: formatJson(checklistJson),
    faqJson: formatJson(faqJson),
  };
}

function blogPostToPayload(post: BlogPost): BlogPostPayload {
  const primaryCategory =
    post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);

  return {
    slug: post.slug,
    status: "draft",
    category: getBlogCategoryLabel(primaryCategory),
    primary_category: primaryCategory,
    secondary_categories: (post.secondaryCategories ?? [])
      .filter((category) => category !== primaryCategory)
      .slice(0, maxSecondaryCategoryCount),
    tags: (post.tags ?? post.secondaryKeywords)
      .filter((tag) => !isBlogCategoryValue(tag))
      .slice(0, 20),
    priority: post.priority,
    title: post.title,
    meta_title: post.metaTitle,
    meta_description: post.description,
    description: post.description,
    primary_keyword: post.primaryKeyword,
    secondary_keywords: post.secondaryKeywords,
    body_md: "",
    faq_json: post.faqs,
    checklist_json: post.checklist.map((item) => ({
      item,
      reason: "",
    })),
    search_intent: post.searchIntent,
    reader_question: post.readerQuestion,
    recommended_title_pattern: post.recommendedTitlePattern,
    summary: post.summary,
    published_at: null,
    content_updated_at: post.updatedAt,
    reading_minutes: post.readingMinutes,
    internal_links: post.internalLinks,
    sections: post.sections,
    checklist: post.checklist,
    faqs: post.faqs,
  };
}

function formValuesToPayload(values: BlogPostFormValues): BlogPostPayload {
  const slug = values.slug.trim();
  const title = values.title.trim();
  const readingMinutes = Number.parseInt(values.readingMinutes, 10);
  const faqJson = parseJsonArray(values.faqJson, "FAQ");
  const checklistJson = parseJsonArray(values.checklistJson, "체크리스트");
  const checklistItemsFromJson = checklistJsonToTextItems(checklistJson);
  const checklistItemsFromText = splitTextList(values.checklistText);
  const secondaryCategories = splitCategorySlugs(values.secondaryCategoriesText)
    .filter((category) => category !== values.primaryCategory);

  if (!slug) {
    throw new Error("slug를 입력해주세요.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("slug는 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }

  if (!title) {
    throw new Error("제목을 입력해주세요.");
  }

  if (!values.metaDescription.trim()) {
    throw new Error("메타 설명을 입력해주세요.");
  }

  if (secondaryCategories.length > maxSecondaryCategoryCount) {
    throw new Error("보조 카테고리는 최대 2개까지 선택하세요.");
  }

  return {
    slug,
    status: values.status,
    category: getBlogCategoryLabel(values.primaryCategory),
    primary_category: values.primaryCategory,
    secondary_categories: secondaryCategories,
    tags: splitTagList(values.tagsText),
    priority: values.priority,
    title,
    meta_title: values.metaTitle.trim() || title,
    meta_description: values.metaDescription.trim(),
    description: values.metaDescription.trim(),
    primary_keyword: values.primaryKeyword.trim(),
    secondary_keywords: splitTextList(values.secondaryKeywordsText),
    body_md: values.bodyMarkdown.trim(),
    faq_json: faqJson,
    checklist_json: checklistJson,
    search_intent: values.searchIntent.trim(),
    reader_question: values.readerQuestion.trim(),
    recommended_title_pattern: values.recommendedTitlePattern.trim(),
    summary: values.summary.trim(),
    published_at: values.status === "published" ? values.publishedAt : null,
    content_updated_at: values.updatedAt || today(),
    reading_minutes: Number.isFinite(readingMinutes)
      ? Math.max(1, readingMinutes)
      : 3,
    internal_links: parseJsonArray(values.internalLinksJson, "내부 링크"),
    sections: parseJsonArray(values.sectionsJson, "본문 섹션"),
    checklist: checklistItemsFromText.length
      ? checklistItemsFromText
      : checklistItemsFromJson,
    faqs: faqJson,
  };
}

export function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [formValues, setFormValues] =
    useState<BlogPostFormValues>(emptyFormValues);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [sourceSiteInput, setSourceSiteInput] = useState(getInitialSourceSiteInput);
  const [generationSummary, setGenerationSummary] =
    useState<GenerateBlogDraftResponse["snapshotSummary"]>(undefined);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  const draftCount = posts.filter((post) => post.status === "draft").length;
  const publishedCount = posts.filter((post) => post.status === "published").length;
  const archivedCount = posts.filter((post) => post.status === "archived").length;

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === formValues.id) ?? null,
    [formValues.id, posts],
  );
  const selectedSnapshotSummary = useMemo(
    () => getSnapshotSummary(selectedPost),
    [selectedPost],
  );
  const prohibitedPhraseCheck = useMemo(
    () => getProhibitedPhraseCheck(selectedPost),
    [selectedPost],
  );
  const categoryRecommendationReason = useMemo(
    () => getCategoryRecommendationReason(selectedPost),
    [selectedPost],
  );
  const selectedSecondaryCategories = useMemo(
    () =>
      getSafeCategorySlugs(formValues.secondaryCategoriesText)
        .filter((category) => category !== formValues.primaryCategory)
        .slice(0, maxSecondaryCategoryCount),
    [formValues.primaryCategory, formValues.secondaryCategoriesText],
  );
  const selectedTags = useMemo(
    () => getSafeTagList(formValues.tagsText),
    [formValues.tagsText],
  );
  const categoryIndexInfo = useMemo(
    () => getCategoryIndexInfo(posts, formValues.primaryCategory),
    [formValues.primaryCategory, posts],
  );

  async function loadPosts() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("blog_posts")
      .select(blogPostSelect)
      .order("updated_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setPosts([]);
      setErrorMessage(
        "블로그 글을 불러오지 못했습니다. supabase/schema.sql의 blog_posts 테이블과 정책을 적용했는지 확인해주세요.",
      );
      return;
    }

    setPosts((data ?? []) as unknown as BlogPostRow[]);
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadPosts());
  }, []);

  function updateField<K extends keyof BlogPostFormValues>(
    field: K,
    value: BlogPostFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startNewPost() {
    setMessage("");
    setErrorMessage("");
    setTagDraft("");
    setFormValues({
      ...emptyFormValues,
      publishedAt: today(),
      updatedAt: today(),
    });
  }

  function selectPost(post: BlogPostRow) {
    setMessage("");
    setErrorMessage("");
    setTagDraft("");
    setFormValues(rowToFormValues(post));
    const sourceSiteId = post.site_id ?? post.source_site_id;

    if (sourceSiteId) {
      setSourceSiteInput(sourceSiteId);
    }
  }

async function savePost() {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    let payload: BlogPostPayload;

    try {
      payload = formValuesToPayload(formValues);
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error ? error.message : "입력값을 확인해주세요.",
      );
      return;
    }

    const isPublishingTransition =
      payload.status === "published" &&
      (!selectedPost || selectedPost.status !== "published");

    if (isPublishingTransition) {
      const blockingReasons = getPublishBlockingReasons({
        post: selectedPost,
        payload,
      });

      if (blockingReasons.length > 0) {
        setIsSaving(false);
        setErrorMessage(blockingReasons.join(" "));
        return;
      }
    }

    const query = formValues.id
      ? supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", formValues.id)
          .select(blogPostSelect)
          .single()
      : supabase.from("blog_posts").insert(payload).select(blogPostSelect).single();

    const { data, error } = await query;

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage(
        error?.message ?? "블로그 글을 저장하지 못했습니다. 입력값을 확인해주세요.",
      );
      return;
    }

    const nextPost = data as unknown as BlogPostRow;
    setPosts((current) => {
      const exists = current.some((post) => post.id === nextPost.id);
      const nextPosts = exists
        ? current.map((post) => (post.id === nextPost.id ? nextPost : post))
        : [nextPost, ...current];

      return nextPosts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
    setFormValues(rowToFormValues(nextPost));
    setMessage("블로그 글을 저장했습니다.");
    window.dispatchEvent(new Event("admin-counts-refresh"));
  }

  async function patchSelectedPost(
    patch: Partial<BlogPostPayload> & {
      legal_review_status?: LegalReviewStatus;
      admin_warnings?: string[];
      published_at?: string | null;
    },
    successMessage: string,
  ) {
    if (!selectedPost) {
      setErrorMessage("처리할 블로그 글을 선택해주세요.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("id", selectedPost.id)
      .select(blogPostSelect)
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage(error?.message ?? "블로그 글 상태를 변경하지 못했습니다.");
      return;
    }

    const nextPost = data as unknown as BlogPostRow;
    setPosts((current) =>
      current.map((post) => (post.id === nextPost.id ? nextPost : post)),
    );
    setFormValues(rowToFormValues(nextPost));
    setMessage(successMessage);
    window.dispatchEvent(new Event("admin-counts-refresh"));
  }

  async function markReviewApproved() {
    await patchSelectedPost(
      {
        legal_review_status: "approved",
        content_updated_at: today(),
      },
      "검수 완료 상태로 변경했습니다.",
    );
  }

  async function publishSelectedPost() {
    let payload: BlogPostPayload;

    try {
      payload = formValuesToPayload(formValues);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "입력값을 확인해주세요.",
      );
      return;
    }

    const blockingReasons = getPublishBlockingReasons({
      post: selectedPost,
      payload,
    });

    if (blockingReasons.length > 0) {
      setErrorMessage(blockingReasons.join(" "));
      return;
    }

    await patchSelectedPost(
      {
        ...payload,
        status: "published",
        published_at: new Date().toISOString(),
        content_updated_at: today(),
      },
      "published 상태로 전환했습니다.",
    );
  }

  async function holdSelectedPost() {
    await patchSelectedPost(
      {
        status: "draft",
        legal_review_status: "needs_review",
        admin_warnings: [
          ...(selectedPost?.admin_warnings ?? []),
          "관리자가 보류 처리했습니다.",
        ],
        published_at: null,
        content_updated_at: today(),
      },
      "보류 상태로 변경했습니다.",
    );
  }

  async function discardSelectedPost() {
    const confirmed = window.confirm(
      `"${selectedPost?.title ?? "선택한 글"}" 초안을 폐기하고 보관 상태로 전환할까요?`,
    );

    if (!confirmed) return;

    await patchSelectedPost(
      {
        status: "archived",
        published_at: null,
        content_updated_at: today(),
      },
      "블로그 초안을 폐기했습니다.",
    );
  }

  async function importDefaultPosts() {
    const confirmed = window.confirm(
      "현재 코드에 있는 블로그 초안을 DB로 가져올까요? 같은 slug는 덮어씁니다.",
    );

    if (!confirmed) return;

    setIsImporting(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("blog_posts")
      .upsert(blogPosts.map(blogPostToPayload), { onConflict: "slug" });

    setIsImporting(false);

    if (error) {
      setErrorMessage(
        "기본 블로그 초안을 가져오지 못했습니다. blog_posts 테이블 적용 여부를 확인해주세요.",
      );
      return;
    }

    setMessage("기본 블로그 초안을 가져왔습니다.");
    window.dispatchEvent(new Event("admin-counts-refresh"));
    await loadPosts();
  }

  async function generateDraftFromSite() {
    const sourceSite = normalizeSiteSourceInput(
      sourceSiteInput || selectedPost?.site_id || selectedPost?.source_site_id || "",
    );

    if (!sourceSite) {
      setErrorMessage("초안을 생성할 사이트 slug 또는 ID를 입력해주세요.");
      return;
    }

    setIsGeneratingDraft(true);
    setMessage("");
    setErrorMessage("");
    setGenerationSummary(undefined);

    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      setIsGeneratingDraft(false);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/blog/generate-from-site", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(
        isUuid(sourceSite)
          ? { siteId: sourceSite, blogPostId: formValues.id || undefined }
          : { siteSlug: sourceSite, blogPostId: formValues.id || undefined },
      ),
    });
    const result = (await response.json().catch(() => null)) as
      | GenerateBlogDraftResponse
      | null;

    setIsGeneratingDraft(false);

    if (!response.ok || !result?.post) {
      const violationText = result?.violations?.length
        ? ` (${result.violations
            .map((violation) => violation.pattern)
            .join(", ")})`
        : "";

      setErrorMessage(
        `${result?.error ?? "AI 블로그 초안 생성에 실패했습니다."}${violationText}`,
      );
      return;
    }

    const nextPost = result.post;
    setPosts((current) => {
      const exists = current.some((post) => post.id === nextPost.id);
      const nextPosts = exists
        ? current.map((post) => (post.id === nextPost.id ? nextPost : post))
        : [nextPost, ...current];

      return nextPosts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
    setGenerationSummary(result.snapshotSummary);
    setTagDraft("");
    setFormValues(rowToFormValues(nextPost));
    setMessage("사이트 데이터 기반 AI 블로그 초안을 draft로 저장했습니다.");
    window.dispatchEvent(new Event("admin-counts-refresh"));
  }

  function updatePrimaryCategory(primaryCategory: BlogCategorySlug) {
    setFormValues((current) => {
      const secondaryCategories = getSafeCategorySlugs(
        current.secondaryCategoriesText,
      )
        .filter((category) => category !== primaryCategory)
        .slice(0, maxSecondaryCategoryCount);

      return {
        ...current,
        category: getBlogCategoryLabel(primaryCategory),
        primaryCategory,
        secondaryCategoriesText: secondaryCategories.join(", "),
      };
    });
  }

  function setSecondaryCategories(categories: BlogCategorySlug[]) {
    updateField(
      "secondaryCategoriesText",
      Array.from(new Set(categories))
        .filter((category) => category !== formValues.primaryCategory)
        .slice(0, maxSecondaryCategoryCount)
        .join(", "),
    );
  }

  function toggleSecondaryCategory(category: BlogCategorySlug) {
    if (category === formValues.primaryCategory) return;

    if (selectedSecondaryCategories.includes(category)) {
      setSecondaryCategories(
        selectedSecondaryCategories.filter((item) => item !== category),
      );
      return;
    }

    if (selectedSecondaryCategories.length >= maxSecondaryCategoryCount) {
      setErrorMessage("보조 카테고리는 최대 2개까지 선택하세요.");
      return;
    }

    setErrorMessage("");
    setSecondaryCategories([...selectedSecondaryCategories, category]);
  }

  function setTagValues(tags: string[]) {
    try {
      updateField("tagsText", splitTagList(tags.join(", ")).join(", "));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "태그 값을 확인해주세요.",
      );
    }
  }

  function addTagFromDraft() {
    const newTags = splitTextList(tagDraft);
    if (newTags.length === 0) return;

    setTagValues([...selectedTags, ...newTags]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    const targetSlug = getBlogTagSlug(tag);

    setTagValues(
      selectedTags.filter((item) => getBlogTagSlug(item) !== targetSlug),
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="전체 글" value={posts.length} />
        <SummaryMetric label="공개 글" value={publishedCount} />
        <SummaryMetric label="초안" value={draftCount} />
        <SummaryMetric label="보관" value={archivedCount} />
      </div>

      {message ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startNewPost}
                className="h-10 rounded-md bg-accent px-3 text-sm font-bold text-white"
              >
                새 글
              </button>
              <button
                type="button"
                onClick={loadPosts}
                disabled={isLoading}
                className="h-10 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-50"
              >
                {isLoading ? "불러오는 중" : "새로고침"}
              </button>
              <button
                type="button"
                onClick={importDefaultPosts}
                disabled={isImporting}
                className="h-10 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-50"
              >
                {isImporting ? "가져오는 중" : "초안 가져오기"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <div className="grid gap-3">
              <h2 className="font-bold">사이트 기반 AI 초안</h2>
              <Field label="사이트 slug 또는 ID">
                <input
                  value={sourceSiteInput}
                  onChange={(event) => setSourceSiteInput(event.target.value)}
                  placeholder="bettok-example 또는 site UUID"
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
              <button
                type="button"
                onClick={generateDraftFromSite}
                disabled={isGeneratingDraft}
                className="h-10 rounded-md bg-accent px-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {isGeneratingDraft ? "생성 중" : "AI 초안 생성"}
              </button>
              {generationSummary ? (
                <p className="text-xs leading-5 text-muted">
                  리뷰 {generationSummary.reviews}건 · 피해 제보{" "}
                  {generationSummary.scamReports}건 · DNS{" "}
                  {generationSummary.dnsRecords}건 · WHOIS{" "}
                  {generationSummary.whoisRecords}건 반영
                </p>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-bold">블로그 게시물</h2>
            </div>
            <div className="max-h-[720px] overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-6 text-sm text-muted">
                  블로그 글을 불러오는 중입니다.
                </p>
              ) : posts.length > 0 ? (
                posts.map((post) => {
                  const isSelected = post.id === formValues.id;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => selectPost(post)}
                      className={`block w-full border-b border-line px-4 py-3 text-left transition last:border-b-0 ${
                        isSelected
                          ? "bg-accent-soft"
                          : "hover:bg-background"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-bold">
                          {post.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
                            post.status === "published"
                              ? "bg-accent-soft text-accent"
                              : "bg-background text-muted"
                          }`}
                        >
                          {statusLabels[post.status]}
                        </span>
                      </span>
                      <span className="mt-1 block break-all text-xs text-muted">
                        /blog/{post.slug}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-sm text-muted">
                  등록된 블로그 글이 없습니다.
                </p>
              )}
            </div>
          </div>
        </aside>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {selectedPost ? "블로그 글 수정" : "새 블로그 글 작성"}
              </h2>
              <p className="mt-1 break-all text-xs text-muted">
                {formValues.slug ? `/blog/${formValues.slug}` : "slug를 입력하세요"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {formValues.status === "published" && formValues.slug ? (
                <Link
                  href={`/blog/${formValues.slug}`}
                  className="inline-flex h-10 items-center rounded-md border border-line px-3 text-sm font-bold"
                >
                  보기
                </Link>
              ) : null}
              <button
                type="button"
                onClick={savePost}
                disabled={isSaving}
                className="h-10 rounded-md bg-accent px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSaving ? "저장 중" : "수정 저장"}
              </button>
              <button
                type="button"
                onClick={generateDraftFromSite}
                disabled={isGeneratingDraft || !selectedPost}
                className="h-10 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-50"
              >
                {isGeneratingDraft ? "생성 중" : "다시 생성"}
              </button>
              <button
                type="button"
                onClick={markReviewApproved}
                disabled={isSaving || !selectedPost}
                className="h-10 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-50"
              >
                검수 완료
              </button>
              <button
                type="button"
                onClick={publishSelectedPost}
                disabled={isSaving || !selectedPost}
                className="h-10 rounded-md border border-accent px-3 text-sm font-bold text-accent disabled:opacity-50"
              >
                published로 전환
              </button>
              <button
                type="button"
                onClick={holdSelectedPost}
                disabled={isSaving || !selectedPost}
                className="h-10 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-50"
              >
                보류
              </button>
              <button
                type="button"
                onClick={discardSelectedPost}
                disabled={isSaving || !selectedPost}
                className="h-10 rounded-md border border-red-200 px-3 text-sm font-bold text-red-700 disabled:opacity-50"
              >
                폐기
              </button>
            </div>
          </div>

          {selectedPost ? (
            <section className="mb-5 grid gap-4 rounded-lg border border-line bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">AI 초안 검토 정보</h3>
                  <p className="mt-1 text-xs text-muted">
                    source snapshot과 AI 검수 결과를 확인한 뒤 공개 전환하세요.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md border border-line bg-surface px-2 py-1">
                    {statusLabels[selectedPost.status]}
                  </span>
                  <span className="rounded-md border border-line bg-surface px-2 py-1">
                    {legalReviewStatusLabels[selectedPost.legal_review_status]}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ReviewMetric
                  label="DNS 조회 시각"
                  value={formatDateTime(selectedSnapshotSummary.dnsCheckedAt)}
                />
                <ReviewMetric
                  label="WHOIS 조회 시각"
                  value={formatDateTime(selectedSnapshotSummary.whoisCheckedAt)}
                />
                <ReviewMetric
                  label="승인된 리뷰 수"
                  value={`${selectedSnapshotSummary.approvedReviewCount}건`}
                />
                <ReviewMetric
                  label="승인된 피해 제보 수"
                  value={`${selectedSnapshotSummary.approvedPublicReportCount}건`}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-md border border-line bg-surface p-3">
                  <h4 className="text-sm font-bold">카테고리 구조</h4>
                  <dl className="mt-3 grid gap-3 text-xs">
                    <div>
                      <dt className="font-semibold text-muted">대표 카테고리</dt>
                      <dd className="mt-1 font-bold">
                        {getBlogCategoryLabel(formValues.primaryCategory)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">보조 카테고리</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {selectedSecondaryCategories.length > 0 ? (
                          selectedSecondaryCategories.map((category) => (
                            <span
                              key={category}
                              className="rounded-md border border-line bg-background px-2 py-1 font-bold"
                            >
                              {getBlogCategoryLabel(category)}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">없음</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">태그</dt>
                      <dd className="mt-2 flex flex-wrap gap-2">
                        {selectedTags.length > 0 ? (
                          selectedTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-line bg-background px-2 py-1 font-bold"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">없음</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">
                        카테고리 자동 추천 사유
                      </dt>
                      <dd className="mt-1 leading-5 text-muted">
                        {categoryRecommendationReason ||
                          "저장된 자동 추천 사유가 없습니다."}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-md border border-line bg-surface p-3">
                  <h4 className="text-sm font-bold">
                    카테고리 페이지 index 여부
                  </h4>
                  <p
                    className={`mt-3 inline-flex rounded-md px-2 py-1 text-xs font-bold ${
                      categoryIndexInfo.canIndex
                        ? "bg-accent-soft text-accent"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {categoryIndexInfo.canIndex
                      ? "index, follow"
                      : "noindex, follow"}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-muted">
                    현재 대표 카테고리의 published 글은{" "}
                    {categoryIndexInfo.publishedPostCount}건입니다. index
                    허용 기준은 활성 카테고리, published 글 3개 이상, 설명
                    80자 이상입니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ReviewMetric
                  label="AI 생성 모델"
                  value={selectedPost.ai_model ?? "확인되지 않음"}
                />
                <ReviewMetric
                  label="Prompt version"
                  value={selectedPost.prompt_version ?? "확인되지 않음"}
                />
                <ReviewMetric
                  label="Source snapshot ID"
                  value={selectedPost.source_snapshot_id ?? "확인되지 않음"}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-line bg-surface p-3">
                  <h4 className="text-sm font-bold">금지 표현 검사 결과</h4>
                  {prohibitedPhraseCheck ? (
                    <dl className="mt-3 grid gap-2 text-xs">
                      {Object.entries(prohibitedPhraseCheck).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3"
                        >
                          <dt className="break-all text-muted">{key}</dt>
                          <dd
                            className={`rounded-md px-2 py-1 font-bold ${
                              value
                                ? "bg-red-50 text-red-700"
                                : "bg-accent-soft text-accent"
                            }`}
                          >
                            {value ? "감지" : "미감지"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      검사 결과가 저장되어 있지 않습니다.
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-line bg-surface p-3">
                  <h4 className="text-sm font-bold">관리자 경고 메시지</h4>
                  {selectedPost.admin_warnings?.length ? (
                    <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted">
                      {selectedPost.admin_warnings.map((warning) => (
                        <li key={warning} className="rounded-md bg-background p-2">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      관리자 경고 메시지가 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <Field label="사용된 source snapshot">
                <textarea
                  value={formatJsonObject(selectedPost.source_snapshot)}
                  readOnly
                  rows={12}
                  className="font-mono rounded-md border border-line bg-surface px-3 py-2 text-xs leading-5"
                />
              </Field>
            </section>
          ) : null}

          <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="상태">
                <select
                  value={formValues.status}
                  onChange={(event) =>
                    updateField("status", event.target.value as BlogStatus)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                >
                  <option value="draft">초안</option>
                  <option value="published">공개</option>
                  <option value="archived">보관</option>
                </select>
              </Field>
              <Field label="대표 카테고리">
                <select
                  value={formValues.primaryCategory}
                  onChange={(event) =>
                    updatePrimaryCategory(event.target.value as BlogCategorySlug)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                >
                  {blogCategories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="카테고리 라벨">
                <input
                  value={getBlogCategoryLabel(formValues.primaryCategory)}
                  readOnly
                  className="h-11 rounded-md border border-line bg-muted/20 px-3 text-sm text-muted"
                />
              </Field>
              <Field label="우선순위">
                <select
                  value={formValues.priority}
                  onChange={(event) =>
                    updateField(
                      "priority",
                      event.target.value as BlogPost["priority"],
                    )
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                >
                  <option value="상">상</option>
                  <option value="중">중</option>
                  <option value="하">하</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="grid gap-2">
                <span className="text-sm font-bold text-foreground">
                  보조 카테고리
                </span>
                <div className="flex flex-wrap gap-2">
                  {blogCategories
                    .filter((category) => category.slug !== formValues.primaryCategory)
                    .map((category) => {
                      const isSelected = selectedSecondaryCategories.includes(
                        category.slug,
                      );

                      return (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() => toggleSecondaryCategory(category.slug)}
                          aria-pressed={isSelected}
                          className={`rounded-md border px-3 py-2 text-xs font-bold transition ${
                            isSelected
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line bg-background text-muted hover:text-foreground"
                          }`}
                        >
                          {isSelected ? "삭제 " : "추가 "}
                          {category.name}
                        </button>
                      );
                    })}
                </div>
                <p className="text-xs text-muted">
                  선택값:{" "}
                  {selectedSecondaryCategories.length > 0
                    ? selectedSecondaryCategories
                        .map(getBlogCategoryLabel)
                        .join(", ")
                    : "없음"}
                </p>
              </div>

              <div className="grid gap-2">
                <span className="text-sm font-bold text-foreground">태그</span>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-md border border-line bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-red-200 hover:text-red-700"
                        title="태그 삭제"
                      >
                        {tag} 삭제
                      </button>
                    ))
                  ) : (
                    <span className="rounded-md border border-line bg-background px-3 py-2 text-xs text-muted">
                      태그 없음
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTagFromDraft();
                      }
                    }}
                    placeholder="태그 입력"
                    className="h-10 min-w-0 flex-1 rounded-md border border-line bg-background px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTagFromDraft}
                    className="h-10 rounded-md border border-line px-3 text-sm font-bold"
                  >
                    추가
                  </button>
                </div>
                <input
                  value={formValues.tagsText}
                  onChange={(event) => updateField("tagsText", event.target.value)}
                  placeholder="쉼표로 직접 편집"
                  className="h-10 rounded-md border border-line bg-background px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <Field label="제목">
                <input
                  value={formValues.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  onBlur={() => {
                    if (!formValues.slug && formValues.title) {
                      updateField("slug", createSlug(formValues.title));
                    }
                  }}
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={formValues.slug}
                  onChange={(event) =>
                    updateField("slug", normalizeSlugInput(event.target.value))
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <Field label="메타 제목">
              <input
                value={formValues.metaTitle}
                onChange={(event) => updateField("metaTitle", event.target.value)}
                className="h-11 rounded-md border border-line bg-background px-3 text-sm"
              />
            </Field>

            <Field label="메타 설명">
              <textarea
                value={formValues.metaDescription}
                onChange={(event) =>
                  updateField("metaDescription", event.target.value)
                }
                rows={3}
                className="rounded-md border border-line bg-background px-3 py-2 text-sm leading-6"
              />
            </Field>

            <Field label="본문 Markdown">
              <textarea
                value={formValues.bodyMarkdown}
                onChange={(event) =>
                  updateField("bodyMarkdown", event.target.value)
                }
                rows={18}
                className="font-mono rounded-md border border-line bg-background px-3 py-2 text-xs leading-5"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="핵심 키워드">
                <input
                  value={formValues.primaryKeyword}
                  onChange={(event) =>
                    updateField("primaryKeyword", event.target.value)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
              <Field label="보조 키워드">
                <input
                  value={formValues.secondaryKeywordsText}
                  onChange={(event) =>
                    updateField("secondaryKeywordsText", event.target.value)
                  }
                  placeholder="쉼표로 구분"
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="검색 의도">
                <textarea
                  value={formValues.searchIntent}
                  onChange={(event) =>
                    updateField("searchIntent", event.target.value)
                  }
                  rows={3}
                  className="rounded-md border border-line bg-background px-3 py-2 text-sm leading-6"
                />
              </Field>
              <Field label="독자 질문">
                <textarea
                  value={formValues.readerQuestion}
                  onChange={(event) =>
                    updateField("readerQuestion", event.target.value)
                  }
                  rows={3}
                  className="rounded-md border border-line bg-background px-3 py-2 text-sm leading-6"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="제목 공식">
                <input
                  value={formValues.recommendedTitlePattern}
                  onChange={(event) =>
                    updateField("recommendedTitlePattern", event.target.value)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
              <Field label="발행일">
                <input
                  type="date"
                  value={formValues.publishedAt}
                  onChange={(event) =>
                    updateField("publishedAt", event.target.value)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
              <Field label="수정일">
                <input
                  type="date"
                  value={formValues.updatedAt}
                  onChange={(event) => updateField("updatedAt", event.target.value)}
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <Field label="요약">
                <textarea
                  value={formValues.summary}
                  onChange={(event) => updateField("summary", event.target.value)}
                  rows={3}
                  className="rounded-md border border-line bg-background px-3 py-2 text-sm leading-6"
                />
              </Field>
              <Field label="읽기 시간">
                <input
                  type="number"
                  min="1"
                  value={formValues.readingMinutes}
                  onChange={(event) =>
                    updateField("readingMinutes", event.target.value)
                  }
                  className="h-11 rounded-md border border-line bg-background px-3 text-sm"
                />
              </Field>
            </div>

            <Field label="내부 링크 JSON">
              <textarea
                value={formValues.internalLinksJson}
                onChange={(event) =>
                  updateField("internalLinksJson", event.target.value)
                }
                rows={7}
                className="font-mono rounded-md border border-line bg-background px-3 py-2 text-xs leading-5"
              />
            </Field>

            <Field label="본문 섹션 JSON">
              <textarea
                value={formValues.sectionsJson}
                onChange={(event) =>
                  updateField("sectionsJson", event.target.value)
                }
                rows={12}
                className="font-mono rounded-md border border-line bg-background px-3 py-2 text-xs leading-5"
              />
            </Field>

            <Field label="체크리스트 텍스트">
              <textarea
                value={formValues.checklistText}
                onChange={(event) =>
                  updateField("checklistText", event.target.value)
                }
                rows={5}
                placeholder="한 줄에 하나씩 입력"
                className="rounded-md border border-line bg-background px-3 py-2 text-sm leading-6"
              />
            </Field>

            <Field label="체크리스트 JSON">
              <textarea
                value={formValues.checklistJson}
                onChange={(event) =>
                  updateField("checklistJson", event.target.value)
                }
                rows={7}
                className="font-mono rounded-md border border-line bg-background px-3 py-2 text-xs leading-5"
              />
            </Field>

            <Field label="FAQ">
              <textarea
                value={formValues.faqJson}
                onChange={(event) => updateField("faqJson", event.target.value)}
                rows={7}
                className="font-mono rounded-md border border-line bg-background px-3 py-2 text-xs leading-5"
              />
            </Field>
          </form>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 break-all text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}
