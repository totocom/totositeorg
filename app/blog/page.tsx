import type { Metadata } from "next";
import Link from "next/link";
import {
  blogCategories,
  blogTitlePatterns,
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
  title: "키워드 블로그 전략",
  description:
    "토토사이트 추천, 검증, 후기, 먹튀 제보 키워드를 확보하기 위한 블로그 글감과 제목 전략을 확인하세요.",
  alternates: {
    canonical: `${siteUrl}/blog`,
  },
  openGraph: {
    url: `${siteUrl}/blog`,
    title: `키워드 블로그 전략 | ${siteName}`,
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
                  alt="토토사이트 추천 로고"
                  width="48"
                  height="48"
                  className="neon-logo h-8 w-8 shrink-0"
                />
              </picture>
              <p className="text-sm font-semibold text-white/60">
                키워드 콘텐츠 허브
              </p>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">
              검색 유입을 만들 블로그 글감과 제목 전략
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
              추천 키워드만 반복하지 않고 검증 기준, 피해 예방, 후기 해석,
              운영 정보를 나누어 작성하면 검색 유입과 사이트 신뢰도를 함께
              키울 수 있습니다.
            </p>
          </div>
          <div className="grid content-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
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
              <div>
                <p className="text-2xl font-bold text-accent">
                  {blogTitlePatterns.length}
                </p>
                <p className="mt-1 text-xs text-white/50">제목 공식</p>
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
                사이트명과 세부 키워드
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              카테고리는 큰 주제만 다루고, 사이트명과 DNS·WHOIS 같은 세부
              키워드는 태그로 묶습니다.
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
              우선 작성할 글
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              키워드별 블로그 글 목록
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            우선순위가 높은 글부터 발행하고, 각 글에서 사이트 목록, 후기,
            먹튀 제보 페이지로 내부 링크를 연결하세요.
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="grid gap-4 rounded-lg border border-line bg-background p-4 lg:grid-cols-[1fr_260px]"
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
                    우선순위 {post.priority}
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
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-foreground">검색 의도</dt>
                    <dd className="mt-1 leading-6 text-muted">
                      {post.searchIntent}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-foreground">제목 공식</dt>
                    <dd className="mt-1 leading-6 text-muted">
                      {post.recommendedTitlePattern}
                    </dd>
                  </div>
                </dl>
              </div>
              <aside className="rounded-lg border border-line bg-surface p-4">
                <p className="text-xs font-bold uppercase text-muted">
                  Primary Keyword
                </p>
                <p className="mt-2 text-base font-bold text-foreground">
                  {post.primaryKeyword}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags?.length
                    ? post.tags.slice(0, 4).map((keyword) => (
                        <Link
                          key={keyword}
                          href={`/blog/tag/${encodeURIComponent(
                            getBlogTagSlug(keyword),
                          )}`}
                          className="rounded-md bg-background px-2 py-1 text-xs font-semibold text-muted transition hover:text-accent"
                        >
                          {keyword}
                        </Link>
                      ))
                    : post.secondaryKeywords.slice(0, 4).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-md bg-background px-2 py-1 text-xs font-semibold text-muted"
                        >
                          {keyword}
                        </span>
                      ))}
                </div>
              </aside>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            제목 만드는 법
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">
            반복해서 쓸 제목 공식
          </h2>
          <div className="mt-5 grid gap-4">
            {blogTitlePatterns.map((pattern) => (
              <article
                key={pattern.name}
                className="rounded-lg border border-line bg-background p-4"
              >
                <h3 className="text-sm font-bold text-foreground">
                  {pattern.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {pattern.formula}
                </p>
                <p className="mt-2 text-sm font-semibold text-accent">
                  {pattern.example}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            운영 방향
          </p>
          <h2 className="mt-2 text-2xl font-bold text-foreground">
            어떤 글을 계속 작성할까
          </h2>
          <ol className="mt-5 grid gap-4 text-sm leading-6 text-muted">
            <li>
              <span className="font-bold text-foreground">1. 핵심 허브 글</span>
              <br />
              안전한 토토사이트, 토토사이트 순위, 먹튀사이트 확인처럼 검색량이
              큰 주제는 기준 설명 글로 작성합니다.
            </li>
            <li>
              <span className="font-bold text-foreground">2. 문제 해결 글</span>
              <br />
              출금 지연, 도메인 변경, 피해 제보처럼 사용자가 급하게 찾는
              키워드는 체크리스트 구조로 작성합니다.
            </li>
            <li>
              <span className="font-bold text-foreground">3. 상세 페이지 보강 글</span>
              <br />
              라이선스, WHOIS, DNS, 후기 해석 글은 사이트 상세 페이지의
              신뢰 점수와 함께 연결합니다.
            </li>
            <li>
              <span className="font-bold text-foreground">4. 책임 있는 이용 글</span>
              <br />
              정보 제공 플랫폼의 신뢰도를 위해 19세 이상, 과몰입 예방, 도움
              요청 기준을 주기적으로 연결합니다.
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
