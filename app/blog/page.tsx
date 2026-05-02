import type { Metadata } from "next";
import Link from "next/link";
import {
  blogCategories,
  getBlogCategoryLabel,
  getBlogPrimaryCategoryFromLabel,
  getBlogTagSlug,
} from "@/app/data/blog-posts";
import {
  getPublicBlogPosts,
  getPublicBlogTagsFromPosts,
} from "@/app/data/public-blog-posts";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "블로그",
  description:
    "토토사이트 도메인·DNS 정보, 이용자 리뷰와 먹튀 피해 제보를 바탕으로 정리한 정보 글을 확인하세요.",
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
  openGraph: {
    url: `${siteUrl}/blog`,
    title: `블로그 | ${siteName}`,
    description: siteDescription,
  },
};

export default async function BlogPage() {
  const { posts, errorMessage } = await getPublicBlogPosts();
  const categoryCounts = posts.reduce<Record<string, number>>((counts, post) => {
    const category =
      post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  const tagSummaries = getPublicBlogTagsFromPosts(posts).slice(0, 24);
  const firstPostHref = posts[0] ? `/blog/${posts[0].slug}` : "/blog";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-lg border border-white/10 bg-[#111111] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
          <div>
            <div className="flex items-center gap-2">
              <picture className="shrink-0">
                <source srcSet="/logo-96.avif" type="image/avif" />
                <source srcSet="/logo-96.webp" type="image/webp" />
                <img
                  src="/logo-96.webp"
                  alt="토토사이트 정보 로고"
                  width="48"
                  height="48"
                  className="neon-logo h-8 w-8 shrink-0"
                />
              </picture>
              <p className="text-sm font-semibold text-white/60">
                정보 리포트
              </p>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">
              도메인과 제보로 살펴보는 토토사이트 정보
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
              도메인·DNS 기록, 승인된 리뷰, 먹튀 피해 제보, 이용 전
              확인할 체크리스트를 한곳에서 읽기 쉽게 정리합니다.
            </p>
          </div>
          <div className="grid content-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-accent">
                  {blogCategories.length}
                </p>
                <p className="mt-1 text-xs text-white/50">카테고리</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">
                  {posts.length}
                </p>
                <p className="mt-1 text-xs text-white/50">블로그 글</p>
              </div>
            </div>
            <Link
              href={firstPostHref}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/90"
            >
              첫 번째 글 보기
            </Link>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-muted">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-4">
        {blogCategories.map((category) => (
          <article
            key={category.slug}
            className="rounded-lg border border-line bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">
                <Link
                  href={`/blog/category/${category.slug}`}
                  className="transition hover:text-accent"
                >
                  {category.name}
                </Link>
              </h2>
              <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                {categoryCounts[category.slug] ?? 0}개
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {category.description}
            </p>
            <p className="mt-4 text-xs font-semibold text-muted">
              {category.purpose}
            </p>
          </article>
        ))}
      </section>

      {tagSummaries.length > 0 ? (
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-accent">
                태그
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                주제별 모음
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              사이트명, DNS, WHOIS, 먹튀 제보처럼 함께 확인하면 좋은 세부
              주제를 태그로 묶었습니다.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {tagSummaries.map((tag) => (
              <Link
                key={tag.slug}
                href={`/blog/tag/${encodeURIComponent(tag.slug)}`}
                className="rounded-md border border-line bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
              >
                {tag.label}
                <span className="ml-2 text-xs text-muted">{tag.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              최신 글
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              블로그 글 목록
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            각 글은 도메인·DNS 데이터와 이용자 제보를 바탕으로 확인할 내용과
            주의할 지점을 자연스럽게 정리합니다.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="rounded-lg border border-line bg-background p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                    <Link
                      href={`/blog/category/${
                        post.primaryCategory ??
                        getBlogPrimaryCategoryFromLabel(post.category)
                      }`}
                    >
                      {getBlogCategoryLabel(
                        post.primaryCategory ??
                          getBlogPrimaryCategoryFromLabel(post.category),
                      )}
                    </Link>
                  </span>
                  <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted">
                    {post.readingMinutes}분 글
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-foreground">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {post.summary}
                </p>
                {post.tags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 4).map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog/tag/${encodeURIComponent(
                          getBlogTagSlug(tag),
                        )}`}
                        className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-muted transition hover:text-accent"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase text-accent">고지</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">
          블로그 글을 읽기 전 확인할 점
        </h2>
        <ul className="mt-5 grid gap-3 text-sm leading-6 text-muted">
          <li>
            이 블로그는 승인된 리뷰와 제보, 도메인·DNS·WHOIS 조회
            결과를 기준으로 정보를 정리합니다.
          </li>
          <li>
            조회 데이터가 없거나 확인되지 않은 항목은 단정하지 않으며, 글마다
            조회 시점의 한계를 함께 안내합니다.
          </li>
          <li>
            사이트 이용, 가입, 충전, 베팅을 권유하지 않으며 정보 확인 목적의
            참고 자료로만 제공합니다.
          </li>
        </ul>
      </section>
    </main>
  );
}
