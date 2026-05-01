import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogCategoryLabel,
  getBlogPrimaryCategoryFromLabel,
  getBlogTagSlug,
  type BlogCategorySlug,
} from "@/app/data/blog-posts";
import {
  canIndexBlogPostState,
  getBlogPostIndexStateBySlug,
  getPublicBlogPostBySlug,
  getPublicBlogPosts,
  type PublicBlogPost,
} from "@/app/data/public-blog-posts";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;
export const dynamicParams = true;

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type InternalDataLink = {
  href: string;
  label: string;
  placement?: string;
  purpose?: string;
};

function getInternalLinksByPlacement(
  internalLinks: InternalDataLink[],
  placement: string,
) {
  return internalLinks.filter((link) => link.placement === placement);
}

function getSectionInternalLinkPlacements(heading: string) {
  const normalizedHeading = heading.toLowerCase();
  const placements: string[] = [];

  if (
    normalizedHeading.includes("도메인") ||
    normalizedHeading.includes("dns") ||
    normalizedHeading.includes("whois")
  ) {
    placements.push("dns_section");
  }

  if (
    normalizedHeading.includes("피해") ||
    normalizedHeading.includes("제보") ||
    normalizedHeading.includes("먹튀")
  ) {
    placements.push("reports_section");
  }

  if (
    normalizedHeading.includes("리뷰") ||
    normalizedHeading.includes("후기") ||
    normalizedHeading.includes("이용 경험")
  ) {
    placements.push("reviews_section");
  }

  return placements;
}

function InternalDataLinks({ links }: { links: InternalDataLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          className="inline-flex min-h-9 items-center rounded-md border border-line bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function BlogPostInternalLinkHub({
  primaryCategory,
  primaryCategoryLabel,
  sourceSite,
  relatedPosts,
}: {
  primaryCategory: BlogCategorySlug;
  primaryCategoryLabel: string;
  sourceSite: PublicBlogPost["sourceSite"];
  relatedPosts: PublicBlogPost[];
}) {
  return (
    <section className="border-b border-line py-6">
      <h2 className="text-xl font-bold text-foreground">연결된 정보</h2>
      <div className="mt-3 grid gap-3 text-sm leading-7 text-muted">
        <p>
          이 글은{" "}
          <Link
            href={`/blog/category/${primaryCategory}`}
            className="font-bold text-foreground underline decoration-accent/40 underline-offset-4 transition hover:text-accent"
          >
            {primaryCategoryLabel}
          </Link>{" "}
          카테고리에 포함된 조회 데이터 기반 정보 정리입니다.
        </p>
        {sourceSite ? (
          <p>
            {sourceSite.name}에 대한 최신 DNS/WHOIS 데이터는{" "}
            <Link
              href={sourceSite.href}
              className="font-bold text-foreground underline decoration-accent/40 underline-offset-4 transition hover:text-accent"
            >
              {sourceSite.name} 상세 정보 페이지
            </Link>
            에서 확인할 수 있습니다.
          </p>
        ) : null}
      </div>

      {relatedPosts.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-bold uppercase text-muted">
            관련 블로그 글
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {relatedPosts.slice(0, 4).map((relatedPost) => (
              <Link
                key={relatedPost.slug}
                href={`/blog/${relatedPost.slug}`}
                className="rounded-md border border-line bg-background px-3 py-2 text-sm font-semibold leading-6 text-foreground transition hover:border-accent hover:text-accent"
              >
                {relatedPost.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export async function generateStaticParams() {
  const { posts } = await getPublicBlogPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await getPublicBlogPostBySlug(slug);
  const indexState = await getBlogPostIndexStateBySlug(slug);
  const robots = canIndexBlogPostState(indexState)
    ? { index: true, follow: true }
    : { index: false, follow: false };

  if (!post) {
    return {
      title: "블로그 글",
      robots,
    };
  }

  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;

  return {
    title: post.metaTitle,
    description: post.description,
    robots,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: `${post.metaTitle} | ${siteName}`,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [siteName],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const { post, relatedPosts } = await getPublicBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleUrl = `${siteUrl}/blog/${post.slug}`;
  const primaryCategory =
    post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);
  const primaryCategoryLabel = getBlogCategoryLabel(primaryCategory);
  const breadcrumbItems = [
    {
      name: "홈",
      href: "/",
      item: siteUrl,
    },
    {
      name: "블로그",
      href: "/blog",
      item: `${siteUrl}/blog`,
    },
    {
      name: primaryCategoryLabel,
      href: `/blog/category/${primaryCategory}`,
      item: `${siteUrl}/blog/category/${primaryCategory}`,
    },
    {
      name: post.title,
      href: `/blog/${post.slug}`,
      item: articleUrl,
    },
  ];
  const summaryInternalLinks = getInternalLinksByPlacement(
    post.internalLinks,
    "summary",
  );
  const faqInternalLinks = getInternalLinksByPlacement(post.internalLinks, "faq");
  const sidebarInternalLinks = post.internalLinks.filter((link) => !link.placement);
  const sectionLinkPlacementsByHeading = new Map<string, string[]>();
  const usedSectionLinkPlacements = new Set<string>();

  for (const section of post.sections) {
    const placements = getSectionInternalLinkPlacements(section.heading).filter(
      (placement) => !usedSectionLinkPlacements.has(placement),
    );

    if (placements.length > 0) {
      sectionLinkPlacementsByHeading.set(section.heading, placements);
      placements.forEach((placement) => usedSectionLinkPlacements.add(placement));
    }
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    mainEntityOfPage: articleUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
    articleSection: primaryCategoryLabel,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <article className="min-w-0 rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-7">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbItems.map((item, index) => {
                const isCurrentPage = index === breadcrumbItems.length - 1;

                return (
                  <li
                    key={item.href}
                    className="flex min-w-0 items-center gap-2"
                  >
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-muted/70">
                        /
                      </span>
                    ) : null}
                    {isCurrentPage ? (
                      <span
                        aria-current="page"
                        className="break-words font-semibold text-foreground"
                      >
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="font-semibold transition hover:text-accent"
                      >
                        {item.name}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <header className="mt-5 border-b border-line pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent">
                {primaryCategoryLabel}
              </span>
              <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted">
                {post.readingMinutes}분 읽기
              </span>
            </div>
            {post.verificationSummary ? (
              <p className="mt-4 rounded-md border border-line bg-background px-3 py-2 text-sm font-semibold text-muted">
                마지막 정보 확인 시각: {post.verificationSummary.lastVerifiedText}
              </p>
            ) : null}
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted">
              {post.description}
            </p>
            {post.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.slice(0, 10).map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${encodeURIComponent(getBlogTagSlug(tag))}`}
                    className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          <BlogPostInternalLinkHub
            primaryCategory={primaryCategory}
            primaryCategoryLabel={primaryCategoryLabel}
            sourceSite={post.sourceSite}
            relatedPosts={relatedPosts}
          />

          <section className="border-b border-line py-6">
            <h2 className="text-xl font-bold text-foreground">
              요약
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              {post.summary}
            </p>
            <InternalDataLinks links={summaryInternalLinks} />
          </section>

          <div className="grid gap-8 py-6">
            {post.sections.map((section) => {
              const sectionInternalLinks = (
                sectionLinkPlacementsByHeading.get(section.heading) ?? []
              ).flatMap((placement) =>
                getInternalLinksByPlacement(post.internalLinks, placement),
              );

              return (
                <section key={section.heading}>
                  <h2 className="text-xl font-bold text-foreground">
                    {section.heading}
                  </h2>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-muted">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets ? (
                    <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <InternalDataLinks links={sectionInternalLinks} />
                </section>
              );
            })}
          </div>

          <section className="rounded-lg border border-line bg-background p-5">
            <h2 className="text-xl font-bold text-foreground">
              체크리스트
            </h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
              {post.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-lg border border-line bg-background p-5">
            <h2 className="text-xl font-bold text-foreground">자주 묻는 질문</h2>
            <dl className="mt-4 divide-y divide-line">
              {post.faqs.map((faq) => (
                <div key={faq.question} className="py-4 first:pt-0 last:pb-0">
                  <dt className="text-sm font-bold text-foreground">
                    {faq.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
            <InternalDataLinks links={faqInternalLinks} />
          </section>
        </article>

        <aside className="grid content-start gap-4">
          {post.verificationSummary ? (
            <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase text-muted">
                확인 데이터 요약
              </h2>
              <dl className="mt-3 grid gap-3 text-sm">
                <div>
                  <dt className="font-bold text-foreground">대표 도메인</dt>
                  <dd className="mt-1 text-muted">
                    {post.verificationSummary.representativeDomain}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">추가 도메인 수</dt>
                  <dd className="mt-1 text-muted">
                    {post.verificationSummary.additionalDomainCount}개
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">DNS 조회 결과</dt>
                  <dd className="mt-1 leading-6 text-muted">
                    {post.verificationSummary.dnsLookupResult}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">WHOIS 날짜</dt>
                  <dd className="mt-1 leading-6 text-muted">
                    등록 {post.verificationSummary.whoisCreatedDate ?? "확인되지 않음"}
                    <br />
                    갱신 {post.verificationSummary.whoisUpdatedDate ?? "확인되지 않음"}
                    <br />
                    만료 {post.verificationSummary.whoisExpirationDate ?? "확인되지 않음"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">승인 데이터</dt>
                  <dd className="mt-1 leading-6 text-muted">
                    리뷰 {post.verificationSummary.approvedReviewCount}개
                    <br />
                    피해 제보{" "}
                    {post.verificationSummary.approvedPublicScamReportCount}개
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {sidebarInternalLinks.length > 0 ? (
            <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase text-muted">
                내부 링크
              </h2>
              <div className="mt-3 grid gap-2">
                {sidebarInternalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {relatedPosts.length > 0 ? (
            <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase text-muted">
                같은 주제 글
              </h2>
              <div className="mt-3 grid gap-3">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="text-sm font-semibold leading-6 text-foreground transition hover:text-accent"
                  >
                    {relatedPost.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/90"
          >
            전체 글 보기
          </Link>
        </aside>
      </main>
    </>
  );
}
