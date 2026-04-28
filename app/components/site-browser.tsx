"use client";

import { useMemo, useState } from "react";
import { SiteCard } from "@/app/components/site-card";
import type { ReviewTarget } from "@/app/data/sites";

type SortOption =
  | "latest"
  | "domain_age"
  | "rating"
  | "reviews"
  | "scam_amount"
  | "scam_count"
  | "name";

type SiteBrowserProps = {
  sites: ReviewTarget[];
};

const pageSize = 12;

function getDomainAgeTime(site: ReviewTarget) {
  if (!site.oldestDomainCreationDate) return Number.POSITIVE_INFINITY;

  const time = new Date(site.oldestDomainCreationDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function SiteBrowser({ sites }: SiteBrowserProps) {
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const nextSites = sites.filter((site) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          site.siteName,
          site.siteUrl,
          ...site.domains,
          site.category,
          site.shortDescription,
          site.licenseInfo,
          site.domainSearchText ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesQuery;
    });

    return nextSites.sort((first, second) => {
      if (sortOption === "domain_age") {
        return getDomainAgeTime(first) - getDomainAgeTime(second);
      }

      if (sortOption === "rating") {
        return second.averageRating - first.averageRating;
      }

      if (sortOption === "reviews") {
        return second.reviewCount - first.reviewCount;
      }

      if (sortOption === "scam_amount") {
        return (second.scamDamageAmount ?? 0) - (first.scamDamageAmount ?? 0);
      }

      if (sortOption === "scam_count") {
        return (second.scamReportCount ?? 0) - (first.scamReportCount ?? 0);
      }

      if (sortOption === "name") {
        return first.siteName.localeCompare(second.siteName, "ko");
      }

      return 0;
    });
  }, [query, sites, sortOption]);

  const visibleSites = filteredSites.slice(0, visibleCount);
  const hasMoreSites = visibleCount < filteredSites.length;
  const hasActiveFilters = query !== "";

  function resetFilters() {
    setQuery("");
    setVisibleCount(pageSize);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          검색
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(pageSize);
            }}
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-foreground"
            placeholder="사이트명, 도메인, IP, 네임서버, 등록자, 등록기관으로 검색"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-foreground">
          정렬
          <select
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as SortOption);
              setVisibleCount(pageSize);
            }}
            className="h-11 rounded-md border border-line bg-white px-3 text-sm text-muted"
          >
            <option value="latest">최신 등록순</option>
            <option value="domain_age">운영이력 오래된순</option>
            <option value="name">이름순</option>
            <option value="reviews">리뷰 많은순</option>
            <option value="rating">평점 높은순</option>
            <option value="scam_amount">먹튀 금액 높은순</option>
            <option value="scam_count">먹튀 건수 많은순</option>
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

      <p className="text-sm text-muted">
        승인된 사이트 {sites.length}개 중 {visibleSites.length}개 표시
        {filteredSites.length !== visibleSites.length
          ? ` / 검색 결과 ${filteredSites.length}개`
          : ""}
      </p>

      {filteredSites.length > 0 ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            {visibleSites.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </section>
          {hasMoreSites ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + pageSize, filteredSites.length),
                )
              }
              className="mx-auto h-11 rounded-md border border-line px-5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              더 보기
            </button>
          ) : null}
        </>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold">검색 결과가 없습니다</h2>
          <p className="mt-2 text-sm text-muted">
            다른 검색어 또는 카테고리로 다시 확인해보세요.
          </p>
        </section>
      )}
    </div>
  );
}
