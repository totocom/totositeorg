import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  blogCategories,
  canIndexBlogCategory,
  getBlogCategoryBySlug,
  getBlogCategoryLabel,
  getBlogPrimaryCategoryFromLabel,
  getBlogTagSlug,
  type BlogCategory,
  type BlogCategorySlug,
  type BlogPost,
} from "@/app/data/blog-posts";
import { getPublicBlogPostsByCategory } from "@/app/data/public-blog-posts";
import { siteName, siteUrl } from "@/lib/config";

type BlogCategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return blogCategories.map((category) => ({
    slug: category.slug,
  }));
}

const categoryPagePriorityRank: Record<BlogPost["priority"], number> = {
  상: 0,
  중: 1,
  하: 2,
};

function getDateTime(value: string | null | undefined) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

function sortPostsByTimeDesc(
  posts: BlogPost[],
  getValue: (post: BlogPost) => string | null | undefined,
) {
  return [...posts].sort((a, b) => {
    const timeDiff = getDateTime(getValue(b)) - getDateTime(getValue(a));

    if (timeDiff !== 0) return timeDiff;
    return a.title.localeCompare(b.title, "ko");
  });
}

function getPublicSignalScore(post: BlogPost) {
  const summary = post.verificationSummary;

  if (!summary) return 0;

  return (
    summary.approvedReviewCount +
    summary.approvedPublicScamReportCount * 2 +
    summary.additionalDomainCount
  );
}

function getCategoryPageSections(category: BlogCategory, posts: BlogPost[]) {
  const latestReports = sortPostsByTimeDesc(
    posts,
    (post) => post.publishedAt || post.updatedAt,
  ).slice(0, 6);
  const publicSignalReports = [...posts]
    .filter((post) => getPublicSignalScore(post) > 0)
    .sort((a, b) => {
      const scoreDiff = getPublicSignalScore(b) - getPublicSignalScore(a);

      if (scoreDiff !== 0) return scoreDiff;
      return getDateTime(b.updatedAt) - getDateTime(a.updatedAt);
    })
    .slice(0, 6);
  const recentlyVerifiedReports = sortPostsByTimeDesc(
    posts.filter((post) => post.verificationSummary?.lastVerifiedAt),
    (post) => post.verificationSummary?.lastVerifiedAt,
  ).slice(0, 6);
  const popularReports = [...posts]
    .sort((a, b) => {
      const priorityDiff =
        categoryPagePriorityRank[a.priority] - categoryPagePriorityRank[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      const scoreDiff = getPublicSignalScore(b) - getPublicSignalScore(a);

      if (scoreDiff !== 0) return scoreDiff;
      return getDateTime(b.publishedAt) - getDateTime(a.publishedAt);
    })
    .slice(0, 6);

  return [
    {
      title:
        category.slug === "site-reports"
          ? "최신 사이트 정보 리포트"
          : `최신 ${category.name}`,
      description:
        "최근 공개된 글을 기준으로 이 카테고리의 최신 리포트를 정리합니다.",
      posts: latestReports,
      emptyMessage: "아직 공개된 최신 리포트가 없습니다.",
    },
    {
      title: "공개 리뷰·먹튀 제보가 있는 리포트",
      description:
        "승인된 이용자 리뷰나 공개 먹튀 피해 제보가 연결된 글을 우선 표시합니다.",
      posts: publicSignalReports,
      emptyMessage: "공개 리뷰나 먹튀 제보가 연결된 리포트가 아직 없습니다.",
    },
    {
      title: "최근 DNS/WHOIS가 갱신된 리포트",
      description:
        "도메인, DNS, WHOIS 확인 시점이 있는 글을 최근 검증 순서로 정리합니다.",
      posts: recentlyVerifiedReports,
      emptyMessage: "최근 DNS/WHOIS 갱신 기준으로 표시할 리포트가 아직 없습니다.",
    },
    {
      title: "많이 조회된 리포트",
      description:
        "조회 데이터가 부족한 경우 우선순위와 공개 데이터가 풍부한 글을 먼저 표시합니다.",
      posts: popularReports,
      emptyMessage: "표시할 리포트가 아직 없습니다.",
    },
  ];
}

function CategoryPostCard({ post }: { post: BlogPost }) {
  const postPrimaryCategory =
    post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);
  const verificationSummary = post.verificationSummary;

  return (
    <article className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/blog/category/${postPrimaryCategory}`}
          className="rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent transition hover:bg-accent/15"
        >
          {getBlogCategoryLabel(postPrimaryCategory)}
        </Link>
        <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted">
          {post.readingMinutes}분 읽기
        </span>
        {verificationSummary?.lastVerifiedAt ? (
          <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted">
            검증 {verificationSummary.lastVerifiedText}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-bold text-foreground">
        <Link href={`/blog/${post.slug}`} className="transition hover:text-accent">
          {post.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
        {post.description}
      </p>

      {verificationSummary ? (
        <div className="mt-4 grid gap-2 text-xs font-semibold text-muted sm:grid-cols-2">
          <span>공개 리뷰 {verificationSummary.approvedReviewCount}개</span>
          <span>
            먹튀 제보 {verificationSummary.approvedPublicScamReportCount}개
          </span>
          <span>추가 도메인 {verificationSummary.additionalDomainCount}개</span>
          <span className="truncate">DNS {verificationSummary.dnsLookupResult}</span>
        </div>
      ) : null}

      {post.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.slice(0, 6).map((tag) => (
            <Link
              key={tag}
              href={`/blog/tag/${encodeURIComponent(getBlogTagSlug(tag))}`}
              className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:text-accent"
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function CategoryPostSection({
  title,
  description,
  posts,
  emptyMessage,
}: {
  title: string;
  description: string;
  posts: BlogPost[];
  emptyMessage: string;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>

      {posts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <CategoryPostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

export async function generateMetadata({
  params,
}: BlogCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getBlogCategoryBySlug(slug);

  if (!category) {
    return {
      title: "블로그 카테고리",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${siteUrl}/blog/category/${category.slug}`;
  const { posts } = await getPublicBlogPostsByCategory(
    category.slug as BlogCategorySlug,
  );
  const publishedPostCount = posts.length;
  const canIndexCategory = canIndexBlogCategory(category, publishedPostCount);

  return {
    title: `${category.name} | 블로그`,
    description: category.description,
    robots: {
      index: canIndexCategory,
      follow: true,
    },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      url: canonicalUrl,
      title: `${category.name} | ${siteName}`,
      description: category.description,
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: BlogCategoryPageProps) {
  const { slug } = await params;
  const category = getBlogCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const { posts, errorMessage } = await getPublicBlogPostsByCategory(
    category.slug as BlogCategorySlug,
  );
  const categorySections = getCategoryPageSections(category, posts);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description,
    url: `${siteUrl}/blog/category/${category.slug}`,
    mainEntity: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/blog" className="font-semibold transition hover:text-accent">
            블로그
          </Link>
          <span>/</span>
          <span>{category.name}</span>
        </nav>

        <header className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            {category.slug}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground">
            {category.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            {category.description}
          </p>
          <p className="mt-3 text-sm font-semibold text-muted">
            {category.purpose} · 공개 글 {posts.length}개
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-muted">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-8">
          {categorySections.map((section) => (
            <CategoryPostSection
              key={section.title}
              title={section.title}
              description={section.description}
              posts={section.posts}
              emptyMessage={section.emptyMessage}
            />
          ))}
        </div>
      </main>
    </>
  );
}
