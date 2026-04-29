import Link from "next/link";
import {
  calculateSiteTrustScore,
  formatTrustScore,
  getTrustScoreTone,
  type ReviewTarget,
} from "@/app/data/sites";

type SiteCardProps = {
  site: ReviewTarget;
};

function getDomainAge(value: string): string {
  const createdAt = new Date(value);
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth();

  if (!Number.isFinite(monthDiff) || monthDiff < 0) return "";
  const years = Math.floor(monthDiff / 12);
  const months = monthDiff % 12;
  if (years <= 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

function formatDamageAmount(amount: number, unknownCount: number) {
  const formattedAmount = `${amount.toLocaleString("ko-KR")}원`;

  if (unknownCount > 0 && amount > 0) {
    return `${formattedAmount} + 미상 ${unknownCount}건`;
  }

  if (unknownCount > 0) {
    return `미상 ${unknownCount}건`;
  }

  return formattedAmount;
}

function getTrustToneClasses(score: number) {
  const tone = getTrustScoreTone(score);

  if (tone === "danger") {
    return "text-red-600 dark:text-red-400";
  }

  if (tone === "warning") {
    return "text-yellow-700 dark:text-yellow-300";
  }

  return "text-accent";
}

export function SiteCard({ site }: SiteCardProps) {
  const scamReportCount = site.scamReportCount ?? 0;
  const scamDamageAmount = site.scamDamageAmount ?? 0;
  const scamDamageAmountUnknownCount = site.scamDamageAmountUnknownCount ?? 0;
  const trustScore =
    site.trustScore ??
    calculateSiteTrustScore({
      averageRating: site.averageRating,
      reviewCount: site.reviewCount,
      scamReportCount,
      scamDamageAmount,
      scamDamageAmountUnknownCount,
      oldestDomainCreationDate: site.oldestDomainCreationDate,
    });
  const faviconAlt = `${site.siteName} 토토사이트 파비콘`;
  const fallbackInitial = site.siteName.trim().charAt(0) || "?";

  return (
    <Link
      href={`/sites/${site.slug}`}
      className="group block rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent/40 hover:neon-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-background">
          {site.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.faviconUrl}
              alt={faviconAlt}
              loading="lazy"
              decoding="async"
              className="h-8 w-8 object-contain"
            />
          ) : (
            <span className="text-lg font-bold text-accent">
              {fallbackInitial}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground group-hover:text-accent transition-colors">
            {site.siteName}
          </h2>
          <p className="mt-0.5 break-all text-xs text-muted">{site.siteUrl}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-sm font-black ${getTrustToneClasses(trustScore.total)}`}>
              신뢰 점수 {formatTrustScore(trustScore)}
            </span>
            <span className="text-xs text-muted">리뷰 {site.reviewCount}건</span>
            {site.oldestDomainCreationDate ? (
              <span className="text-xs text-muted">
                운영 이력 최소 <span className="font-bold text-accent">{getDomainAge(site.oldestDomainCreationDate)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {site.shortDescription ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
          {site.shortDescription}
        </p>
      ) : null}

      {scamReportCount > 0 ? (
        <div className="neon-scam mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/40">
          <span className="text-sm font-bold text-red-600 dark:text-red-400">⚠ 먹튀 {scamReportCount}건</span>
          <span className="text-xs text-red-500 dark:text-red-400/70">
            피해 금액 {formatDamageAmount(scamDamageAmount, scamDamageAmountUnknownCount)}
          </span>
        </div>
      ) : (
        <div className="neon-safe mt-3 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2">
          <span className="text-xs font-semibold text-accent">✓ 먹튀 신고 없음</span>
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-muted">
        {trustScore.summary}
      </p>
    </Link>
  );
}
