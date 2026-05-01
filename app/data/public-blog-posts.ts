import { unstable_cache } from "next/cache";
import { formatDisplayDomainText } from "@/app/data/domain-display";
import {
  blogPosts,
  blogCategorySlugs,
  getBlogTagSlug,
  isBlogCategoryValue,
  getBlogPrimaryCategoryFromLabel,
  type BlogPost,
  type BlogCategorySlug,
  type BlogPostSection,
} from "@/app/data/blog-posts";
import { buildBlogVerificationSummary } from "@/app/data/blog-verification";
import { supabase } from "@/lib/supabase/client";

type PublicBlogPostsResult = {
  posts: BlogPost[];
  errorMessage: string;
  source: "supabase" | "fallback";
};

type PublicBlogPostResult = PublicBlogPostsResult & {
  post: BlogPost | null;
  relatedPosts: BlogPost[];
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
  primary_keyword: string;
  secondary_keywords: string[] | null;
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

const priorityRank: Record<BlogPost["priority"], number> = {
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
  "primary_keyword",
  "secondary_keywords",
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
  "source_snapshot",
  "created_at",
  "updated_at",
].join(", ");

export function sortBlogPosts(posts: BlogPost[]) {
  return [...posts].sort((a, b) => {
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];

    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title, "ko");
  });
}

function fallbackBlogPosts(errorMessage = ""): PublicBlogPostsResult {
  return {
    posts: sortBlogPosts(blogPosts),
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
        label: formatDisplayDomainText(label),
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

      const heading = getString(item.heading);
      const paragraphs = normalizeStringArray(item.paragraphs);
      const bullets = normalizeStringArray(item.bullets);

      if (!heading || paragraphs.length === 0) return null;

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

      const question = getString(item.question);
      const answer = getString(item.answer);

      if (!question || !answer) return null;
      return {
        question: formatDisplayDomainText(question),
        answer: formatDisplayDomainText(answer),
      };
    })
    .filter((item): item is BlogPost["faqs"][number] => Boolean(item));
}

function mapBlogPostRow(row: BlogPostRow): BlogPost {
  const createdDate = normalizeDate(row.created_at, new Date().toISOString());
  const publishedAt = normalizeDate(row.published_at, createdDate);

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
    title: formatDisplayDomainText(row.title),
    metaTitle: formatDisplayDomainText(row.meta_title),
    description: formatDisplayDomainText(row.description),
    primaryKeyword: formatDisplayDomainText(row.primary_keyword),
    secondaryKeywords: (row.secondary_keywords ?? []).map(formatDisplayDomainText),
    searchIntent: formatDisplayDomainText(row.search_intent ?? ""),
    readerQuestion: formatDisplayDomainText(row.reader_question ?? ""),
    recommendedTitlePattern: formatDisplayDomainText(
      row.recommended_title_pattern ?? "",
    ),
    summary: formatDisplayDomainText(row.summary ?? ""),
    publishedAt,
    updatedAt: normalizeDate(row.content_updated_at, row.updated_at),
    readingMinutes: row.reading_minutes ?? 3,
    internalLinks: normalizeInternalLinks(row.internal_links),
    sections: normalizeSections(row.sections),
    checklist: (row.checklist ?? []).map(formatDisplayDomainText),
    faqs: normalizeFaqs(row.faqs),
    sourceSite: buildBlogSourceSite(row.source_snapshot),
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
  ["public-blog-posts"],
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

export function getPublicBlogTagsFromPosts(posts: BlogPost[]) {
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
