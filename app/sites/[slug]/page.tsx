import type { Metadata } from "next";
import Link from "next/link";
import { domainToUnicode } from "node:url";
import { AdminSiteDetailActions } from "@/app/components/admin-site-detail-actions";
import { DomainInfoTabs } from "@/app/components/domain-info-tabs";
import { ReviewSummary, getReviewSeoSummary } from "@/app/components/review-summary";
import { getPublicWhoisInfo } from "@/app/data/domain-whois";
import { getPublicSiteDetail, getPublicSites } from "@/app/data/public-sites";
import type { ReviewTarget } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

type SiteDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type SameIpSite = {
  site: ReviewTarget;
  matchedDomains: string[];
  matchedIps: string[];
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

function formatDisplayDomain(value: string) {
  if (!value) return "";

  try {
    const parsedUrl = new URL(value);
    return domainToUnicode(parsedUrl.hostname) || parsedUrl.hostname;
  } catch {
    return domainToUnicode(value) || value;
  }
}

function formatDisplayUrl(value: string) {
  if (!value) return "";

  try {
    const parsedUrl = new URL(value);
    const hostname = domainToUnicode(parsedUrl.hostname) || parsedUrl.hostname;
    return `${parsedUrl.protocol}//${hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ""}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return domainToUnicode(value) || value;
  }
}

function getDomainAge(value: string) {
  if (!value) return "확인 불가";

  const createdAt = new Date(value);
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth();

  if (!Number.isFinite(monthDiff) || monthDiff < 0) return "확인 불가";

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

function getUniqueSiteDomains(site: ReviewTarget) {
  return Array.from(
    new Set((site.domains.length > 0 ? site.domains : [site.siteUrl]).filter(Boolean)),
  );
}

async function getSameIpSites(site: ReviewTarget, currentIps: Set<string>) {
  if (currentIps.size === 0) {
    return [];
  }

  const { sites } = await getPublicSites();
  const candidates = sites
    .filter((candidate) => candidate.id !== site.id)
    .slice(0, 80);

  const matches = await Promise.all(
    candidates.map(async (candidate): Promise<SameIpSite | null> => {
      const candidateIps = candidate.resolvedIps ?? [];
      const matchedIps = candidateIps.filter((ip) => currentIps.has(ip)).sort();

      if (matchedIps.length === 0) {
        return null;
      }

      return {
        site: candidate,
        matchedDomains: getUniqueSiteDomains(candidate).slice(0, 1),
        matchedIps,
      };
    }),
  );

  return matches.filter((match): match is SameIpSite => Boolean(match)).slice(0, 8);
}

export async function generateMetadata({
  params,
}: SiteDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { site } = await getPublicSiteDetail(slug.trim());

  if (!site) {
    return { title: "사이트를 찾을 수 없습니다" };
  }

  const title = `${site.siteName} 토토사이트 리뷰`;
  const description = `${site.siteName} 실제 이용 후기 ${site.reviewCount}건. 평균 평점 ${site.averageRating.toFixed(1)}점. ${site.shortDescription}`;
  const pageUrl = `${siteUrl}/sites/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      url: pageUrl,
      title,
      description,
    },
  };
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  console.log("[site-detail] route params", {
    rawSlug,
    slug,
    type: typeof slug,
  });

  const { site, reviews, scamReports, dnsRecords, errorMessage, source } =
    await getPublicSiteDetail(slug);

  if (!site) {
    console.log("[site-detail] no public site rendered", {
      slug,
      errorMessage,
      source,
    });

    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/sites" className="text-sm font-semibold text-accent">
          사이트 목록으로 돌아가기
        </Link>

        <section className="mt-5 rounded-lg border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            사이트 상세
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            사이트 정보를 찾을 수 없습니다
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            요청한 공개 주소와 일치하는 승인된 사이트가 없습니다. Supabase의
            slug, status, RLS 정책을 확인해주세요.
          </p>
          {errorMessage ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "WebSite",
      name: site.siteName,
      url: site.siteUrl,
    },
    reviewRating: {
      "@type": "AggregateRating",
      ratingValue: site.averageRating.toFixed(1),
      reviewCount: site.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    name: `${site.siteName} 토토사이트 리뷰`,
    description:
      reviews[0] ? getReviewSeoSummary(site.siteName, reviews[0].experience) : site.shortDescription,
  };
  const domainTargets = Array.from(
    new Set((site.domains.length > 0 ? site.domains : [site.siteUrl]).filter(Boolean)),
  ).slice(0, 6);
  const dnsRecordMap = new Map(
    dnsRecords.map((record) => [record.domainUrl, record.dnsInfo]),
  );
  const domainInfos = await Promise.all(
    domainTargets.map(async (domainUrl) => {
      const whoisInfo = await getPublicWhoisInfo(domainUrl);

      return {
        domainUrl,
        whoisInfo,
        dnsInfo: dnsRecordMap.get(domainUrl) ?? null,
      };
    }),
  );
  const domainInfoTabs = domainInfos.map(({ domainUrl, whoisInfo, dnsInfo }) => ({
    domainUrl,
    displayDomain: formatDisplayDomain(
      whoisInfo?.domain || dnsInfo?.domain || domainUrl,
    ),
    domainAge: whoisInfo ? getDomainAge(whoisInfo.creationDate) : "확인 불가",
    whoisInfo,
    dnsInfo,
  }));
  const currentIps = new Set(site.resolvedIps ?? []);
  const sameIpSites = await getSameIpSites(site, currentIps);
  const scamReportCount = scamReports.length;
  const scamDamageAmount = scamReports.reduce(
    (total, report) => total + Number(report.damageAmount ?? 0),
    0,
  );
  const scamDamageAmountUnknownCount = scamReports.filter(
    (report) => report.damageAmountUnknown,
  ).length;

  return (
    <>
      {site.reviewCount > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/sites" className="text-sm font-semibold text-accent">
          사이트 목록으로 돌아가기
        </Link>

        <article className="mt-5 rounded-lg border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-accent">
                등록 검토 완료
              </p>
              <h1 className="mt-2 text-3xl font-bold">{site.siteName}</h1>
              <p className="mt-2 text-xs font-semibold uppercase text-muted">
                대표 URL
              </p>
              <p className="mt-1 break-all text-sm text-muted">
                {formatDisplayUrl(site.siteUrl)}
              </p>
              {site.domains.length > 1 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-muted">
                    등록 도메인
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {site.domains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted"
                      >
                        {formatDisplayUrl(domain)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <AdminSiteDetailActions siteId={site.id} />
              <div className="flex gap-2">
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
          </div>

          <div className="mt-6 rounded-md bg-background p-4">
            <h2 className="text-sm font-semibold uppercase text-muted">
              사이트 개요
            </h2>
            <p className="mt-2 leading-7 text-foreground">
              {site.shortDescription}
            </p>
          </div>

        </article>

        {site.screenshotUrl ? (
          <section className="mt-6 overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <p className="text-sm font-semibold uppercase text-accent">
                페이지 캡처
              </p>
              <h2 className="mt-1 text-xl font-bold">사이트 화면 미리보기</h2>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.screenshotUrl}
              alt={`${site.siteName} 토토사이트 상세 메인 페이지`}
              className="aspect-video w-full bg-background object-cover"
            />
          </section>
        ) : null}

        <DomainInfoTabs items={domainInfoTabs} />

        {sameIpSites.length > 0 ? (
          <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase text-accent">
                동일 IP 연결
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                같은 IP를 사용하는 사이트
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                현재 사이트의 DNS A/AAAA 레코드와 겹치는 공개 사이트만 간추려
                표시합니다.
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              {sameIpSites.map((match) => (
                <Link
                  key={match.site.id}
                  href={`/sites/${match.site.slug}`}
                  className="rounded-md border border-line bg-background p-4 transition hover:border-accent"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-foreground">
                        {match.site.siteName}
                      </p>
                      <p className="mt-1 break-all text-sm text-muted">
                        {formatDisplayUrl(match.matchedDomains[0] ?? match.site.siteUrl)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {match.matchedIps.map((ip) => (
                        <span
                          key={ip}
                          className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent"
                        >
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-accent">
                먹튀 피해 이력
              </p>
              <h2 className="mt-1 text-2xl font-bold">승인된 피해 제보</h2>
            </div>
            <Link
              href={`/submit-scam-report?siteId=${site.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
            >
              먹튀 제보하기
            </Link>
          </div>
          {scamReports.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {scamReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-md border border-line bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {report.damageTypes.join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        발생일 {report.incidentDate} · 이용 기간 {report.usagePeriod}
                      </p>
                    </div>
                    <p className="rounded-md bg-surface px-3 py-1 text-sm font-semibold">
                      {report.damageAmountUnknown || report.damageAmount === null
                        ? "피해 금액 미확인"
                        : `${report.damageAmount.toLocaleString("ko-KR")}원`}
                    </p>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                    {report.situationDescription}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md bg-background p-4 text-sm text-muted">
              승인되어 공개된 먹튀 피해 이력이 아직 없습니다.
            </p>
          )}
        </section>

        {errorMessage ? (
          <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {source === "fallback" ? (
          <p className="mt-6 text-sm text-muted">
            현재 개발용 더미 데이터가 표시되고 있습니다.
          </p>
        ) : null}

        <section className="mt-6 grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-accent">
                커뮤니티 리뷰
              </p>
              <h2 className="mt-1 text-2xl font-bold">최근 이용 경험</h2>
            </div>
            <Link
              href={`/submit-review?siteId=${site.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
            >
              만족도 평가
            </Link>
          </div>

          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-lg border border-line bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-accent">
                      이용자 만족도 평가
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {review.title}
                    </h3>
                  </div>
                  <p className="rounded-md bg-background px-3 py-1 text-sm font-semibold">
                    {review.rating}/5
                  </p>
                </div>
                <ReviewSummary siteName={site.siteName} experience={review.experience} />
                <p className="mt-3 text-xs text-muted">{review.createdAt}</p>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-line bg-surface p-6 text-center">
              <h3 className="font-semibold">아직 승인된 리뷰가 없습니다</h3>
              <p className="mt-2 text-sm text-muted">
                이 사이트에 대한 이용 경험은 관리자 검토 후 공개됩니다.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
