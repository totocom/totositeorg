import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { cache } from "react";
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
import { getSiteScamReportsDetail } from "@/app/data/public-site-detail";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import { buildSiteScamReportsMetadata } from "@/app/data/site-detail-subpage-metadata";
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

function formatDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function formatDamageAmount(report: ScamReport) {
  if (report.damageAmountUnknown || report.damageAmount === null) {
    return "피해 금액 미확인";
  }

  return `${report.damageAmount.toLocaleString("ko-KR")}원`;
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
  const title = `${site.siteName} 먹튀 제보`;
  const description =
    scamReports.length > 0
      ? `${site.siteName} 토토사이트 관련 승인된 먹튀 제보 ${scamReports.length}건의 피해 유형과 접수 시점을 정리했습니다.`
      : `${site.siteName} 토토사이트 관련 승인된 먹튀 제보는 아직 없습니다. 제보 방법과 확인 기준을 안내합니다.`;

  return (
    <>
      <JsonLd
        value={buildSiteWebPageJsonLd({
          site,
          canonical,
          title,
          description,
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
                  {site.siteName} 먹튀 제보 {scamReports.length}건
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  개인정보와 중복 여부를 검토한 뒤 승인된 공개 제보만 표시합니다.
                </p>
              </div>
              <Link
                href={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
              >
                먹튀 제보 작성
              </Link>
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
                        {report.damageTypes.join(", ") || report.mainCategory}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        발생일 {formatDate(report.incidentDate)} · 접수일{" "}
                        {formatDate(report.createdAt)} · 작성자{" "}
                        {report.authorNickname ?? "익명"}
                      </p>
                    </div>
                    <p className="w-fit rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      {formatDamageAmount(report)}
                    </p>
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
                title="현재 승인된 먹튀 제보가 없습니다"
                description={`${site.siteName} 관련 공개 승인 제보는 아직 없습니다. 접수된 내용이 관리자 검토를 통과하면 이 페이지에 표시됩니다.`}
                actionHref={`/submit-scam-report?siteId=${encodeURIComponent(site.id)}`}
                actionLabel="먹튀 제보 작성"
              />
              <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
                <h2 className="text-lg font-bold text-foreground">
                  제보 작성 전 확인할 항목
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {site.siteName} 제보는 대표 도메인{" "}
                  {context.representativeDomain}, 도메인 {context.domainCount}개,
                  운영 이력 {context.operatingPeriod} 같은 공개 정보와 함께
                  검토됩니다. 피해 유형, 발생일, 이용 기간, 증빙 메모처럼
                  확인 가능한 내용을 중심으로 작성하면 검토가 수월합니다.
                </p>
              </section>
            </>
          )}

          <SiteScamReportFaq context={context} />
          <ResponsibleUseNotice variant="card" />
        </div>
      </main>
    </>
  );
}
