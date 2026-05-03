"use client";

import Link from "next/link";
import { useAuth } from "@/app/components/auth-provider";
import type { SiteDetailIndexabilityResult } from "@/app/data/site-detail-indexability";

type AdminSiteDetailActionsProps = {
  siteId: string;
  siteSlug: string;
  indexability?: SiteDetailIndexabilityResult;
};

function formatRobotsLabel(robots: SiteDetailIndexabilityResult["robots"]) {
  return robots === "index,follow"
    ? "노출 허용 (링크 추적 허용)"
    : "노출 제외 (링크 추적 허용)";
}

function formatIndexabilityItem(value: string) {
  const [key, count] = value.split(":");
  const labels: Record<string, string> = {
    additional_domains: "추가 도메인",
    approved_reviews: "승인된 후기",
    approved_scam_reports: "승인된 피해 제보",
    description_300_chars: "300자 이상 설명",
    description_600_chars: "600자 이상 설명",
    domain_creation_date: "도메인 생성일",
    domains: "도메인",
    fallback_source: "임시 데이터 출처",
    insufficient_unique_public_data: "공개 고유 데이터 부족",
    observation_facts: "관측 항목",
    observation_facts_min_5: "관측 항목 5개 이상",
    observation_snapshot: "관측 스냅샷",
    public_supabase_source: "공개 Supabase 데이터",
    related_blog_report: "관련 블로그 리포트",
    screenshot: "스크린샷",
    site: "사이트 정보",
    site_missing: "사이트 정보 없음",
  };

  const label = labels[key] ?? key.replaceAll("_", " ");
  return count ? `${label} ${count}개` : label;
}

function formatIndexabilityItems(values: string[]) {
  return values.map(formatIndexabilityItem).join(", ");
}

function getVisibleIndexabilityReasons(indexability: SiteDetailIndexabilityResult) {
  return indexability.reasons.filter(
    (reason) =>
      ![
        "fallback_source",
        "insufficient_unique_public_data",
        "site_missing",
      ].includes(reason.split(":")[0]),
  );
}

export function AdminSiteDetailActions({
  siteId,
  siteSlug,
  indexability,
}: AdminSiteDetailActionsProps) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/blog?siteSlug=${encodeURIComponent(siteSlug)}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
        >
          AI 블로그 초안
        </Link>
        <Link
          href={`/admin/sites/${siteId}/edit`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
        >
          사이트 수정
        </Link>
      </div>
      {indexability ? (
        <div className="rounded-md border border-line bg-background px-3 py-2 text-xs leading-5 text-muted">
          <p className="font-bold text-foreground">
            검색 노출: {formatRobotsLabel(indexability.robots)} · 고유 데이터
            점수 {indexability.uniqueFactScore}점
          </p>
          {getVisibleIndexabilityReasons(indexability).length > 0 ? (
            <p className="mt-1">
              반영 항목:{" "}
              {formatIndexabilityItems(
                getVisibleIndexabilityReasons(indexability).slice(0, 6),
              )}
            </p>
          ) : null}
          {indexability.missing.length > 0 ? (
            <p className="mt-1">
              부족 항목: {formatIndexabilityItems(indexability.missing.slice(0, 5))}
            </p>
          ) : null}
          {!indexability.shouldIndex && indexability.reasons.length > 0 ? (
            <p className="mt-1">
              검색 제외 사유:{" "}
              {formatIndexabilityItems(indexability.reasons.slice(-3))}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
