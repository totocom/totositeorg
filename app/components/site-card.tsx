import Link from "next/link";
import type { ReviewTarget } from "@/app/data/sites";

type SiteCardProps = {
  site: ReviewTarget;
};

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

export function SiteCard({ site }: SiteCardProps) {
  const scamReportCount = site.scamReportCount ?? 0;
  const scamDamageAmount = site.scamDamageAmount ?? 0;
  const scamDamageAmountUnknownCount = site.scamDamageAmountUnknownCount ?? 0;

  return (
    <Link
      href={`/sites/${site.slug}`}
      className="block rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {site.screenshotUrl ? (
        <div className="mb-4 overflow-hidden rounded-md border border-line bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={site.screenshotUrl}
            alt={`${site.siteName} 페이지 캡처`}
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {site.siteName}
          </h2>
          <p className="mt-1 break-all text-sm text-muted">{site.siteUrl}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="min-w-20 rounded-md bg-accent-soft px-3 py-2 text-center">
            <p className="text-sm font-bold text-accent">
              리뷰 {site.reviewCount}건
            </p>
            <p className="mt-0.5 text-xs text-accent">
              평점{" "}
              <span className="font-bold">
                {site.averageRating.toFixed(1)}
              </span>
            </p>
          </div>
          <div className="min-w-24 rounded-md bg-red-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-red-700">
              먹튀 {scamReportCount}건
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              금액{" "}
              {formatDamageAmount(
                scamDamageAmount,
                scamDamageAmountUnknownCount,
              )}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
        {site.shortDescription}
      </p>
    </Link>
  );
}
