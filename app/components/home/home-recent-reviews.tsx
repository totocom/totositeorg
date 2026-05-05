import Link from "next/link";
import type { PublicReviewListItem } from "@/app/data/public-sites";
import { formatRatingScore, issueTypeLabels } from "@/app/data/sites";

type HomeRecentReviewsProps = {
  reviews: PublicReviewListItem[];
};

function formatDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

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
          className="text-sm font-bold text-accent transition hover:text-foreground"
        >
          전체 보기
        </Link>
      </div>

      {reviews.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-md bg-background p-4">
              <Link
                href={`/sites/${encodeURIComponent(review.site.slug)}/reviews`}
                className="text-sm font-bold text-foreground transition hover:text-accent"
              >
                {review.site.siteName}
              </Link>
              <p className="mt-1 text-sm font-semibold text-accent">
                {formatRatingScore(review.rating)} ·{" "}
                {issueTypeLabels[review.issueType]}
              </p>
              <h3 className="mt-2 text-sm font-bold text-foreground">
                {review.title}
              </h3>
              <p className="mt-2 text-xs text-muted">
                작성일 {formatDate(review.createdAt)} · 작성자{" "}
                {review.authorNickname ?? "익명"}
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
