"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import type { ReviewTarget } from "@/app/data/sites";

type DomainSortOption = "domain_age" | "domain_count" | "site_name" | "reviews";

type PublicDomainListProps = {
  sites: ReviewTarget[];
};

const pageSize = 12;

function getDomains(site: ReviewTarget) {
  return Array.from(new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]))
    .filter(Boolean);
}

function getOldestDomainTime(site: ReviewTarget) {
  if (!site.oldestDomainCreationDate) return Number.POSITIVE_INFINITY;

  const time = new Date(site.oldestDomainCreationDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function formatDomainAge(value: string | undefined) {
  if (!value) return "확인 불가";

  const createdAt = new Date(value);
  const now = new Date();

  if (!Number.isFinite(createdAt.getTime()) || createdAt > now) {
    return "확인 불가";
  }

  const monthDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth();
  const years = Math.floor(monthDiff / 12);
  const months = monthDiff % 12;

  if (years <= 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

function formatDate(value: string | undefined) {
  if (!value) return "확인 불가";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "확인 불가";

  return date.toLocaleDateString("ko-KR");
}

export function PublicDomainList({ sites }: PublicDomainListProps) {
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] =
    useState<DomainSortOption>("domain_age");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sites
      .filter((site) => {
        if (!normalizedQuery) return true;

        return [
          site.siteName,
          site.siteNameKo ?? "",
          site.siteNameEn ?? "",
          site.siteUrl,
          formatDisplayUrl(site.siteUrl),
          ...getDomains(site),
          ...getDomains(site).map(formatDisplayDomain),
          ...(site.resolvedIps ?? []),
          site.domainSearchText ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((first, second) => {
        if (sortOption === "domain_count") {
          return getDomains(second).length - getDomains(first).length;
        }

        if (sortOption === "site_name") {
          return first.siteName.localeCompare(second.siteName, "ko");
        }

        if (sortOption === "reviews") {
          return second.reviewCount - first.reviewCount;
        }

        return getOldestDomainTime(first) - getOldestDomainTime(second);
      });
  }, [query, sites, sortOption]);

  const visibleSites = filteredSites.slice(0, visibleCount);
  const hasMoreSites = visibleCount < filteredSites.length;
  const hasActiveFilters = query.trim() !== "" || sortOption !== "domain_age";

  function resetFilters() {
    setQuery("");
    setSortOption("domain_age");
    setVisibleCount(pageSize);
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold text-foreground">
          도메인 검색
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(pageSize);
            }}
            className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-foreground transition focus:border-accent focus:outline-none"
            placeholder="사이트명, 도메인, IP로 검색"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-foreground">
          정렬 기준
          <select
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as DomainSortOption);
              setVisibleCount(pageSize);
            }}
            className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-foreground transition focus:border-accent focus:outline-none"
          >
            <option value="domain_age">운영 이력 오래된순</option>
            <option value="domain_count">도메인 많은순</option>
            <option value="site_name">사이트명순</option>
            <option value="reviews">후기 많은순</option>
          </select>
        </label>
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="h-11 rounded-lg border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          초기화
        </button>
      </section>

      <p className="text-sm text-muted">
        승인된 사이트 도메인 정보{" "}
        <span className="font-semibold text-foreground">{sites.length}개</span> 중{" "}
        <span className="font-semibold text-foreground">{visibleSites.length}개</span> 표시
        {filteredSites.length !== visibleSites.length
          ? ` / 검색 결과 ${filteredSites.length}개`
          : ""}
      </p>

      {filteredSites.length > 0 ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            {visibleSites.map((site) => {
              const domains = getDomains(site);
              const representativeDomain = domains[0] ?? site.siteUrl;
              const additionalDomainCount = Math.max(0, domains.length - 1);

              return (
                <article
                  key={site.id}
                  className="rounded-lg border border-line bg-surface p-5 shadow-sm transition hover:border-accent/30"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/sites/${encodeURIComponent(site.slug)}/domains`}
                        className="text-base font-bold text-foreground transition hover:text-accent"
                      >
                        {site.siteName}
                      </Link>
                      <p className="mt-2 break-all text-sm leading-6 text-muted">
                        대표 도메인 {formatDisplayDomain(representativeDomain)}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-background px-3 py-1 text-xs font-semibold text-muted">
                      도메인 {domains.length}개
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-background p-3">
                      <dt className="text-xs font-semibold text-muted">
                        운영 이력
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">
                        {formatDomainAge(site.oldestDomainCreationDate)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-background p-3">
                      <dt className="text-xs font-semibold text-muted">
                        최초 등록일
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">
                        {formatDate(site.oldestDomainCreationDate)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {domains.slice(0, 4).map((domain) => (
                      <span
                        key={domain}
                        className="max-w-full break-all rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted"
                      >
                        {formatDisplayDomain(domain)}
                      </span>
                    ))}
                    {additionalDomainCount > 3 ? (
                      <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                        +{additionalDomainCount - 3}개
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/sites/${encodeURIComponent(site.slug)}/domains`}
                      className="text-sm font-semibold text-accent transition hover:text-accent/80"
                    >
                      주소·도메인 보기
                    </Link>
                    <Link
                      href={`/sites/${encodeURIComponent(site.slug)}`}
                      className="text-sm font-semibold text-muted transition hover:text-foreground"
                    >
                      사이트 상세 리뷰
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>

          {hasMoreSites ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) =>
                  Math.min(current + pageSize, filteredSites.length),
                )
              }
              className="mx-auto h-11 rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              더 보기 ({filteredSites.length - visibleCount}개 남음)
            </button>
          ) : null}
        </>
      ) : (
        <section className="rounded-xl border border-line bg-surface p-10 text-center">
          <h2 className="text-lg font-bold">검색 결과가 없습니다</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            사이트명이나 도메인을 다르게 입력해보세요.
          </p>
        </section>
      )}
    </div>
  );
}
