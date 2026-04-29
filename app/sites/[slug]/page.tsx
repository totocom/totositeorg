import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { domainToUnicode } from "node:url";
import { AdminSiteDetailActions } from "@/app/components/admin-site-detail-actions";
import { DomainInfoTabs } from "@/app/components/domain-info-tabs";
import { ReviewSummary, getReviewSeoSummary } from "@/app/components/review-summary";
import { ScamReportDetails } from "@/app/components/scam-report-details";
import { SiteAuthorActions } from "@/app/components/site-author-actions";
import { SiteTelegramAlertSubscription } from "@/app/components/site-telegram-alert-subscription";
import { getPublicWhoisInfo } from "@/app/data/domain-whois";
import { getPublicSiteDetail, getPublicSites } from "@/app/data/public-sites";
import {
  calculateSiteTrustScore,
  formatRatingScore,
  formatTrustScore,
  getTrustScoreTone,
  type ReviewTarget,
} from "@/app/data/sites";

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(Math.max(1, Math.min(5, rating)));
  return (
    <span aria-label={`${filled}점`} className="text-xl leading-none">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? "text-accent" : "text-line"}>★</span>
      ))}
    </span>
  );
}
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

function getTrustToneClasses(tone: string) {
  if (tone === "danger") {
    return {
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-900",
      background: "bg-red-50 dark:bg-red-950/40",
      bar: "bg-red-500",
      neon: "neon-danger",
    };
  }

  if (tone === "warning") {
    return {
      text: "text-yellow-700 dark:text-yellow-300",
      border: "border-yellow-200 dark:border-yellow-900",
      background: "bg-yellow-50 dark:bg-yellow-950/40",
      bar: "bg-yellow-500",
      neon: "neon-warning",
    };
  }

  return {
    text: "text-accent",
    border: "border-accent/20",
    background: "bg-accent-soft",
    bar: "bg-accent",
    neon: "neon-safe",
  };
}

function TrustScoreMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const percentage = Math.max(0, Math.min(100, value));
  const toneClasses = getTrustToneClasses(getTrustScoreTone(value));

  return (
    <div className="rounded-lg border border-line bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className={`text-sm font-black ${toneClasses.text}`}>
          {value}/100
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`${toneClasses.neon} h-full rounded-full ${toneClasses.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
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
  const description = `${site.siteName} 신뢰 점수 ${formatTrustScore(site.trustScore)}. 먹튀 리스크, 도메인 운영 이력, 이용자 경험을 종합해 확인하세요. ${site.shortDescription}`;
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
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
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
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
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
      ratingValue: Math.round(site.averageRating * 20),
      reviewCount: site.reviewCount,
      bestRating: 100,
      worstRating: 20,
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
  const oldestDomainCreationDate = domainInfos
    .map(({ whoisInfo }) => whoisInfo?.creationDate)
    .filter((date): date is string =>
      typeof date === "string" && Number.isFinite(new Date(date).getTime()),
    )
    .reduce<string | null>(
      (oldest, date) => (oldest === null || date < oldest ? date : oldest),
      null,
    );
  const domainInfoTabs = domainInfos.map(({ domainUrl, whoisInfo, dnsInfo }) => ({
    siteId: site.id,
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
  const trustScore = calculateSiteTrustScore({
    averageRating: site.averageRating,
    reviewCount: site.reviewCount,
    scamReportCount,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
    oldestDomainCreationDate: oldestDomainCreationDate ?? undefined,
  });
  const trustToneClasses = getTrustToneClasses(getTrustScoreTone(trustScore.total));
  const screenshotPreviewUrl = site.screenshotThumbUrl || site.screenshotUrl;
  const logoAlt = `${site.siteName} 토토사이트 로고`;

  return (
    <>
      {site.reviewCount > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* 브레드크럼 */}
        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-foreground transition">홈</Link>
          <span>/</span>
          <Link href="/sites" className="hover:text-foreground transition">사이트 목록</Link>
          <span>/</span>
          <span className="text-foreground">{site.siteName}</span>
        </nav>

        {/* 메인 정보 카드 */}
        <article className="mt-4 rounded-xl border border-line bg-surface shadow-sm">
          {/* 상단: 로고 + 이름 + 뱃지 */}
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
            {/* 왼쪽 */}
            <div className="w-full min-w-0 flex-1">
              <div className="flex w-full min-w-0 items-start gap-4">
                {site.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={site.faviconUrl}
                    alt={logoAlt}
                    className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-contain p-1.5 dark:bg-surface"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-background text-xl font-bold text-accent">
                    {site.siteName.trim().charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs text-muted">
                    {oldestDomainCreationDate ? (
                      <>
                        운영 이력 최소{" "}
                        <span className="font-bold text-accent">
                          {getDomainAge(oldestDomainCreationDate)}
                        </span>
                      </>
                    ) : (
                      "운영 이력 확인 불가"
                    )}
                  </p>
                  <h1 className="mt-1.5 break-keep text-2xl font-bold sm:text-3xl">
                    {site.siteName}
                  </h1>
                  <p className="mt-1 break-all text-sm text-muted">
                    {formatDisplayUrl(site.siteUrl)}
                  </p>
                </div>
              </div>
            </div>

            {/* 오른쪽: 평점 + 먹튀 */}
            <div className="flex shrink-0 flex-row gap-3">
              <div className={`${trustToneClasses.neon} flex-1 rounded-xl border px-4 py-3 text-center sm:flex-none ${trustToneClasses.border} ${trustToneClasses.background}`}>
                <p className={`text-xs font-semibold ${trustToneClasses.text}`}>신뢰 점수</p>
                <p className={`mt-1 text-xl font-black ${trustToneClasses.text}`}>
                  {formatTrustScore(trustScore)}
                </p>
              </div>
              {scamReportCount > 0 ? (
                <div className="neon-scam flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-900 dark:bg-red-950/40 sm:flex-none">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">⚠ 먹튀 {scamReportCount}건</p>
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/70">
                    {formatDamageAmount(scamDamageAmount, scamDamageAmountUnknownCount)}
                  </p>
                </div>
              ) : (
                <div className="neon-safe flex-1 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-center sm:flex-none">
                  <p className="text-sm font-bold text-accent">✓ 먹튀 없음</p>
                  <p className="mt-0.5 text-xs text-accent/70">신고 이력 없음</p>
                </div>
              )}
              <AdminSiteDetailActions siteId={site.id} />
            </div>
          </div>

          {/* 등록 도메인 */}
          {site.domains.length > 1 ? (
            <div className="border-t border-line px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                등록 도메인
              </p>
              <div className="mt-2 flex w-full flex-wrap items-center gap-2">
                {site.domains.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted"
                  >
                    {formatDisplayUrl(domain)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-line px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              신뢰 점수 산정
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <TrustScoreMetric
                label="먹튀 리스크"
                value={trustScore.scamRisk}
              />
              <TrustScoreMetric
                label="도메인 운영 이력"
                value={trustScore.domainAge}
              />
              <TrustScoreMetric
                label="이용자 경험"
                value={trustScore.userExperience}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              {trustScore.summary}
            </p>
          </div>

          {/* 사이트 개요 */}
          {site.shortDescription ? (
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">사이트 개요</p>
              <p className="mt-2 text-sm leading-7 text-foreground">{site.shortDescription}</p>
            </div>
          ) : null}

        </article>

        <SiteTelegramAlertSubscription siteId={site.id} siteName={site.siteName} />

        {/* 스크린샷 */}
        {site.screenshotUrl && screenshotPreviewUrl ? (
          <section className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">페이지 캡처</p>
              <h2 className="mt-1 text-base font-bold">사이트 화면 미리보기</h2>
            </div>
            <Link
              href={site.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              aria-label={`${site.siteName} 원본 캡처 이미지 보기`}
            >
              <div className="px-6 py-4 bg-background">
                <div className="relative aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-lg">
                <Image
                  src={screenshotPreviewUrl}
                  alt={`${site.siteName} 토토사이트 상세 메인 페이지`}
                  fill
                  sizes="(min-width: 1024px) 768px, (min-width: 640px) calc(100vw - 96px), calc(100vw - 48px)"
                  className="object-cover transition duration-200 group-hover:scale-[1.01]"
                />
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        {/* 도메인 & DNS */}
        <DomainInfoTabs items={domainInfoTabs} />

        {/* 동일 IP 사이트 */}
        {sameIpSites.length > 0 ? (
          <section className="mt-5 rounded-xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">동일 IP 연결</p>
              <h2 className="mt-1 text-base font-bold">같은 IP를 사용하는 사이트</h2>
              <p className="mt-1 text-xs text-muted">
                현재 사이트의 DNS A/AAAA 레코드와 겹치는 공개 사이트만 표시합니다.
              </p>
            </div>
            <div className="grid gap-2 p-4">
              {sameIpSites.map((match) => (
                <Link
                  key={match.site.id}
                  href={`/sites/${match.site.slug}`}
                  className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/50"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{match.site.siteName}</p>
                      <p className="mt-0.5 break-all text-xs text-muted">
                        {formatDisplayUrl(match.matchedDomains[0] ?? match.site.siteUrl)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {match.matchedIps.map((ip) => (
                        <span
                          key={ip}
                          className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent"
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

        {/* 먹튀 피해 이력 */}
        <section id="scam-reports" className="mt-5 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">먹튀 피해 이력</p>
              <h2 className="mt-1 text-base font-bold">승인된 피해 제보</h2>
            </div>
            <SiteAuthorActions siteId={site.id} kind="scam-report" />
          </div>
          {scamReports.length > 0 ? (
            <div className="grid gap-3 p-4">
              {scamReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-lg border border-line bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {report.damageTypes.join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        발생일 {report.incidentDate} · 이용 기간 {report.usagePeriod} · 작성자{" "}
                        {report.authorNickname ?? "익명"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-surface px-3 py-1 text-xs font-semibold text-foreground">
                      {report.damageAmountUnknown || report.damageAmount === null
                        ? "피해 금액 미확인"
                        : `${report.damageAmount.toLocaleString("ko-KR")}원`}
                    </span>
                  </div>
                  <ScamReportDetails report={report} siteName={site.siteName} />
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-3xl">⚠️</p>
              <h3 className="mt-3 font-bold">아직 승인된 피해 제보가 없습니다</h3>
              <p className="mt-2 text-sm text-muted">
                이 사이트에 대한 먹튀 피해 이력은 관리자 검토 후 공개됩니다.
              </p>
            </div>
          )}
        </section>

        {errorMessage ? (
          <section className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {errorMessage}
          </section>
        ) : null}

        {source === "fallback" ? (
          <p className="mt-4 text-sm text-muted">현재 개발용 더미 데이터가 표시되고 있습니다.</p>
        ) : null}

        {/* 커뮤니티 리뷰 */}
        <section id="reviews" className="mt-5 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">커뮤니티 리뷰</p>
              <h2 className="mt-1 text-base font-bold">최근 이용 경험</h2>
            </div>
            <SiteAuthorActions siteId={site.id} kind="review" />
          </div>
          {reviews.length > 0 ? (
            <div className="grid gap-3 p-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} />
                        <span className="text-xs font-semibold text-accent">
                          {formatRatingScore(review.rating)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-bold text-foreground">{review.title}</h3>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {review.authorNickname ?? "익명"} · {review.createdAt}
                    </p>
                  </div>
                  <ReviewSummary siteName={site.siteName} experience={review.experience} />
                </article>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-3xl">📝</p>
              <h3 className="mt-3 font-bold">아직 승인된 리뷰가 없습니다</h3>
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
