import Link from "next/link";
import { formatDisplayDomain } from "@/app/data/domain-display";
import { formatTrustScore, type ReviewTarget } from "@/app/data/sites";

type HomePopularSitesProps = {
  sites: ReviewTarget[];
};

function getTrustScoreLabel(site: ReviewTarget) {
  return formatTrustScore(site.trustScore);
}

export function HomePopularSites({ sites }: HomePopularSitesProps) {
  if (sites.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            사이트 비교
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">
            공개 데이터가 많은 토토사이트
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            신뢰점수, 후기, 먹튀 제보, 도메인 이력을 함께 계산해 정렬한
            사이트입니다. 각 카드에서 상세 정보와 도메인 기록으로 바로 이동할
            수 있습니다.
          </p>
        </div>
        <Link
          href="/sites"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-background px-4 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
        >
          전체 사이트 보기
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sites.map((site) => (
          <article
            key={site.id}
            className="rounded-lg border border-line bg-surface p-4 shadow-sm"
          >
            <Link
              href={`/sites/${encodeURIComponent(site.slug)}`}
              className="block transition hover:text-accent"
            >
              <h3 className="break-keep text-lg font-bold text-foreground">
                {site.siteName}
              </h3>
            </Link>
            <p className="mt-2 break-all text-xs text-muted">
              대표 주소: {formatDisplayDomain(site.siteUrl)}
            </p>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-background p-2">
                <dt className="text-xs text-muted">신뢰점수</dt>
                <dd className="mt-1 text-sm font-black text-accent">
                  {getTrustScoreLabel(site)}
                </dd>
              </div>
              <div className="rounded-md bg-background p-2">
                <dt className="text-xs text-muted">후기</dt>
                <dd className="mt-1 text-sm font-black text-foreground">
                  {site.reviewCount}건
                </dd>
              </div>
              <div className="rounded-md bg-background p-2">
                <dt className="text-xs text-muted">제보</dt>
                <dd className="mt-1 text-sm font-black text-foreground">
                  {site.scamReportCount ?? 0}건
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/sites/${encodeURIComponent(site.slug)}`}
                className="rounded-md border border-line bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
              >
                종합
              </Link>
              <Link
                href={`/sites/${encodeURIComponent(site.slug)}/domains`}
                className="rounded-md border border-line bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
              >
                도메인
              </Link>
              {site.reviewCount > 0 ? (
                <Link
                  href={`/sites/${encodeURIComponent(site.slug)}/reviews`}
                  className="rounded-md border border-line bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
                >
                  후기
                </Link>
              ) : null}
              {(site.scamReportCount ?? 0) > 0 ? (
                <Link
                  href={`/sites/${encodeURIComponent(site.slug)}/scam-reports`}
                  className="rounded-md border border-line bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
                >
                  제보
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
