"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ScamReportDetails } from "@/app/components/scam-report-details";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import type { PublicScamReportListItem } from "@/app/data/public-sites";

type ScamReportSortOption =
  | "latest"
  | "incident_latest"
  | "damage_high"
  | "site_name";
type DamageTypeFilter =
  | "all"
  | "출금 거부"
  | "출금 지연"
  | "계정 차단"
  | "고객센터 차단"
  | "보너스 규정 악용"
  | "입금 후 미반영"
  | "기타";

type PublicScamReportListProps = {
  items: PublicScamReportListItem[];
};

const damageTypeFilters: { value: DamageTypeFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "출금 거부", label: "출금 거부" },
  { value: "출금 지연", label: "출금 지연" },
  { value: "계정 차단", label: "계정 차단" },
  { value: "고객센터 차단", label: "고객센터 차단" },
  { value: "보너스 규정 악용", label: "보너스 규정 악용" },
  { value: "입금 후 미반영", label: "입금 후 미반영" },
  { value: "기타", label: "기타" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function formatDamageAmount(amount: number | null, isUnknown: boolean) {
  if (isUnknown || amount === null) return "피해 금액 미확인";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function getTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getDamageAmount(report: PublicScamReportListItem) {
  return Number(report.damageAmount ?? 0);
}

export function PublicScamReportList({ items }: PublicScamReportListProps) {
  const [query, setQuery] = useState("");
  const [damageTypeFilter, setDamageTypeFilter] =
    useState<DamageTypeFilter>("all");
  const [sortOption, setSortOption] =
    useState<ScamReportSortOption>("latest");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter((report) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            report.site.siteName,
            report.site.siteNameKo ?? "",
            report.site.siteNameEn ?? "",
            report.site.siteUrl,
            formatDisplayUrl(report.site.siteUrl),
            ...report.site.domains,
            ...report.site.domains.map(formatDisplayDomain),
            report.authorNickname ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        if (!matchesQuery) return false;
        if (damageTypeFilter === "all") return true;

        return report.damageTypes.includes(damageTypeFilter);
      })
      .sort((first, second) => {
        if (sortOption === "incident_latest") {
          return getTime(second.incidentDate) - getTime(first.incidentDate);
        }

        if (sortOption === "damage_high") {
          return getDamageAmount(second) - getDamageAmount(first);
        }

        if (sortOption === "site_name") {
          return first.site.siteName.localeCompare(second.site.siteName, "ko");
        }

        return getTime(second.createdAt) - getTime(first.createdAt);
      });
  }, [damageTypeFilter, items, query, sortOption]);

  const hasActiveFilters =
    query.trim() !== "" ||
    damageTypeFilter !== "all" ||
    sortOption !== "latest";

  function resetFilters() {
    setQuery("");
    setDamageTypeFilter("all");
    setSortOption("latest");
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-semibold text-foreground">
          검색
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-foreground transition focus:border-accent focus:outline-none"
            placeholder="사이트명, 도메인, 작성자 닉네임으로 검색"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-foreground">
          정렬
          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as ScamReportSortOption)
            }
            className="h-11 rounded-lg border border-line bg-background px-3 text-sm text-foreground transition focus:border-accent focus:outline-none"
          >
            <option value="latest">접수 최신순</option>
            <option value="incident_latest">발생일 최신순</option>
            <option value="damage_high">피해 금액 높은순</option>
            <option value="site_name">사이트명순</option>
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

      <section className="flex flex-wrap gap-2">
        {damageTypeFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setDamageTypeFilter(filter.value)}
            className={
              damageTypeFilter === filter.value
                ? "rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
                : "rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
            }
          >
            {filter.label}
          </button>
        ))}
      </section>

      <p className="text-sm text-muted">
        전체 먹튀 피해 제보 {items.length}건 중 {filteredItems.length}건 표시
      </p>

      {filteredItems.length > 0 ? (
        <section className="grid gap-4">
          {filteredItems.map((report) => (
            <article
              key={report.id}
              className="rounded-lg border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/sites/${report.site.slug}#reports`}
                    className="text-sm font-semibold text-accent transition hover:text-foreground"
                  >
                    {report.site.siteName}
                  </Link>
                  <h2 className="mt-1 text-xl font-bold text-foreground">
                    {report.damageTypes.join(", ") || report.mainCategory}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    발생일 {formatDate(report.incidentDate)} · 접수일{" "}
                    {formatDate(report.createdAt)} · 작성자{" "}
                    {report.authorNickname ?? "익명"}
                  </p>
                </div>
                <p className="w-fit rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  {formatDamageAmount(
                    report.damageAmount,
                    report.damageAmountUnknown,
                  )}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  이용 기간 {report.usagePeriod}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  {report.mainCategory}
                </span>
                {report.categoryItems.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <ScamReportDetails report={report} siteName={report.site.siteName} />
              <div className="mt-4">
                <Link
                  href={`/sites/${report.site.slug}#reports`}
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
            사이트명 또는 피해 유형을 다르게 입력해보세요.
          </p>
        </section>
      )}
    </div>
  );
}
