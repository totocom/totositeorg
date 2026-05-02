import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { AdminSiteDetailActions } from "@/app/components/admin-site-detail-actions";
import { DomainInfoTabs } from "@/app/components/domain-info-tabs";
import { RelatedBlogReportCard } from "@/app/components/related-blog-report-card";
import { ReviewHelpfulnessVote } from "@/app/components/review-helpfulness-vote";
import { ReviewSummary, getReviewSeoSummary } from "@/app/components/review-summary";
import { SafeMarkdown } from "@/app/components/safe-markdown";
import { ScamReportDetails } from "@/app/components/scam-report-details";
import { SiteAuthorActions } from "@/app/components/site-author-actions";
import { SiteFeedbackSubmissionGuide } from "@/app/components/site-feedback-submission-guide";
import { SiteObservationSnapshotCard } from "@/app/components/site-observation-snapshot-card";
import { SiteShareActions } from "@/app/components/site-share-actions";
import { SiteTelegramAlertSubscription } from "@/app/components/site-telegram-alert-subscription";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import { extractDomain } from "@/app/data/domain-whois";
import { getPublicSiteDetail } from "@/app/data/public-sites";
import { getSiteOverviewMarkdownBlocks } from "@/app/data/public-site-description";
import {
  buildSiteDetailHeading,
  buildMissingSiteMetadata,
  buildSiteDetailMetaDescription,
  buildSiteDetailMetadata,
  buildSiteDetailShareDescription,
  buildSiteDetailShareTitle,
} from "@/app/data/site-detail-metadata";
import { buildSiteDetailInternalLinks } from "@/app/data/site-detail-internal-links";
import {
  calculateSiteTrustScore,
  formatRatingScore,
  formatTrustScore,
  getApprovedScamReportStatusCopy,
  scamReportScoreLabel,
  getTrustScoreTone,
} from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

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
type SiteDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = true;
export const revalidate = 300;

const getCachedPublicSiteDetail = cache((slug: string) =>
  getPublicSiteDetail(slug),
);

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
      <div className={`${toneClasses.neon} mt-2 h-1.5 overflow-hidden rounded-full bg-line`}>
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
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();
  const { site } = await getCachedPublicSiteDetail(slug);

  if (!site) {
    return buildMissingSiteMetadata();
  }

  return buildSiteDetailMetadata(site, slug);
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  const {
    site,
    reviews,
    scamReports,
    observationSnapshot,
    relatedBlogReport,
    domainCreationDates,
    errorMessage,
    source,
  } = await getCachedPublicSiteDetail(slug);

  if (!site) {
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

  const siteDetailMetaDescription = buildSiteDetailMetaDescription(site);
  const siteDetailHeading = buildSiteDetailHeading(site);
  const shareTitle = buildSiteDetailShareTitle(site);
  const shareDescription = buildSiteDetailShareDescription(site);
  const shareUrl = `${siteUrl.replace(/\/$/, "")}/sites/${encodeURIComponent(slug)}`;
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
    name: `${site.siteName} 토토사이트 정보`,
    description: reviews[0]
      ? getReviewSeoSummary(site.siteName, reviews[0].experience)
      : siteDetailMetaDescription,
  };
  const domainTargets = Array.from(
    new Set([site.siteUrl, ...site.domains].filter(Boolean)),
  ).slice(0, 6);
  const siteDetailInternalLinks = buildSiteDetailInternalLinks({
    siteName: site.siteName,
    includeDomainLinks: domainTargets.length > 0,
  });
  const domainCreationDateMap = new Map(
    domainCreationDates.map(({ domain, creationDate }) => [
      domain,
      creationDate,
    ]),
  );
  const oldestDomainCreationDate = site.oldestDomainCreationDate ?? null;
  const domainInfoTabs = domainTargets.map((domainUrl) => {
    const creationDate = domainCreationDateMap.get(extractDomain(domainUrl));

    return {
      siteId: site.id,
      domainUrl,
      displayDomain: formatDisplayDomain(domainUrl),
      domainAge: creationDate ? getDomainAge(creationDate) : "확인 불가",
      whoisInfo: null,
      dnsInfo: null,
      isLoaded: false,
    };
  });
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
  const screenshotPreviewUrl = site.screenshotUrl
    ? site.screenshotThumbUrl || site.screenshotUrl
    : null;
  const logoAlt = `${site.siteName} 토토사이트 로고`;
  const scamReportStatusCopy = getApprovedScamReportStatusCopy(scamReportCount);
  const representativeDomain = site.siteUrl;
  const representativeDisplayDomain = formatDisplayDomain(representativeDomain);
  const additionalDomains = domainTargets.filter(
    (domain) => formatDisplayDomain(domain) !== representativeDisplayDomain,
  );
  const overviewBlocks = getSiteOverviewMarkdownBlocks(site.shortDescription);

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
        <article id="site-overview" className="mt-4 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
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
                  <p className="mt-1.5 inline-flex rounded-md border border-line bg-background px-2 py-1 text-xs font-semibold text-foreground">
                    {site.siteName}
                  </p>
                  <h1 className="mt-2 break-keep text-2xl font-bold sm:text-3xl">
                    {siteDetailHeading}
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
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    {scamReportStatusCopy.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/70">
                    {formatDamageAmount(scamDamageAmount, scamDamageAmountUnknownCount)}
                  </p>
                </div>
              ) : (
                <div className="neon-safe flex-1 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-center sm:flex-none">
                  <p className="text-sm font-bold text-accent">
                    {scamReportStatusCopy.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-accent/70">
                    {scamReportStatusCopy.secondary}
                  </p>
                </div>
              )}
              <AdminSiteDetailActions siteId={site.id} siteSlug={site.slug} />
            </div>
          </div>

          {/* 등록 도메인 */}
          {domainTargets.length > 0 ? (
            <div id="domain-history" className="scroll-mt-24 border-t border-line px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                등록 도메인
              </p>
              <div className="mt-2 grid gap-2 text-xs text-muted sm:grid-cols-2">
                <div className="rounded-md bg-background px-3 py-2">
                  <span className="font-semibold text-foreground">대표 도메인: </span>
                  <span className="break-all">
                    {representativeDisplayDomain || formatDisplayUrl(representativeDomain)}
                  </span>
                </div>
                {additionalDomains.length > 0 ? (
                  <div className="rounded-md bg-background px-3 py-2">
                    <span className="font-semibold text-foreground">추가 도메인: </span>
                    <span className="break-all">
                      {additionalDomains.map(formatDisplayDomain).join(", ")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="border-t border-line px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              신뢰 점수 산정
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <TrustScoreMetric
                label={scamReportScoreLabel}
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
          {overviewBlocks.length > 0 ? (
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">사이트 개요</p>
              <SafeMarkdown
                value={site.shortDescription}
                blocks={overviewBlocks}
                className="mt-2"
              />
            </div>
          ) : null}

        </article>

        <SiteShareActions
          siteName={site.siteName}
          shareUrl={shareUrl}
          title={shareTitle}
          description={shareDescription}
        />

        <nav
          className="mt-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-sm"
          aria-label={`${site.siteName} 상세 페이지 내부 링크`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            상세 페이지 탐색
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {siteDetailInternalLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="inline-flex min-h-10 items-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

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

        <SiteObservationSnapshotCard
          snapshot={observationSnapshot}
          assets={{
            siteName: site.siteName,
            screenshotUrl: site.screenshotUrl,
            screenshotThumbUrl: site.screenshotThumbUrl,
            faviconUrl: site.faviconUrl,
            logoUrl: site.logoUrl,
          }}
        />

        <RelatedBlogReportCard
          siteName={site.siteName}
          report={relatedBlogReport}
        />

        {/* 도메인 & DNS */}
        <DomainInfoTabs items={domainInfoTabs} />

        {/* 먹튀 피해 이력 */}
        <section id="reports" className="mt-5 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
          <span id="scam-reports" className="sr-only" aria-hidden="true" />
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
                  <ReviewHelpfulnessVote
                    reviewId={review.id}
                    authorUserId={review.authorUserId}
                    initialHelpfulCount={review.helpfulCount ?? 0}
                    initialNotHelpfulCount={review.notHelpfulCount ?? 0}
                  />
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

        <SiteFeedbackSubmissionGuide siteId={site.id} siteName={site.siteName} />

      </main>
    </>
  );
}
