import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { cache } from "react";
import { PageShareButton } from "@/app/components/page-share-button";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";
import { ScamReportDetails } from "@/app/components/scam-report-details";
import { SiteEmptyState } from "@/app/components/site-detail/site-empty-state";
import { buildSiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import { SiteHeaderCommon } from "@/app/components/site-detail/site-header-common";
import {
  buildFaqPageJsonLd,
  buildSiteBreadcrumbJsonLd,
  buildSiteWebPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import {
  getScamReportFaqItems,
  SiteScamReportFaq,
} from "@/app/components/site-detail/site-scam-report-faq";
import {
  formatKoreanDate,
  maskPublicAuthorName,
  sanitizePublicSiteName,
} from "@/app/data/public-display";
import { getSiteScamReportsDetail } from "@/app/data/public-site-detail";
import { buildScamReportCardTitle } from "@/app/data/public-seo-selection";
import { formatScamReportDepositAmount } from "@/app/data/scam-report-deposit-display";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import {
  buildSiteScamReportsDescription,
  buildSiteScamReportsMetadata,
  buildSiteScamReportsTitle,
} from "@/app/data/site-detail-subpage-metadata";
import type { ScamReport } from "@/app/data/sites";
import { siteUrl } from "@/lib/config";

export const dynamicParams = true;
export const revalidate = 300;

type SiteScamReportsPageProps = {
  params: Promise<{ slug: string }>;
};

const getCachedDetail = cache((slug: string) =>
  getSiteScamReportsDetail(slug),
);

function redirectDisabledSplitPage(slug: string): never {
  permanentRedirect(`/sites/${encodeURIComponent(slug)}`);
}

function formatDamageAmount(report: ScamReport) {
  if (report.damageAmountUnknown || report.damageAmount === null) {
    return "금액 미상";
  }

  return `${report.damageAmount.toLocaleString("ko-KR")}원`;
}

function formatDepositAmount(report: ScamReport) {
  return formatScamReportDepositAmount(report);
}

function getShortSiteName(site: { siteName: string; siteNameKo?: string | null }) {
  return (
    site.siteNameKo?.trim() ||
    sanitizePublicSiteName(site.siteName)
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    site.siteName
  );
}

function buildScamReportInterpretationNotice(
  siteName: string,
  scamReportCount: number,
) {
  const displaySiteName = sanitizePublicSiteName(siteName);

  if (scamReportCount <= 0) {
    return `현재 공개된 ${displaySiteName} 관련 먹튀 제보가 없습니다. 공개 제보가 없다는 사실은 사이트 상태를 단정하는 자료가 아니며, 후기와 도메인 정보를 함께 참고하는 것이 좋습니다.`;
  }

  const base = `현재 공개된 ${displaySiteName} 관련 승인 먹튀 제보는 ${scamReportCount}건입니다. 단일 제보나 소수의 제보만으로 사이트 전체의 상태를 확정하기는 어렵습니다. 피해 유형, 발생일, 접수일, 피해 금액, 사이트 대응 여부, 이용자 후기, 도메인 정보와 함께 참고하는 것이 좋습니다.`;

  if (scamReportCount === 1) {
    return `${base} 제보 수가 적을 때는 동일 시점의 추가 자료를 함께 확인해야 합니다.`;
  }

  return `${base} 제보는 참고 자료이며 사이트 이용을 권장하는 의미가 아닙니다.`;
}

export async function generateMetadata({
  params,
}: SiteScamReportsPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);

  return buildSiteScamReportsMetadata(detail, slug);
}

export default async function SiteScamReportsPage({
  params,
}: SiteScamReportsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);
  const { common, scamReports } = detail;
  const site = common.site;

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="scam-reports" splitEnabled />
        <section className="mt-5 rounded-lg border border-line bg-surface p-6 shadow-sm">
          <Link href="/sites" className="text-sm font-semibold text-accent">
            사이트 목록으로 돌아가기
          </Link>
          <p className="mt-4 text-sm leading-6 text-muted">
            요청한 공개 주소와 일치하는 승인된 사이트가 없습니다.
          </p>
        </section>
      </main>
    );
  }

  const context = buildSiteFaqContext(site);
  const faqItems = getScamReportFaqItems(context);
  const canonical = new URL(
    `/sites/${encodeURIComponent(slug)}/scam-reports`,
    siteUrl,
  ).toString();
  const title = buildSiteScamReportsTitle(site.siteName);
  const description = buildSiteScamReportsDescription(site, scamReports);
  const shortSiteName = getShortSiteName(site);
  const responsibleUseHeading = `${shortSiteName} 제보 확인 시 참고사항`;

  return (
    <>
      <JsonLd
        value={buildSiteWebPageJsonLd({
          site,
          canonical,
          title,
          description,
          pageType: "CollectionPage",
        })}
      />
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "사이트 목록", url: new URL("/sites", siteUrl).toString() },
            { name: site.siteName, url: new URL(`/sites/${encodeURIComponent(slug)}`, siteUrl).toString() },
            { name: "먹튀 제보", url: canonical },
          ],
        })}
      />
      <JsonLd value={buildFaqPageJsonLd(faqItems)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="scam-reports" splitEnabled />

        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  피해 제보
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  승인된 먹튀 제보 {scamReports.length}건
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  개인정보와 중복 여부를 검토한 뒤 승인된 공개 제보만 표시합니다.
                </p>
                <p
                  className={
                    scamReports.length <= 1
                      ? "mt-3 rounded-md border border-line bg-background px-3 py-2 text-sm leading-6 text-foreground"
                      : "mt-3 rounded-md bg-background px-3 py-2 text-sm leading-6 text-muted"
                  }
                >
                  {buildScamReportInterpretationNotice(
                    site.siteName,
                    scamReports.length,
                  )}
                </p>
              </div>
              {scamReports.length > 0 ? (
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Link
                    href={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                    rel="nofollow"
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
                  >
                    {site.siteName} 먹튀 피해 제보하기
                  </Link>
                  <PageShareButton
                    title={title}
                    text={description}
                    url={canonical}
                  />
                </div>
              ) : null}
            </div>
          </section>

          {scamReports.length > 0 ? (
            <section className="grid gap-4">
              {scamReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-lg border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-foreground">
                        {buildScamReportCardTitle(report)}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        발생일 {formatKoreanDate(report.incidentDate)} · 접수일{" "}
                        {formatKoreanDate(report.createdAt)} · 작성자{" "}
                        {maskPublicAuthorName(
                          report.authorNickname,
                          "승인된 제보자",
                        )}
                      </p>
                    </div>
                    <div className="w-fit rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      <p>피해 금액: {formatDamageAmount(report)}</p>
                      <p className="mt-1 text-xs font-medium">
                        입금액: {formatDepositAmount(report)}
                      </p>
                      <p className="mt-1 text-xs font-medium">
                        표시 기준: 제보자가 제출한 공개 승인 데이터 기준
                      </p>
                    </div>
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
                  <ScamReportDetails report={report} siteName={site.siteName} />
                </article>
              ))}
            </section>
          ) : (
            <>
              <SiteEmptyState
                title="공개된 먹튀 제보가 없습니다"
                description={`현재 공개된 승인 먹튀 제보가 없습니다. 피해 사례가 있다면 확인 가능한 정보를 중심으로 제보를 남겨주세요.`}
                actionHref={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                actionLabel={`${site.siteName} 먹튀 피해 제보하기`}
                actionRel="nofollow"
                illustrationKind="scam-reports"
                illustrationAlt={`${site.siteName} 승인 먹튀 제보 데이터가 아직 없는 상태`}
              />
              <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">
                  제보 작성 전 확인할 항목
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {site.siteName} 제보는 대표 도메인{" "}
                  {context.representativeDomain}, 도메인 {context.domainCount}개
                  같은 공개 정보와 함께
                  검토됩니다. 피해 유형, 발생일, 이용 기간, 상황 요약처럼
                  확인 가능한 내용을 중심으로 작성하면 검토가 수월합니다.
                </p>
              </section>
            </>
          )}

          <SiteScamReportFaq context={context} />
          <ResponsibleUseNotice
            variant="card"
            heading={responsibleUseHeading}
          />
        </div>
      </main>
    </>
  );
}
