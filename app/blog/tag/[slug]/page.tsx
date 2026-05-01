import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogCategoryLabel,
  getBlogPrimaryCategoryFromLabel,
  getBlogTagSlug,
} from "@/app/data/blog-posts";
import {
  getPublicBlogPostsByTag,
  getPublicBlogTags,
} from "@/app/data/public-blog-posts";
import { siteName, siteUrl } from "@/lib/config";

type BlogTagPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;
export const dynamicParams = true;

function decodeTagParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateStaticParams() {
  const { tags } = await getPublicBlogTags();

  return tags.map((tag) => ({
    slug: tag.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogTagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = getBlogTagSlug(decodeTagParam(slug));
  const { tag } = await getPublicBlogPostsByTag(normalizedSlug);

  if (!normalizedSlug || tag.count === 0) {
    return {
      title: "블로그 태그",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${siteUrl}/blog/tag/${encodeURIComponent(tag.slug)}`;

  return {
    title: `${tag.label} 태그 글 | 블로그`,
    description: `${tag.label} 태그로 묶인 공개 블로그 글 목록입니다.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      url: canonicalUrl,
      title: `${tag.label} 태그 글 | ${siteName}`,
      description: `${tag.label} 태그로 묶인 공개 블로그 글 목록입니다.`,
    },
  };
}

export default async function BlogTagPage({ params }: BlogTagPageProps) {
  const { slug } = await params;
  const normalizedSlug = getBlogTagSlug(decodeTagParam(slug));
  const { posts, tag, errorMessage } =
    await getPublicBlogPostsByTag(normalizedSlug);

  if (!normalizedSlug || tag.count === 0) {
    notFound();
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${tag.label} 태그 글`,
    description: `${tag.label} 태그로 묶인 공개 블로그 글 목록입니다.`,
    url: `${siteUrl}/blog/tag/${encodeURIComponent(tag.slug)}`,
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
          <span>태그</span>
          <span>/</span>
          <span>{tag.label}</span>
        </nav>

        <header className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">tag</p>
          <h1 className="mt-2 text-3xl font-extrabold text-foreground">
            {tag.label}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            태그는 사이트명, DNS, WHOIS, 먹튀 피해 제보처럼 글의 세부
            키워드를 묶습니다. 큰 주제 분류는 카테고리에서 관리합니다.
          </p>
          <p className="mt-3 text-sm font-semibold text-muted">
            공개 글 {posts.length}개
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm font-semibold text-muted">
            {errorMessage}
          </div>
        ) : null}

        <section className="grid gap-4">
          {posts.map((post) => {
            const categorySlug =
              post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);

            return (
              <article
                key={post.slug}
                className="rounded-lg border border-line bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/blog/category/${categorySlug}`}
                    className="rounded-md bg-accent-soft px-2 py-1 text-xs font-bold text-accent transition hover:bg-accent/15"
                  >
                    {getBlogCategoryLabel(categorySlug)}
                  </Link>
                  <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted">
                    {post.readingMinutes}분 읽기
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold text-foreground">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="transition hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {post.description}
                </p>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}
