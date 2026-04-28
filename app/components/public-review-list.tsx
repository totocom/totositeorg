"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReviewSummary } from "@/app/components/review-summary";
import type { PublicReviewListItem } from "@/app/data/public-sites";
import { issueTypeLabels } from "@/app/data/sites";

type ReviewSortOption = "latest" | "rating_high" | "rating_low" | "site_name";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

type PublicReviewListProps = {
  items: PublicReviewListItem[];
};

const ratingFilters: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "5", label: "매우 만족" },
  { value: "4", label: "만족" },
  { value: "3", label: "보통" },
  { value: "2", label: "불만족" },
  { value: "1", label: "매우 불만족" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function getTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function PublicReviewList({ items }: PublicReviewListProps) {
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortOption, setSortOption] = useState<ReviewSortOption>("latest");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter((review) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            review.site.siteName,
            review.site.siteNameKo ?? "",
            review.site.siteNameEn ?? "",
            review.site.siteUrl,
            ...review.site.domains,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        if (!matchesQuery) return false;
        if (ratingFilter === "all") return true;

        return review.rating === Number(ratingFilter);
      })
      .sort((first, second) => {
        if (sortOption === "rating_high") return second.rating - first.rating;
        if (sortOption === "rating_low") return first.rating - second.rating;
        if (sortOption === "site_name") {
          return first.site.siteName.localeCompare(second.site.siteName, "ko");
        }

        return getTime(second.createdAt) - getTime(first.createdAt);
      });
  }, [items, query, ratingFilter, sortOption]);

  const hasActiveFilters =
    query.trim() !== "" || ratingFilter !== "all" || sortOption !== "latest";

  function resetFilters() {
    setQuery("");
    setRatingFilter("all");
    setSortOption("latest");
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          검색
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-foreground"
            placeholder="사이트명 또는 도메인으로 검색"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-foreground">
          정렬
          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as ReviewSortOption)
            }
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-muted"
          >
            <option value="latest">최신순</option>
            <option value="rating_high">평점 높은순</option>
            <option value="rating_low">평점 낮은순</option>
            <option value="site_name">사이트명순</option>
          </select>
        </label>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="h-11 rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
        >
          초기화
        </button>
      </section>

      <section className="flex flex-wrap gap-2">
        {ratingFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setRatingFilter(filter.value)}
            className={
              ratingFilter === filter.value
                ? "rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
                : "rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
            }
          >
            {filter.label}
          </button>
        ))}
      </section>

      <p className="text-sm text-muted">
        전체 만족도 평가 {items.length}건 중 {filteredItems.length}건 표시
      </p>

      {filteredItems.length > 0 ? (
        <section className="grid gap-4">
          {filteredItems.map((review) => (
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
                    작성자 {review.authorNickname ?? "익명"} ·{" "}
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
          <h2 className="text-lg font-semibold">검색 결과가 없습니다</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            사이트명 또는 평가 제목을 다르게 입력해보세요.
          </p>
        </section>
      )}
    </div>
  );
}
