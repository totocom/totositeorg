import { formatDisplayDomain } from "@/app/data/domain-display";
import type { SiteCommonHeaderResult } from "@/app/data/public-site-detail";
import { getSiteDisplayName } from "@/app/data/site-name-format";
import { formatTrustScore } from "@/app/data/sites";
import {
  SiteDetailTabs,
  type SiteDetailTab,
} from "@/app/components/site-detail/site-detail-tabs";

type SiteHeaderCommonProps = {
  common: SiteCommonHeaderResult;
  activeTab: SiteDetailTab;
  splitEnabled: boolean;
};

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-background px-3 py-2">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function getHeading(
  activeTab: SiteDetailTab,
  site: NonNullable<SiteCommonHeaderResult["site"]>,
) {
  const displayName = getSiteDisplayName(site);
  const keywordName = getSiteKeywordName(displayName);

  if (activeTab === "scam-reports") {
    return `${displayName} 먹튀 제보 및 피해 사례`;
  }
  if (activeTab === "reviews") {
    return `${keywordName} 후기 및 이용자 만족도 평가`;
  }
  if (activeTab === "domains") {
    return `${displayName} 주소·도메인 정보 및 변경 이력`;
  }
  return keywordName;
}

function getSiteKeywordName(siteName: string) {
  const normalizedSiteName = siteName.replace(/\s+/g, " ").trim();

  if (!normalizedSiteName) return "토토사이트";
  if (normalizedSiteName.includes("토토사이트")) return normalizedSiteName;

  return `${normalizedSiteName} 토토사이트`;
}

export function SiteHeaderCommon({
  common,
  activeTab,
  splitEnabled,
}: SiteHeaderCommonProps) {
  const site = common.site;

  if (!site) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase text-accent">사이트 상세</p>
        <h1 className="mt-2 text-2xl font-bold">사이트 정보를 찾을 수 없습니다</h1>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase text-accent">사이트 상세</p>
      <h1 className="mt-2 break-keep text-2xl font-bold text-foreground sm:text-3xl">
        {getHeading(activeTab, site)}
      </h1>
      <p className="mt-2 break-all text-sm text-muted">
        <span className="font-semibold text-foreground">대표 도메인: </span>
        {formatDisplayDomain(site.siteUrl)}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <HeaderMetric label="신뢰점수" value={formatTrustScore(common.trustScore ?? undefined)} />
        <HeaderMetric label="먹튀 제보" value={`${common.tabCounts.scamReports}건`} />
        <HeaderMetric label="후기" value={`${common.tabCounts.reviews}건`} />
        <HeaderMetric label="도메인" value={`${common.tabCounts.domains}개`} />
      </div>

      {splitEnabled ? (
        <SiteDetailTabs
          slug={site.slug}
          siteName={site.siteNameKo?.trim() || site.siteName}
          activeTab={activeTab}
          counts={common.tabCounts}
        />
      ) : null}
    </section>
  );
}
