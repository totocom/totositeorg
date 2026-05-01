import { unstable_cache } from "next/cache";
import { formatDisplayDomainText } from "@/app/data/domain-display";
import {
  blogPosts,
  blogCategorySlugs,
  getBlogTagSlug,
  isBlogCategoryValue,
  getBlogPrimaryCategoryFromLabel,
  type BlogPost,
  type PublicBlogPost,
  type BlogCategorySlug,
  type BlogPostSection,
} from "@/app/data/blog-posts";
import { buildBlogVerificationSummary } from "@/app/data/blog-verification";
import { supabase } from "@/lib/supabase/client";

export type { PublicBlogPost };

type PublicBlogPostsResult = {
  posts: PublicBlogPost[];
  errorMessage: string;
  source: "supabase" | "fallback";
};

type PublicBlogPostResult = PublicBlogPostsResult & {
  post: PublicBlogPost | null;
  relatedPosts: PublicBlogPost[];
};

export type PublicBlogTagSummary = {
  slug: string;
  label: string;
  count: number;
};

type BlogPostRow = {
  slug: string;
  status: string;
  legal_review_status: string | null;
  category: string;
  primary_category: string | null;
  secondary_categories: string[] | null;
  tags: string[] | null;
  priority: string;
  title: string;
  meta_title: string;
  description: string;
  summary: string | null;
  published_at: string | null;
  content_updated_at: string | null;
  reading_minutes: number | null;
  internal_links: unknown;
  sections: unknown;
  checklist: string[] | null;
  faqs: unknown;
  source_snapshot: unknown;
  created_at: string;
  updated_at: string;
};

type BlogPostIndexStateRow = {
  status: string;
  legal_review_status: string | null;
};

type SiteBlogBacklinkRow = {
  slug: string;
  title: string;
  published_at: string | null;
  updated_at: string | null;
};

const priorityRank: Record<PublicBlogPost["priority"], number> = {
  상: 0,
  중: 1,
  하: 2,
};

const blogPostSelect = [
  "slug",
  "status",
  "legal_review_status",
  "category",
  "primary_category",
  "secondary_categories",
  "tags",
  "priority",
  "title",
  "meta_title",
  "description",
  "summary",
  "published_at",
  "content_updated_at",
  "reading_minutes",
  "internal_links",
  "sections",
  "checklist",
  "faqs",
  "source_snapshot",
  "created_at",
  "updated_at",
].join(", ");

export function sortBlogPosts(posts: PublicBlogPost[]) {
  return [...posts].sort((a, b) => {
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];

    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title, "ko");
  });
}

function fallbackBlogPosts(errorMessage = ""): PublicBlogPostsResult {
  return {
    posts: sortBlogPosts(blogPosts.map(toPublicBlogPost)),
    errorMessage,
    source: "fallback",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getWrappedSnapshot(value: unknown) {
  const wrappedSnapshot = isRecord(value) ? value : null;
  const snapshot = isRecord(wrappedSnapshot?.snapshot)
    ? wrappedSnapshot.snapshot
    : wrappedSnapshot;

  return isRecord(snapshot) ? snapshot : null;
}

function buildBlogSourceSite(rawSnapshot: unknown): BlogPost["sourceSite"] {
  const snapshot = getWrappedSnapshot(rawSnapshot);
  const site = isRecord(snapshot?.site) ? snapshot.site : null;
  const siteDetailPath = getString(snapshot?.site_detail_path);
  const slug = getString(site?.slug);
  const href =
    siteDetailPath && siteDetailPath.startsWith("/") && !siteDetailPath.startsWith("//")
      ? siteDetailPath
      : slug
        ? `/sites/${slug}`
        : "";

  if (!href) return null;

  const name =
    getString(site?.name_ko) ||
    getString(site?.name) ||
    getString(site?.name_en) ||
    getString(site?.domain) ||
    "사이트";

  return {
    name,
    href,
  };
}

function normalizeDate(value: string | null | undefined, fallback: string) {
  const rawValue = value ?? fallback;
  const date = new Date(rawValue);

  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizePriority(value: string): BlogPost["priority"] {
  return value === "상" || value === "중" || value === "하" ? value : "중";
}

function normalizeBlogCategorySlug(
  value: string | null | undefined,
  fallbackLabel: string,
): BlogCategorySlug {
  const fallback = getBlogPrimaryCategoryFromLabel(fallbackLabel);
  const category = getString(value);

  if (!category) return fallback;
  if (blogCategorySlugs.includes(category as BlogCategorySlug)) {
    return category as BlogCategorySlug;
  }

  return getBlogPrimaryCategoryFromLabel(category);
}

function normalizeBlogCategorySlugs(value: unknown, fallbackLabel: string) {
  return normalizeStringArray(value)
    .map((item) => normalizeBlogCategorySlug(item, fallbackLabel))
    .filter((item, index, items) => items.indexOf(item) === index);
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(getString).filter(Boolean)
    : [];
}

const internalPublicContentPatterns = [
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
  /추정\s*[:：]/,
  /미확인\s*항목/,
  /클레임\s*맵/,
  /키워드\s*(목록|리스트)/,
  /작성\s*브리프/,
];

function normalizePublicSeoText(value: string) {
  return value
    .replace(/공개\s*승인된?\s*먹튀\s*피해\s*제보/g, "먹튀 피해 제보")
    .replace(/공개\s*먹튀\s*피해\s*제보/g, "먹튀 피해 제보")
    .replace(/공개\s*먹튀\s*제보/g, "먹튀 제보")
    .replace(/공개\s*제보\s*현황/g, "먹튀 제보 현황")
    .replace(/공개\s*승인된?\s*데이터/g, "승인 데이터")
    .replace(/공개\s*승인\s*데이터/g, "승인 데이터")
    .replace(/공개\s*승인된?\s*피해\s*제보/g, "피해 제보")
    .replace(/공개\s*승인\s*피해\s*제보/g, "피해 제보")
    .replace(/공개\s*피해/g, "피해")
    .replace(/공개\s*승인된?\s*이용자\s*리뷰/g, "이용자 후기")
    .replace(/공개\s*승인된?\s*리뷰/g, "리뷰")
    .replace(/공개\s*승인\s*리뷰/g, "리뷰")
    .replace(/공개\s*데이터/g, "확인 데이터")
    .replace(/공개\s*제보/g, "제보")
    .replace(
      /Source Snapshot의\s+domains\s+배열에서\s+approved\s+상태로\s+(확인|기록)된\s+도메인은/g,
      "조회 데이터에서 $1된 도메인은",
    )
    .replace(
      /Source Snapshot의\s+sameIpSites\s+항목은\s+빈\s+배열로\s+제공되었습니다\.\s*이는\s+해당\s+스냅샷의\s+조회\s+범위에서/g,
      "이번 조회에서는",
    )
    .replace(/Source Snapshot\s*기준/g, "조회 데이터 기준")
    .replace(/Source Snapshot/g, "조회 데이터")
    .replace(/derived_facts\.name_servers에는/g, "네임서버 조회값에는")
    .replace(/\bdomains\s+배열/g, "도메인 목록")
    .replace(/approved\s+상태/g, "승인 상태")
    .replace(/privacy_protected/g, "개인정보 보호 표시")
    .replace(
      /lookup_status는\s+success로\s+기록되어\s+있습니다/g,
      "조회 상태는 정상으로 기록되어 있습니다",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/·\s*·/g, "·")
    .trim();
}

function ensurePrimaryKeywordInTitle(value: string, sourceSiteName?: string | null) {
  const text = normalizePublicSeoText(value);
  const siteName = sourceSiteName?.trim();

  if (!siteName || text.includes(`${siteName} 토토사이트`)) return text;
  if (!text.startsWith(siteName)) return text;

  return `${siteName} 토토사이트${text.slice(siteName.length)}`;
}

function isInternalPublicContent(value: string) {
  const text = value.trim();

  if (!text) return true;
  return internalPublicContentPatterns.some((pattern) => pattern.test(text));
}

function sanitizePublicText(value: unknown, fallback = "") {
  const lines = getString(value)
    .split(/\r?\n/)
    .map((line) => normalizePublicSeoText(line.trim()))
    .filter((line) => line && !isInternalPublicContent(line));

  return lines.join(" ").trim() || normalizePublicSeoText(fallback);
}

function sanitizePublicStringArray(value: unknown) {
  return normalizeStringArray(value)
    .map((item) => sanitizePublicText(item))
    .filter(Boolean);
}

function toPublicBlogPost(post: BlogPost): PublicBlogPost {
  const {
    primaryKeyword: _primaryKeyword,
    secondaryKeywords: _secondaryKeywords,
    searchIntent: _searchIntent,
    readerQuestion: _readerQuestion,
    recommendedTitlePattern: _recommendedTitlePattern,
    ...publicPost
  } = post;
  void _primaryKeyword;
  void _secondaryKeywords;
  void _searchIntent;
  void _readerQuestion;
  void _recommendedTitlePattern;

  return {
    ...publicPost,
    title: ensurePrimaryKeywordInTitle(publicPost.title, publicPost.sourceSite?.name),
    metaTitle: ensurePrimaryKeywordInTitle(
      publicPost.metaTitle,
      publicPost.sourceSite?.name,
    ),
    description: normalizePublicSeoText(publicPost.description),
    summary: sanitizePublicText(publicPost.summary, publicPost.description),
    sections: normalizeSections(publicPost.sections),
    checklist: sanitizePublicStringArray(publicPost.checklist),
    faqs: normalizeFaqs(publicPost.faqs),
  };
}

function normalizeInternalLinks(value: unknown): BlogPost["internalLinks"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const href = getString(item.href);
      const label = getString(item.label);
      const placement = getString(item.placement);
      const purpose = getString(item.purpose);

      if (!href || !label) return null;
      if (!href.startsWith("/") || href.startsWith("//")) return null;
      return {
        href,
        label: formatDisplayDomainText(normalizePublicSeoText(label)),
        ...(placement ? { placement } : {}),
        ...(purpose ? { purpose } : {}),
      };
    })
    .filter((item): item is BlogPost["internalLinks"][number] => Boolean(item));
}

function normalizeSections(value: unknown): BlogPostSection[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const heading = sanitizePublicText(item.heading);
      const paragraphs = sanitizePublicStringArray(item.paragraphs);
      const bullets = sanitizePublicStringArray(item.bullets);

      if (!heading || isInternalPublicContent(heading) || paragraphs.length === 0) {
        return null;
      }

      return {
        heading: formatDisplayDomainText(heading),
        paragraphs: paragraphs.map(formatDisplayDomainText),
        ...(bullets.length > 0
          ? { bullets: bullets.map(formatDisplayDomainText) }
          : {}),
      };
    })
    .filter((item): item is BlogPostSection => Boolean(item));
}

function normalizeFaqs(value: unknown): BlogPost["faqs"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;

      const question = sanitizePublicText(item.question);
      const answer = sanitizePublicText(item.answer);

      if (!question || !answer) return null;
      return {
        question: formatDisplayDomainText(question),
        answer: formatDisplayDomainText(answer),
      };
    })
    .filter((item): item is BlogPost["faqs"][number] => Boolean(item));
}

function mapBlogPostRow(row: BlogPostRow): PublicBlogPost {
  const createdDate = normalizeDate(row.created_at, new Date().toISOString());
  const publishedAt = normalizeDate(row.published_at, createdDate);
  const sourceSite = buildBlogSourceSite(row.source_snapshot);
  const description = formatDisplayDomainText(
    normalizePublicSeoText(row.description),
  );

  return {
    slug: row.slug,
    category: row.category,
    primaryCategory: normalizeBlogCategorySlug(row.primary_category, row.category),
    secondaryCategories: normalizeBlogCategorySlugs(
      row.secondary_categories,
      row.category,
    ),
    tags: normalizeStringArray(row.tags).filter(
      (tag) => !isBlogCategoryValue(tag),
    ),
    priority: normalizePriority(row.priority),
    title: formatDisplayDomainText(
      ensurePrimaryKeywordInTitle(row.title, sourceSite?.name),
    ),
    metaTitle: formatDisplayDomainText(
      ensurePrimaryKeywordInTitle(row.meta_title, sourceSite?.name),
    ),
    description,
    summary: formatDisplayDomainText(sanitizePublicText(row.summary, description)),
    publishedAt,
    updatedAt: normalizeDate(row.content_updated_at, row.updated_at),
    readingMinutes: row.reading_minutes ?? 3,
    internalLinks: normalizeInternalLinks(row.internal_links),
    sections: normalizeSections(row.sections),
    checklist: sanitizePublicStringArray(row.checklist).map(
      formatDisplayDomainText,
    ),
    faqs: normalizeFaqs(row.faqs),
    sourceSite,
    verificationSummary: buildBlogVerificationSummary(row.source_snapshot),
  };
}

async function getPublicBlogPostsUncached(): Promise<PublicBlogPostsResult> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(blogPostSelect)
    .eq("status", "published")
    .eq("legal_review_status", "approved")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return fallbackBlogPosts(
      "블로그 DB 테이블을 읽지 못해 기본 글 목록을 표시합니다.",
    );
  }

  if (!data || data.length === 0) {
    return fallbackBlogPosts();
  }

  return {
    posts: sortBlogPosts(
      (data as unknown as BlogPostRow[]).map(mapBlogPostRow),
    ),
    errorMessage: "",
    source: "supabase",
  };
}

export const getPublicBlogPosts = unstable_cache(
  getPublicBlogPostsUncached,
  ["public-blog-posts", "public-seo-output-v3"],
  {
    revalidate: 300,
  },
);

export async function getPublicBlogPostBySlug(
  slug: string,
): Promise<PublicBlogPostResult> {
  const result = await getPublicBlogPosts();
  const post = result.posts.find((item) => item.slug === slug) ?? null;
  const relatedPosts = post
    ? result.posts
        .filter((item) => item.slug !== post.slug)
        .map((item) => {
          const itemPrimaryCategory =
            item.primaryCategory ?? getBlogPrimaryCategoryFromLabel(item.category);
          const postPrimaryCategory =
            post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);
          const sharedSecondaryCategoryCount = (
            item.secondaryCategories ?? []
          ).filter((category) =>
            (post.secondaryCategories ?? []).includes(category),
          ).length;
          const sharedTagCount = (item.tags ?? []).filter((tag) =>
            (post.tags ?? []).includes(tag),
          ).length;

          return {
            post: item,
            score:
              (itemPrimaryCategory === postPrimaryCategory ? 4 : 0) +
              sharedSecondaryCategoryCount * 2 +
              sharedTagCount,
          };
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.post.title.localeCompare(b.post.title, "ko");
        })
        .slice(0, 4)
        .map((item) => item.post)
    : [];

  return {
    ...result,
    post,
    relatedPosts,
  };
}

export async function getPublicBlogPostsByCategory(slug: BlogCategorySlug) {
  const result = await getPublicBlogPosts();
  const posts = result.posts.filter((post) => {
    const primaryCategory =
      post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);

    return (
      primaryCategory === slug ||
      (post.secondaryCategories ?? []).includes(slug)
    );
  });

  return {
    ...result,
    posts: sortBlogPosts(posts),
  };
}

export function getPublicBlogTagsFromPosts(posts: PublicBlogPost[]) {
  const tagMap = new Map<string, PublicBlogTagSummary>();

  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      if (isBlogCategoryValue(tag)) continue;

      const slug = getBlogTagSlug(tag);
      if (!slug) continue;

      const existing = tagMap.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(slug, {
          slug,
          label: tag,
          count: 1,
        });
      }
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => {
    const countDiff = b.count - a.count;

    if (countDiff !== 0) return countDiff;
    return a.label.localeCompare(b.label, "ko");
  });
}

export async function getPublicBlogTags() {
  const result = await getPublicBlogPosts();

  return {
    ...result,
    tags: getPublicBlogTagsFromPosts(result.posts),
  };
}

export async function getPublicBlogPostsByTag(slug: string) {
  const normalizedSlug = getBlogTagSlug(slug);
  const result = await getPublicBlogPosts();
  const posts = result.posts.filter((post) =>
    (post.tags ?? []).some((tag) => getBlogTagSlug(tag) === normalizedSlug),
  );
  const tag = getPublicBlogTagsFromPosts(result.posts).find(
    (item) => item.slug === normalizedSlug,
  ) ?? {
    slug: normalizedSlug,
    label: slug,
    count: posts.length,
  };

  return {
    ...result,
    posts: sortBlogPosts(posts),
    tag,
  };
}

export async function getBlogPostIndexStateBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("status, legal_review_status")
    .eq("slug", slug)
    .maybeSingle<BlogPostIndexStateRow>();

  if (error || !data) return null;

  return {
    status: data.status,
    legalReviewStatus: data.legal_review_status,
  };
}

export function canIndexBlogPostState(
  state: Awaited<ReturnType<typeof getBlogPostIndexStateBySlug>>,
) {
  return state?.status === "published" && state.legalReviewStatus === "approved";
}

export async function getPublishedBlogPostForSite(siteId: string) {
  if (!siteId) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, published_at, updated_at")
    .eq("status", "published")
    .eq("legal_review_status", "approved")
    .or(`site_id.eq.${siteId},source_site_id.eq.${siteId}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<SiteBlogBacklinkRow>();

  if (error || !data) return null;

  return data;
}

export async function getPublishedBlogPostsForSitemap() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(blogPostSelect)
    .eq("status", "published")
    .eq("legal_review_status", "approved")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return sortBlogPosts((data as unknown as BlogPostRow[]).map(mapBlogPostRow));
}
