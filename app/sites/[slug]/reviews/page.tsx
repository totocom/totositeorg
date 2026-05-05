import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { cache } from "react";
import { ReviewHelpfulnessVote } from "@/app/components/review-helpfulness-vote";
import { ReviewSummary } from "@/app/components/review-summary";
import { SiteEmptyState } from "@/app/components/site-detail/site-empty-state";
import { buildSiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import { SiteHeaderCommon } from "@/app/components/site-detail/site-header-common";
import {
  buildAggregateRatingJsonLd,
  buildFaqPageJsonLd,
  buildSiteBreadcrumbJsonLd,
  buildSiteWebPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import {
  getReviewFaqItems,
  SiteReviewFaq,
} from "@/app/components/site-detail/site-review-faq";
import { formatKstDate } from "@/app/data/date-format";
import { getSiteReviewsDetail } from "@/app/data/public-site-detail";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import {
  buildOptimalSiteTitle,
  buildReviewsTitleSuffix,
  buildSiteReviewsMetadata,
} from "@/app/data/site-detail-subpage-metadata";
import { formatRatingScore, issueTypeLabels } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

export const dynamicParams = true;
export const revalidate = 300;

type SiteReviewsPageProps = {
  params: Promise<{ slug: string }>;
};

const getCachedDetail = cache((slug: string) => getSiteReviewsDetail(slug));

function redirectDisabledSplitPage(slug: string): never {
  permanentRedirect(`/sites/${encodeURIComponent(slug)}`);
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(Math.max(1, Math.min(5, rating)));

  return (
    <span aria-label={`${filled}점`} className="text-base leading-none">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < filled ? "text-accent" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export async function generateMetadata({
  params,
}: SiteReviewsPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);

  return buildSiteReviewsMetadata(detail, slug);
}

export default async function SiteReviewsPage({ params }: SiteReviewsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);
  const { common, reviews } = detail;
  const site = common.site;

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="reviews" splitEnabled />
        <section className="mt-5 rounded-lg border border-line bg-surface p-6 shadow-sm">
          <Link href="/sites" className="text-sm font-semibold text-accent">
            사이트 목록으로 돌아가기
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted">
            요청한 공개 주소와 일치하는 승인된 사이트가 없습니다.
          </p>
        </section>
      </main>
    );
  }

  const context = buildSiteFaqContext(site);
  const faqItems = getReviewFaqItems(context);
  const canonical = new URL(
    `/sites/${encodeURIComponent(slug)}/reviews`,
    siteUrl,
  ).toString();
  const title = buildOptimalSiteTitle(
    site.siteName,
    buildReviewsTitleSuffix(reviews.length, site.averageRating),
  );
  const description =
    reviews.length > 0
      ? `${site.siteName} 토토사이트의 승인된 후기 ${reviews.length}건과 평점, 이용 경험을 정리했습니다.`
      : `${site.siteName} 토토사이트에 대해 승인된 후기는 아직 없습니다. 후기 작성 방법과 확인 기준을 안내합니다.`;
  const aggregateRatingJsonLd = buildAggregateRatingJsonLd(site);

  return (
    <>
      <JsonLd
        value={buildSiteWebPageJsonLd({
          site,
          canonical,
          title,
          description,
        })}
      />
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "사이트 목록", url: new URL("/sites", siteUrl).toString() },
            { name: site.siteName, url: new URL(`/sites/${encodeURIComponent(slug)}`, siteUrl).toString() },
            { name: "후기", url: canonical },
          ],
        })}
      />
      {aggregateRatingJsonLd ? <JsonLd value={aggregateRatingJsonLd} /> : null}
      <JsonLd value={buildFaqPageJsonLd(faqItems)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="reviews" splitEnabled />

        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  이용 경험
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  {site.siteName} 토토사이트 후기 {reviews.length}건
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  승인된 이용 경험만 공개하며, 평점은 공개 승인 후기에만 반영됩니다.
                </p>
              </div>
              <Link
                href={`/submit-review?siteId=${encodeURIComponent(site.id)}`}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
              >
                후기 작성
              </Link>
            </div>
          </section>

          {reviews.length > 0 ? (
            <section className="grid gap-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars rating={review.rating} />
                        <span className="text-xs font-semibold text-accent">
                          {formatRatingScore(review.rating)}
                        </span>
                        <span className="text-xs text-muted">
                          {issueTypeLabels[review.issueType]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-foreground">
                        {review.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted">
                      {review.authorNickname ?? "익명"} ·{" "}
                      {formatKstDate(review.createdAt)}
                    </p>
                  </div>
                  <ReviewSummary
                    siteName={site.siteName}
                    experience={review.experience}
                  />
                  <ReviewHelpfulnessVote
                    reviewId={review.id}
                    authorUserId={review.authorUserId}
                    initialHelpfulCount={review.helpfulCount ?? 0}
                    initialNotHelpfulCount={review.notHelpfulCount ?? 0}
                  />
                </article>
              ))}
            </section>
          ) : (
            <>
              <SiteEmptyState
                title="현재 승인된 후기가 없습니다"
                description={`${site.siteName} 관련 공개 승인 후기는 아직 없습니다. 작성된 후기가 검토를 통과하면 이 페이지에 표시됩니다.`}
                actionHref={`/submit-review?siteId=${encodeURIComponent(site.id)}`}
                actionLabel="후기 작성"
              />
              <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">
                  후기 작성 전 확인할 항목
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {site.siteName} 후기는 대표 주소 {context.representativeDomain},
                  도메인 {context.domainCount}개, 운영 이력{" "}
                  {context.operatingPeriod} 같은 공개 정보와 함께 검토됩니다.
                  경험 내용에는 입출금, 계정 확인, 고객지원, 이용 카테고리처럼
                  확인 가능한 항목을 구체적으로 남기는 편이 좋습니다.
                </p>
              </section>
            </>
          )}

          <SiteReviewFaq context={context} />
        </div>
      </main>
    </>
  );
}
