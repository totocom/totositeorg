import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { AdminSiteDetailActions } from "@/app/components/admin-site-detail-actions";
import { DomainInfoTabs } from "@/app/components/domain-info-tabs";
import { EmptyStateIllustration } from "@/app/components/empty-state-illustration";
import { RelatedBlogReportCard } from "@/app/components/related-blog-report-card";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";
import { ReviewHelpfulnessVote } from "@/app/components/review-helpfulness-vote";
import { ReviewSummary } from "@/app/components/review-summary";
import { SafeMarkdown } from "@/app/components/safe-markdown";
import { ScamReportDetails } from "@/app/components/scam-report-details";
import { SiteDescriptionNotice } from "@/app/components/site-description-notice";
import { SiteDetailTabs } from "@/app/components/site-detail/site-detail-tabs";
import {
  buildAggregateRatingJsonLd,
  buildSiteBreadcrumbJsonLd,
  buildSiteWebPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { SiteFeedbackSubmissionGuide } from "@/app/components/site-feedback-submission-guide";
import { SiteObservationSnapshotCard } from "@/app/components/site-observation-snapshot-card";
import { SiteShareActions } from "@/app/components/site-share-actions";
import { SiteTelegramAlertSubscription } from "@/app/components/site-telegram-alert-subscription";
import { formatDisplayDomain } from "@/app/data/domain-display";
import {
  formatKoreanDate,
  maskPublicAuthorName,
} from "@/app/data/public-display";
import { extractDomain } from "@/app/data/domain-whois";
import { getPublicSiteDetail } from "@/app/data/public-sites";
import {
  buildReviewCardTitle,
  buildScamReportCardTitle,
} from "@/app/data/public-seo-selection";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import { getSiteOverviewMarkdownBlocks } from "@/app/data/public-site-description";
import { calculateSiteDetailIndexability } from "@/app/data/site-detail-indexability";
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
  siteTrustScoreWeights,
  getTrustScoreTone,
} from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

function getReviewScoreLabel(rating: number) {
  const score = Math.round(Math.max(1, Math.min(5, rating)) * 20);

  if (score >= 80) return "긍정 평가";
  if (score >= 60) return "보통 평가";
  if (score >= 40) return "불만족 평가";

  return "낮은 만족도";
}

function ReviewScoreBadge({ rating }: { rating: number }) {
  const score = formatRatingScore(rating);
  const label = getReviewScoreLabel(rating);

  return (
    <span
      className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent"
      aria-label={`만족도 ${score.replace("/100", "점")}, ${label}`}
    >
      만족도 점수: {score} · {label}
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
  weightLabel,
  value,
}: {
  label: string;
  weightLabel?: string;
  value: number;
}) {
  const percentage = Math.max(0, Math.min(100, value));
  const toneClasses = getTrustToneClasses(getTrustScoreTone(value));

  return (
    <div className="rounded-lg border border-line bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-muted">{label}</span>
          {weightLabel ? (
            <span className="mt-0.5 block text-[11px] font-semibold text-muted/80">
              {weightLabel}
            </span>
          ) : null}
        </span>
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
  const detail = await getCachedPublicSiteDetail(slug);
  const {
    site,
    reviews,
    scamReports,
    dnsRecords,
    observationSnapshot,
    domainCreationDates,
    relatedBlogReport,
    source,
  } = detail;

  if (!site) {
    return buildMissingSiteMetadata();
  }

  const indexability = calculateSiteDetailIndexability({
    site,
    reviewsCount: reviews.length,
    scamReportsCount: scamReports.length,
    dnsRecordCount: dnsRecords.length,
    observationSnapshot,
    domainCreationDates,
    relatedBlogReport,
    source,
  });

  return buildSiteDetailMetadata(site, slug, {
    shouldIndex: indexability.shouldIndex,
    indexability,
    observationSnapshot,
    relatedBlogReport,
  });
}

export default async function SiteDetailPage({ params }: SiteDetailPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();
  const splitEnabled = isSitePageSplitEnabled(slug);

  const {
    site,
    reviews,
    scamReports,
    dnsRecords,
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

  const indexability = calculateSiteDetailIndexability({
    site,
    reviewsCount: reviews.length,
    scamReportsCount: scamReports.length,
    dnsRecordCount: dnsRecords.length,
    observationSnapshot,
    domainCreationDates,
    relatedBlogReport,
    source,
  });
  const siteDetailMetadataOptions = {
    shouldIndex: indexability.shouldIndex,
    indexability,
    observationSnapshot,
    relatedBlogReport,
  };
  const siteDetailMetaDescription = buildSiteDetailMetaDescription(
    site,
    siteDetailMetadataOptions,
  );
  const siteDetailHeading = buildSiteDetailHeading(
    site,
    siteDetailMetadataOptions,
  );
  const shareTitle = buildSiteDetailShareTitle(site, siteDetailMetadataOptions);
  const shareDescription = buildSiteDetailShareDescription(
    site,
    siteDetailMetadataOptions,
  );
  const shareUrl = `${siteUrl.replace(/\/$/, "")}/sites/${encodeURIComponent(slug)}`;
  const aggregateRatingJsonLd = buildAggregateRatingJsonLd(site);
  const domainTargets = Array.from(
    new Set([site.siteUrl, ...site.domains].filter(Boolean)),
  ).slice(0, 6);
  const siteDetailInternalLinks = buildSiteDetailInternalLinks({
    siteName: site.siteName,
    includeDomainLinks: !splitEnabled && domainTargets.length > 0,
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
      siteName: site.siteName,
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
  const publicEvidenceNotice = `현재 공개된 ${site.siteName} 관련 먹튀 피해 제보는 ${scamReportCount}건, 이용자 후기는 ${reviews.length}건입니다. 단일 제보나 단일 후기는 사이트 전체의 상태를 확정하는 자료가 아니며, 피해 유형, 작성 시점, 도메인 정보, 추가 후기와 함께 참고해야 합니다.`;
  const overviewBlocks = getSiteOverviewMarkdownBlocks(site.shortDescription);
  const visibleScamReports = splitEnabled ? scamReports.slice(0, 3) : scamReports;
  const visibleReviews = splitEnabled ? reviews.slice(0, 3) : reviews;
  const responsibleUseHeadingSiteName =
    site.siteNameKo?.trim() || site.siteName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const responsibleUseHeading = `${
    responsibleUseHeadingSiteName || site.siteName
  } 정보 이용 시 참고사항`;

  return (
    <>
      <JsonLd
        value={buildSiteWebPageJsonLd({
          site,
          canonical: shareUrl,
          title: shareTitle,
          description: siteDetailMetaDescription,
        })}
      />
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "사이트 목록", url: new URL("/sites", siteUrl).toString() },
            { name: site.siteName, url: shareUrl },
          ],
        })}
      />
      {aggregateRatingJsonLd ? <JsonLd value={aggregateRatingJsonLd} /> : null}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="min-w-0">
          {/* 메인 정보 카드 */}
          <article id="site-overview" className="scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
            {/* 브레드크럼 */}
            <nav aria-label="Breadcrumb" className="px-5 pt-5 text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li className="flex min-w-0 items-center gap-2">
                  <Link href="/" className="font-semibold transition hover:text-accent">
                    홈
                  </Link>
                </li>
                <li className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="text-muted/70">
                    /
                  </span>
                  <Link
                    href="/sites"
                    className="font-semibold transition hover:text-accent"
                  >
                    사이트 목록
                  </Link>
                </li>
                <li className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="text-muted/70">
                    /
                  </span>
                  <span
                    aria-current="page"
                    className="break-words font-semibold text-foreground"
                  >
                    {site.siteName}
                  </span>
                </li>
              </ol>
            </nav>

          {/* 상단: 로고 + 운영 이력 + 사이트명 */}
          <div className="grid gap-5 p-5">
            {/* 사이트 기본 정보 */}
            <div className="w-full min-w-0">
              <div className="flex w-full min-w-0 items-start gap-4">
                {site.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={site.faviconUrl}
                    alt={logoAlt}
                    className="h-12 w-12 shrink-0 rounded-xl border border-line bg-white object-contain p-1.5 dark:bg-surface"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-background text-lg font-bold text-accent">
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
                </div>
              </div>
              <div className="mt-4">
                <h1 className="break-keep text-2xl font-bold sm:text-3xl">
                  {siteDetailHeading}
                </h1>
                <p className="mt-1 break-all text-sm text-muted">
                  <span className="font-semibold text-foreground">대표 도메인: </span>
                  {representativeDisplayDomain || formatDisplayDomain(site.siteUrl)}
                </p>
              </div>
            </div>

            {/* 신뢰 점수 + 먹튀 피해 제보 상태 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${trustToneClasses.neon} rounded-xl border px-4 py-3 text-center ${trustToneClasses.border} ${trustToneClasses.background}`}>
                <p className={`text-xs font-semibold ${trustToneClasses.text}`}>신뢰 점수</p>
                <p className={`mt-1 text-xl font-black ${trustToneClasses.text}`}>
                  {formatTrustScore(trustScore)}
                </p>
              </div>
              {scamReportCount > 0 ? (
                <div className="neon-scam rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center dark:border-red-900 dark:bg-red-950/40">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    {scamReportStatusCopy.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/70">
                    {formatDamageAmount(scamDamageAmount, scamDamageAmountUnknownCount)}
                  </p>
                </div>
              ) : (
                <div className="neon-safe rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-center">
                  <p className="text-sm font-bold text-accent">
                    {scamReportStatusCopy.primary}
                  </p>
                  <p className="mt-0.5 text-xs text-accent/70">
                    {scamReportStatusCopy.secondary}
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <AdminSiteDetailActions
                  siteId={site.id}
                  siteSlug={site.slug}
                  indexability={indexability}
                />
              </div>
            </div>

            {splitEnabled ? (
              <SiteDetailTabs
                slug={site.slug}
                siteName={site.siteNameKo?.trim() || site.siteName}
                activeTab="main"
                counts={{
                  scamReports: scamReports.length,
                  reviews: reviews.length,
                  domains: domainTargets.length,
                }}
              />
            ) : null}
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
                    {representativeDisplayDomain || formatDisplayDomain(representativeDomain)}
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

          {/* 도메인 & DNS */}
          {!splitEnabled && domainInfoTabs.length > 0 ? (
            <div className="border-t border-line px-5 py-4">
              <DomainInfoTabs items={domainInfoTabs} variant="embedded" />
            </div>
          ) : null}

          {splitEnabled && domainTargets.length > 0 ? (
            <div className="border-t border-line px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                도메인 상세
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                WHOIS와 DNS 조회 항목은 주소·도메인 전용 페이지에서 확인할 수 있습니다.
              </p>
              <Link
                href={`/sites/${encodeURIComponent(site.slug)}/domains`}
                className="mt-3 inline-flex min-h-10 items-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
              >
                {site.siteName} 주소·도메인 정보 {domainTargets.length}개 보기
              </Link>
            </div>
          ) : null}

          <div className="border-t border-line px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              신뢰 점수 산정
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <TrustScoreMetric
                label="먹튀 제보"
                weightLabel={`${siteTrustScoreWeights.scamRisk}% 반영`}
                value={trustScore.scamRisk}
              />
              <TrustScoreMetric
                label="후기"
                weightLabel={`${siteTrustScoreWeights.userExperience}% 반영`}
                value={trustScore.userExperience}
              />
              <TrustScoreMetric
                label="도메인"
                weightLabel={`${siteTrustScoreWeights.domainAge}% 반영`}
                value={trustScore.domainAge}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              {trustScore.summary}
            </p>
          </div>

          <nav
            className="border-t border-line px-5 py-4"
            aria-label={`${site.siteName} 상세 페이지 내부 링크`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              상세 페이지 탐색
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {siteDetailInternalLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-10 items-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-line px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              제보·후기 해석 기준
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {publicEvidenceNotice}
            </p>
          </div>

          {/* 사이트 개요 */}
          {overviewBlocks.length > 0 ? (
            <div className="px-5 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                사이트 메인 화면 내용
              </p>
              <SiteDescriptionNotice siteName={site.siteName} />
              <SafeMarkdown
                value={site.shortDescription}
                blocks={overviewBlocks}
                className="mt-2"
              />
            </div>
          ) : null}

        </article>

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

        {/* 먹튀 제보 현황 */}
        <section id="reports" className="mt-5 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">
          <span id="scam-reports" className="sr-only" aria-hidden="true" />
          <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">먹튀 제보 현황</p>
              <h2 className="mt-1 text-base font-bold">
                {splitEnabled ? "최근 승인된 피해 제보" : "승인된 피해 제보"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                승인된 공개 제보 기준으로 요약하며, 제보 내용은 참고 자료입니다.
              </p>
            </div>
          </div>
          {visibleScamReports.length > 0 ? (
            <div className="grid gap-3 p-4">
              {visibleScamReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-lg border border-line bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {buildScamReportCardTitle(report)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        발생일 {formatKoreanDate(report.incidentDate)} · 이용 기간{" "}
                        {report.usagePeriod} · 작성자{" "}
                        {maskPublicAuthorName(
                          report.authorNickname,
                          "승인된 제보자",
                        )}
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
              {splitEnabled ? (
                <Link
                  href={`/sites/${encodeURIComponent(site.slug)}/scam-reports`}
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
                >
                  {site.siteName} 먹튀 제보 현황 {scamReports.length}건 보기
                </Link>
              ) : null}
              <p className="text-sm leading-6 text-muted">
                추가 피해 사례가 있다면 확인 가능한 정보를 중심으로{" "}
                <Link
                  href={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                  rel="nofollow"
                  className="font-semibold text-accent transition hover:text-accent/80"
                >
                  제보를 남겨주세요
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="px-5 py-5 text-center">
              <EmptyStateIllustration
                kind="scam-reports"
                alt={`${site.siteName} 승인 먹튀 제보 데이터가 아직 없는 상태`}
              />
              <h3 className="text-base font-bold text-foreground">
                현재 공개된 승인 먹튀 제보가 없습니다
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                피해 사례가 있다면 확인 가능한 정보를 중심으로 제보를 남겨주세요.
              </p>
              <Link
                href={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                rel="nofollow"
                className="mt-4 inline-flex min-h-10 items-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
              >
                {site.siteName} 먹튀 피해 제보하기
              </Link>
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
              <h2 className="mt-1 text-base font-bold">
                {splitEnabled ? "최근 이용 경험 요약" : "최근 이용 경험"}
              </h2>
            </div>
          </div>
          {visibleReviews.length > 0 ? (
            <div className="grid gap-3 p-4">
              {visibleReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground">
                        {buildReviewCardTitle(review.experience, review.title)}
                      </h3>
                    </div>
                    <p className="shrink-0 text-xs text-muted">
                      {maskPublicAuthorName(review.authorNickname)} ·{" "}
                      {formatKoreanDate(review.createdAt)}
                    </p>
                  </div>
                  <div className="mt-1.5">
                    <ReviewScoreBadge rating={review.rating} />
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
              {splitEnabled ? (
                <Link
                  href={`/sites/${encodeURIComponent(site.slug)}/reviews`}
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-surface px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
                >
                  {site.siteName} 후기 데이터 {reviews.length}건 보기
                </Link>
              ) : null}
              <p className="text-sm leading-6 text-muted">
                이용 경험이 있다면{" "}
                <Link
                  href={`/submit-review?siteId=${encodeURIComponent(site.id)}`}
                  rel="nofollow"
                  className="font-semibold text-accent transition hover:text-accent/80"
                >
                  후기를 남겨주세요
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="px-5 py-5 text-center">
              <EmptyStateIllustration
                kind="reviews"
                alt={`${site.siteName} 승인 후기 데이터가 아직 없는 상태`}
              />
              <h3 className="text-base font-bold text-foreground">
                현재 공개된 승인 후기가 없습니다
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                이용 경험이 있다면 후기를 남겨주세요.
              </p>
              <Link
                href={`/submit-review?siteId=${encodeURIComponent(site.id)}`}
                rel="nofollow"
                className="mt-4 inline-flex min-h-10 items-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
              >
                {site.siteName} 후기 남기기
              </Link>
            </div>
          )}
        </section>

        </div>

        <aside className="grid content-start gap-4">
          <SiteFeedbackSubmissionGuide
            siteId={site.id}
            siteName={site.siteName}
            reduced={!indexability.shouldIndex}
          />

          <ResponsibleUseNotice
            variant="compact"
            heading={responsibleUseHeading}
          />

          <RelatedBlogReportCard
            siteName={site.siteName}
            report={relatedBlogReport}
          />

          <SiteTelegramAlertSubscription siteId={site.id} siteName={site.siteName} />

          <SiteShareActions
            siteName={site.siteName}
            shareUrl={shareUrl}
            title={shareTitle}
            description={shareDescription}
          />
        </aside>
      </main>
    </>
  );
}
