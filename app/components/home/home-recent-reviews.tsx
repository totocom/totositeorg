import Link from "next/link";
import { formatKoreanDate } from "@/app/data/public-display";
import { buildReviewCardTitle } from "@/app/data/public-seo-selection";
import type { PublicReviewListItem } from "@/app/data/public-sites";
import { formatRatingScore, issueTypeLabels } from "@/app/data/sites";

type HomeRecentReviewsProps = {
  reviews: PublicReviewListItem[];
};

export function HomeRecentReviews({ reviews }: HomeRecentReviewsProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            최근 후기
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            최근 승인된 이용자 후기
          </h2>
        </div>
        <Link
          href="/reviews"
          aria-label="최근 이용자 후기 전체 보기"
          className="text-sm font-bold text-accent transition hover:text-foreground"
        >
          이용자 후기 전체 보기
        </Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        아래 후기는 승인된 이용자 작성 데이터를 기준으로 표시되며, 후기 수가
        적은 사이트는 평균 점수가 쉽게 변동될 수 있습니다.
      </p>

      {reviews.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-md bg-background p-4">
              <Link
                href={`/sites/${encodeURIComponent(review.site.slug)}/reviews`}
                aria-label={`${review.site.siteName} 이용자 후기 상세 보기`}
                className="text-sm font-bold text-foreground transition hover:text-accent"
              >
                {review.site.siteName}
              </Link>
              <p className="mt-1 text-sm font-semibold text-accent">
                {formatRatingScore(review.rating)} ·{" "}
                {issueTypeLabels[review.issueType]}
              </p>
              <h3 className="mt-2 text-sm font-bold text-foreground">
                {buildReviewCardTitle(review.experience, review.title)}
              </h3>
              <p className="mt-2 text-xs text-muted">
                작성일 {formatKoreanDate(review.createdAt)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-background p-4 text-sm text-muted">
          현재 공개 승인된 이용자 후기가 없습니다.
        </p>
      )}
    </section>
  );
}
