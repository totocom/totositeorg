import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { cache } from "react";
import { DomainInfoTabs } from "@/app/components/domain-info-tabs";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";
import { SiteDomainFaq } from "@/app/components/site-detail/site-domain-faq";
import { buildSiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import { SiteHeaderCommon } from "@/app/components/site-detail/site-header-common";
import {
  buildFaqPageJsonLd,
  buildSiteBreadcrumbJsonLd,
  buildSiteWebPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { getDomainFaqItems } from "@/app/components/site-detail/site-domain-faq";
import { formatDisplayDomain } from "@/app/data/domain-display";
import {
  getSiteDomainsDetail,
  type SiteDomainSummary,
} from "@/app/data/public-site-detail";
import {
  formatKoreanDate,
  formatKoreanDateCriterion,
  sanitizePublicSiteName,
} from "@/app/data/public-display";
import type { PublicSiteDnsRecord } from "@/app/data/public-sites";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import {
  buildSiteDomainsDescription,
  buildSiteDomainsMetadata,
  buildSiteDomainsTitle,
} from "@/app/data/site-detail-subpage-metadata";
import { siteUrl } from "@/lib/config";

export const dynamicParams = true;
export const revalidate = 300;

type SiteDomainsPageProps = {
  params: Promise<{ slug: string }>;
};

const getCachedDetail = cache((slug: string) => getSiteDomainsDetail(slug));

function redirectDisabledSplitPage(slug: string): never {
  permanentRedirect(`/sites/${encodeURIComponent(slug)}`);
}

function formatDomainDate(value: string | null) {
  return formatKoreanDate(value, "확인 불가");
}

function getDomainAnchorId(index: number) {
  return `domain-${index + 1}`;
}

function buildDnsRecordMap(dnsRecords: PublicSiteDnsRecord[]) {
  const records = new Map<string, PublicSiteDnsRecord>();

  for (const record of dnsRecords) {
    const displayDomain = formatDisplayDomain(record.domainUrl).toLowerCase();
    const dnsDomain = formatDisplayDomain(record.dnsInfo.domain).toLowerCase();

    if (displayDomain) records.set(displayDomain, record);
    if (dnsDomain) records.set(dnsDomain, record);
  }

  return records;
}

function getDomainCheckStatus(
  domain: SiteDomainSummary,
  dnsRecord: PublicSiteDnsRecord | undefined,
) {
  const whoisStatus = domain.creationDate
    ? `WHOIS 최초 등록일 ${
        formatKoreanDateCriterion(domain.creationDate) ?? "날짜 확인 불가"
      }`
    : "WHOIS 최초 등록일 미확인";
  const dnsStatus = dnsRecord?.checkedAt
    ? `DNS 조회 ${
        formatKoreanDateCriterion(dnsRecord.checkedAt) ?? "날짜 확인 불가"
      }`
    : "DNS 레코드는 아래 조사 정보에서 선택 후 확인";

  return `${whoisStatus} · ${dnsStatus}`;
}

function buildDomainItemListJsonLd(
  canonical: string,
  domains: SiteDomainSummary[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: domains.map((domain, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: domain.displayDomain,
        url: `${canonical}#${getDomainAnchorId(index)}`,
      },
    })),
  };
}

export async function generateMetadata({
  params,
}: SiteDomainsPageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);

  return buildSiteDomainsMetadata(detail, slug);
}

export default async function SiteDomainsPage({ params }: SiteDomainsPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);
  const { common, domains, dnsRecords } = detail;
  const site = common.site;

  if (!site) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="domains" splitEnabled />
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
  const faqItems = getDomainFaqItems(context);
  const canonical = new URL(
    `/sites/${encodeURIComponent(slug)}/domains`,
    siteUrl,
  ).toString();
  const title = buildSiteDomainsTitle(site.siteName);
  const description = buildSiteDomainsDescription(site);
  const displaySiteName = sanitizePublicSiteName(site.siteName);
  const representativeDomain = domains[0] ?? null;
  const representativeDomainAge = representativeDomain?.domainAge ?? "확인 불가";
  const longestDomainAge = site.oldestDomainCreationDate
    ? context.operatingPeriod
    : "확인 불가";
  const additionalDomainCount = Math.max(0, domains.length - 1);
  const dnsRecordByDomain = buildDnsRecordMap(dnsRecords);
  const domainInfoItems = domains.map((domain) => {
    const matchedDnsRecord = dnsRecordByDomain.get(
      domain.displayDomain.toLowerCase(),
    );

    return {
      siteId: site.id,
      siteName: site.siteName,
      domainUrl: domain.domainUrl,
      displayDomain: domain.displayDomain,
      domainAge: domain.domainAge,
      whoisInfo: null,
      dnsInfo: matchedDnsRecord?.dnsInfo ?? null,
      isLoaded: Boolean(matchedDnsRecord),
    };
  });

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
            { name: displaySiteName, url: new URL(`/sites/${encodeURIComponent(slug)}`, siteUrl).toString() },
            { name: "주소·도메인", url: canonical },
          ],
        })}
      />
      {domains.length > 0 ? (
        <JsonLd value={buildDomainItemListJsonLd(canonical, domains)} />
      ) : null}
      <JsonLd value={buildFaqPageJsonLd(faqItems)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="domains" splitEnabled />

        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              주소·도메인
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {displaySiteName} 등록 도메인 {domains.length}개
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              대표 도메인과 추가 도메인은 관리자 등록 정보와 공개 가능한
              DNS·WHOIS 조회 결과를 기준으로 정리한 참고 자료입니다. 도메인이
              오래 운영되었거나 여러 개 등록되어 있다고 해서 사이트 안전성이나
              이용 가능성이 보장되는 것은 아닙니다. 이용자 후기와 먹튀 제보도
              함께 확인하는 것이 좋습니다.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md bg-background p-3">
                <dt className="text-xs font-semibold text-muted">대표 도메인</dt>
                <dd className="mt-1 break-all text-sm font-bold text-foreground">
                  {representativeDomain?.displayDomain ?? context.representativeDomain}
                </dd>
              </div>
              <div className="rounded-md bg-background p-3">
                <dt className="text-xs font-semibold text-muted">추가 도메인</dt>
                <dd className="mt-1 text-sm font-bold text-foreground">
                  {additionalDomainCount}개
                </dd>
              </div>
              <div className="rounded-md bg-background p-3">
                <dt className="text-xs font-semibold text-muted">
                  대표 도메인 운영 이력
                </dt>
                <dd className="mt-1 text-sm font-bold text-foreground">
                  {representativeDomainAge}
                </dd>
              </div>
              <div className="rounded-md bg-background p-3">
                <dt className="text-xs font-semibold text-muted">
                  등록 도메인 중 최장 운영 이력
                </dt>
                <dd className="mt-1 text-sm font-bold text-foreground">
                  {longestDomainAge}
                </dd>
              </div>
            </dl>
            <p className="mt-3 rounded-md border border-line bg-background px-3 py-2 text-xs leading-5 text-muted">
              사이트 상세의 운영 이력 지표는 등록 도메인 중 확인 가능한 최초
              등록일이 가장 오래된 도메인을 기준으로 계산될 수 있습니다. 따라서
              대표 도메인 운영 이력과 등록 도메인 중 최장 운영 이력은 다르게
              표시될 수 있습니다.
            </p>
          </section>

          <section
            className="rounded-lg border border-line bg-surface p-5 shadow-sm"
            aria-labelledby="domain-list-heading"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  도메인 변경 이력
                </p>
                <h2 id="domain-list-heading" className="mt-1 text-lg font-bold">
                  대표 도메인과 추가 도메인
                </h2>
              </div>
              <p className="text-sm font-semibold text-muted">
                등록 도메인 {domains.length}개
              </p>
            </div>

            {domains.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {domains.map((domain, index) => {
                  const dnsRecord = dnsRecordByDomain.get(
                    domain.displayDomain.toLowerCase(),
                  );
                  const domainRole =
                    index === 0 ? "대표 도메인" : "추가 도메인";

                  return (
                    <li key={domain.domain}>
                      <article
                        id={getDomainAnchorId(index)}
                        aria-label={`${domainRole} ${domain.displayDomain} 정보`}
                        className="h-full rounded-lg border border-line bg-background p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                          {domainRole}
                        </p>
                        <h3 className="mt-1 break-all text-base font-bold text-foreground">
                          {domain.displayDomain}
                        </h3>
                        <dl className="mt-3 grid gap-2 text-sm">
                          <div className="rounded-md bg-surface p-3">
                            <dt className="text-xs font-semibold text-muted">
                              {domainRole} 운영 이력
                            </dt>
                            <dd className="mt-1 font-semibold text-foreground">
                              {domain.domainAge}
                            </dd>
                          </div>
                          <div className="rounded-md bg-surface p-3">
                            <dt className="text-xs font-semibold text-muted">
                              최초 등록일
                            </dt>
                            <dd className="mt-1 font-semibold text-foreground">
                              {formatDomainDate(domain.creationDate)}
                            </dd>
                          </div>
                          <div className="rounded-md bg-surface p-3">
                            <dt className="text-xs font-semibold text-muted">
                              DNS·WHOIS 확인 상태
                            </dt>
                            <dd className="mt-1 break-keep text-sm leading-6 text-foreground">
                              {getDomainCheckStatus(domain, dnsRecord)}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-md bg-background p-4 text-sm leading-6 text-muted">
                공개 가능한 대표 도메인 또는 추가 도메인 정보가 아직 정리되지
                않았습니다.
              </p>
            )}
          </section>

          <DomainInfoTabs items={domainInfoItems} />
          <section
            className="rounded-lg border border-line bg-surface p-5 shadow-sm"
            aria-labelledby="domain-related-links-heading"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              함께 확인할 정보
            </p>
            <h2 id="domain-related-links-heading" className="mt-1 text-lg font-bold">
              주소·도메인 정보와 함께 볼 페이지
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              <li className="rounded-md bg-background p-3">
                <Link
                  href={`/sites/${encodeURIComponent(slug)}`}
                  className="text-sm font-bold text-accent transition hover:text-foreground"
                >
                  메인 정보
                </Link>
                <p className="mt-1 text-sm leading-6 text-muted">
                  신뢰점수, 운영 이력, 제보·후기 요약을 함께 확인합니다.
                </p>
              </li>
              <li className="rounded-md bg-background p-3">
                <Link
                  href={`/sites/${encodeURIComponent(slug)}/scam-reports`}
                  className="text-sm font-bold text-accent transition hover:text-foreground"
                >
                  먹튀 제보
                </Link>
                <p className="mt-1 text-sm leading-6 text-muted">
                  출금 거부, 계정 차단, 고객센터 차단 등 공개 제보를 확인합니다.
                </p>
              </li>
              <li className="rounded-md bg-background p-3">
                <Link
                  href={`/sites/${encodeURIComponent(slug)}/reviews`}
                  className="text-sm font-bold text-accent transition hover:text-foreground"
                >
                  후기
                </Link>
                <p className="mt-1 text-sm leading-6 text-muted">
                  이용자 만족도 평가와 세부 응답을 확인합니다.
                </p>
              </li>
              <li className="rounded-md bg-background p-3">
                <Link
                  href="/domains"
                  className="text-sm font-bold text-accent transition hover:text-foreground"
                >
                  전체 도메인 정보
                </Link>
                <p className="mt-1 text-sm leading-6 text-muted">
                  승인된 사이트의 대표 도메인과 추가 도메인을 목록으로 확인합니다.
                </p>
              </li>
            </ul>
          </section>
          <SiteDomainFaq context={context} />
          <ResponsibleUseNotice variant="compact" />
        </div>
      </main>
    </>
  );
}
