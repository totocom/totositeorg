import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteBlogVisualSummary } from "@/app/components/site-blog-visual-summary";
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
import { buildBlogImageMetadata } from "@/app/data/blog-visuals";
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

function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getPostMetaDescription(post: PublicBlogPost) {
  return post.metaDescription || post.description;
}

function normalizeImportantSeoText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hasIdenticalTitleMetaH1(post: PublicBlogPost) {
  const title = normalizeImportantSeoText(post.title);
  const metaTitle = normalizeImportantSeoText(post.metaTitle);
  const h1 = normalizeImportantSeoText(post.h1 || post.title);

  return Boolean(title && title === metaTitle && title === h1);
}

function getSectionInternalLinkPlacements(heading: string) {
  const normalizedHeading = heading.toLowerCase();
  const placements: string[] = [];
  const hasAddressOrDomain =
    normalizedHeading.includes("주소") ||
    normalizedHeading.includes("도메인");
  const hasDnsOrWhois =
    normalizedHeading.includes("dns") ||
    normalizedHeading.includes("whois") ||
    normalizedHeading.includes("네임서버") ||
    normalizedHeading.includes("ip");

  if (hasAddressOrDomain) {
    placements.push("address_domain_section");
  }

  if (hasDnsOrWhois) {
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
      {links.map((link, linkIndex) => (
        <Link
          key={`${link.href}-${link.label}-${linkIndex}`}
          href={link.href}
          className="inline-flex min-h-9 items-center rounded-md border border-line bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function BlogExternalReferences({
  references,
}: {
  references: NonNullable<PublicBlogPost["externalReferences"]>;
}) {
  if (references.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase text-muted">참고 자료</h2>
      <div className="mt-3 grid gap-3">
        {references.map((reference, referenceIndex) => (
          <a
            key={`${reference.url}-${reference.title}-${referenceIndex}`}
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold leading-6 text-foreground transition hover:border-accent hover:text-accent"
          >
            <span className="block">{reference.title}</span>
            {reference.publisher || reference.evidenceType ? (
              <span className="mt-1 block text-xs font-medium text-muted">
                {[reference.publisher, reference.evidenceType]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

function BlogShareButtons({
  articleUrl,
  title,
}: {
  articleUrl: string;
  title: string;
}) {
  const encodedUrl = encodeURIComponent(articleUrl);
  const encodedTitle = encodeURIComponent(title);
  const shareLinks = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "메일",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase text-muted">공유</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            className="inline-flex min-h-9 items-center rounded-md border border-line px-3 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function BlogPostInternalLinkHub({
  primaryCategory,
  primaryCategoryLabel,
  sourceSite,
}: {
  primaryCategory: BlogCategorySlug;
  primaryCategoryLabel: string;
  sourceSite: PublicBlogPost["sourceSite"];
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
            {primaryCategoryLabel} 카테고리
          </Link>{" "}
          에 포함된 조회 데이터 기반 정보 정리입니다.
        </p>
        {sourceSite ? (
          <p>
            {sourceSite.name}에 대한 최신 DNS/WHOIS 데이터는{" "}
            <Link
              href={sourceSite.href}
              className="font-bold text-foreground underline decoration-accent/40 underline-offset-4 transition hover:text-accent"
            >
              {sourceSite.name} 확인 데이터
            </Link>
            에서 확인할 수 있습니다.
          </p>
        ) : null}
      </div>

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
    : { index: false, follow: true };

  if (!post) {
    return {
      title: "블로그 글",
      robots,
    };
  }

  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;
  const metaDescription = getPostMetaDescription(post);
  const imageMetadata = buildBlogImageMetadata({
    featuredImageUrl: post.featuredImageUrl,
    featuredImageAlt: post.featuredImageAlt,
  });

  return {
    title: post.metaTitle || post.title,
    description: metaDescription,
    robots,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: `${post.metaTitle || post.title} | ${siteName}`,
      description: metaDescription,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [siteName],
      images: imageMetadata.openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle || post.title,
      description: metaDescription,
      images: imageMetadata.twitterImages,
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
  const h1 = post.h1 || post.title;
  const metaDescription = getPostMetaDescription(post);
  const imageMetadata = buildBlogImageMetadata({
    featuredImageUrl: post.featuredImageUrl,
    featuredImageAlt: post.featuredImageAlt,
  });
  const titleMetaH1Warnings = hasIdenticalTitleMetaH1(post)
    ? ["관리자 경고: title, meta_title, h1이 모두 동일합니다."]
    : [];
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
  const externalReferences = post.externalReferences ?? [];
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
    "@type": "BlogPosting",
    headline: h1,
    name: post.title,
    description: metaDescription,
    url: articleUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: "ko-KR",
    author: {
      "@type": "Organization",
      name: siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
    },
    articleSection: primaryCategoryLabel,
    ...(imageMetadata.jsonLdImage ? { image: imageMetadata.jsonLdImage } : {}),
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

  const faqJsonLd =
    post.faqs.length > 0
      ? {
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
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqJsonLd) }}
        />
      ) : null}

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
              {h1}
            </h1>
            {post.sourceSite ? (
              <SiteBlogVisualSummary
                siteName={post.sourceSite.name}
                siteHref={post.sourceSite.href}
                logoUrl={post.siteLogoUrl}
                logoAlt={post.siteLogoAlt}
                screenshotUrl={post.featuredImageUrl}
                screenshotAlt={post.featuredImageAlt}
                screenshotCaption={post.featuredImageCaption}
              />
            ) : null}
            <p className="mt-4 text-base leading-7 text-muted">
              {post.description}
            </p>
            {titleMetaH1Warnings.length > 0 ? (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {titleMetaH1Warnings[0]}
              </div>
            ) : null}
            {post.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.slice(0, 10).map((tag, tagIndex) => (
                  <Link
                    key={`${getBlogTagSlug(tag)}-${tagIndex}`}
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
            {post.sections.map((section, sectionIndex) => {
              const sectionInternalLinks = (
                sectionLinkPlacementsByHeading.get(section.heading) ?? []
              ).flatMap((placement) =>
                getInternalLinksByPlacement(post.internalLinks, placement),
              );

              return (
                <section key={`${section.heading}-${sectionIndex}`}>
                  <h2 className="text-xl font-bold text-foreground">
                    {section.heading}
                  </h2>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-muted">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={`${section.heading}-paragraph-${paragraphIndex}`}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  {section.bullets ? (
                    <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                      {section.bullets.map((bullet, bulletIndex) => (
                        <li
                          key={`${section.heading}-bullet-${bulletIndex}`}
                          className="flex gap-2"
                        >
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

          {post.checklist.length > 0 ? (
            <section className="rounded-lg border border-line bg-background p-5">
              <h2 className="text-xl font-bold text-foreground">
                체크리스트
              </h2>
              <ul className="mt-4 grid gap-2 text-sm leading-6 text-muted">
                {post.checklist.map((item, itemIndex) => (
                  <li key={`checklist-${itemIndex}`} className="flex gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {post.faqs.length > 0 ? (
            <section className="mt-6 rounded-lg border border-line bg-background p-5">
              <h2 className="text-xl font-bold text-foreground">자주 묻는 질문</h2>
              <dl className="mt-4 divide-y divide-line">
                {post.faqs.map((faq, faqIndex) => (
                  <div
                    key={`${faq.question}-${faqIndex}`}
                    className="py-4 first:pt-0 last:pb-0"
                  >
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
          ) : null}
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

          <BlogExternalReferences references={externalReferences} />

          <BlogShareButtons articleUrl={articleUrl} title={post.title} />

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
