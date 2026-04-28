import type { Metadata } from "next";
import Link from "next/link";
import { ReviewSummary } from "@/app/components/review-summary";
import { getPublicReviewList } from "@/app/data/public-sites";
import { issueTypeLabels } from "@/app/data/sites";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "이용자 만족도 평가",
  description:
    "승인된 토토사이트 이용자 만족도 평가를 최신순으로 확인하세요.",
  alternates: {
    canonical: `${siteUrl}/reviews`,
  },
  openGraph: {
    url: `${siteUrl}/reviews`,
    title: `이용자 만족도 평가 | ${siteName}`,
    description: siteDescription,
  },
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

export default async function ReviewsPage() {
  const { items, errorMessage, source } = await getPublicReviewList();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-accent">
            이용자 만족도 평가
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            승인된 만족도 평가를 최신순으로 확인하세요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            사이트별로 승인된 이용 경험만 모았습니다. 항목을 선택하면 해당
            사이트 상세 페이지의 리뷰 영역으로 이동합니다.
          </p>
        </div>
        <Link
          href="/submit-review"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
        >
          만족도 평가 작성
        </Link>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </section>
      ) : null}

      {source === "fallback" ? (
        <p className="text-sm text-muted">
          현재 개발용 더미 데이터가 표시되고 있습니다.
        </p>
      ) : null}

      {items.length > 0 ? (
        <section className="grid gap-4">
          {items.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/sites/${review.site.slug}#reviews`}
                    className="text-sm font-semibold text-accent transition hover:text-foreground"
                  >
                    {review.site.siteName}
                  </Link>
                  <h2 className="mt-1 text-xl font-bold text-foreground">
                    {review.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {issueTypeLabels[review.issueType]} · {review.stateUsed} ·{" "}
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                <p className="w-fit rounded-md bg-background px-3 py-1 text-sm font-semibold">
                  {review.rating}/5
                </p>
              </div>
              <ReviewSummary
                siteName={review.site.siteName}
                experience={review.experience}
              />
              <div className="mt-4">
                <Link
                  href={`/sites/${review.site.slug}#reviews`}
                  className="text-sm font-semibold text-accent transition hover:text-foreground"
                >
                  해당 게시물 보기
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            공개된 만족도 평가가 없습니다
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            관리자 승인이 완료된 만족도 평가가 있으면 이곳에 표시됩니다.
          </p>
        </section>
      )}
    </main>
  );
}
