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
import { formatDisplayUrl } from "@/app/data/domain-display";
import { getSiteDomainsDetail } from "@/app/data/public-site-detail";
import { isSitePageSplitEnabled } from "@/app/data/site-page-split-flags";
import {
  buildDomainsSiteTitle,
  buildDomainsTitleSuffix,
  buildSiteDomainsMetadata,
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

function formatDate(value: string | null) {
  if (!value) return "확인 불가";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "확인 불가";
  return date.toLocaleDateString("ko-KR");
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
  const { common, domains } = detail;
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
  const oldestDomainAge = site.oldestDomainCreationDate
    ? context.operatingPeriod
    : null;
  const title = buildDomainsSiteTitle(
    site.siteName,
    buildDomainsTitleSuffix(domains.length, oldestDomainAge),
  );
  const description = `${site.siteName} 토토사이트의 대표 주소(${context.representativeDomain})와 추가 도메인 ${Math.max(0, domains.length - 1)}개, DNS와 WHOIS 조회 정보를 정리했습니다.`;
  const domainInfoItems = domains.map((domain) => ({
    siteId: site.id,
    siteName: site.siteName,
    domainUrl: domain.domainUrl,
    displayDomain: domain.displayDomain,
    domainAge: domain.domainAge,
    whoisInfo: null,
    dnsInfo: null,
    isLoaded: false,
  }));

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
            { name: "주소·도메인", url: canonical },
          ],
        })}
      />
      <JsonLd value={buildFaqPageJsonLd(faqItems)} />
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeaderCommon common={common} activeTab="domains" splitEnabled />

        <div className="mt-5 grid gap-5">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              주소·도메인
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {site.siteName} 도메인 {domains.length}개
            </h2>
            <p className="mt-2 break-all text-sm leading-6 text-muted">
              대표 주소는 {formatDisplayUrl(site.siteUrl)}이며, 추가 도메인은
              관리자 등록 정보와 공개 관측 값을 기준으로 표시합니다.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            {domains.map((domain, index) => (
              <article
                key={domain.domain}
                className="rounded-lg border border-line bg-surface p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {index === 0 ? "대표 도메인" : "추가 도메인"}
                </p>
                <h3 className="mt-1 break-all text-base font-bold text-foreground">
                  {domain.displayDomain}
                </h3>
                <dl className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-md bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      운영 이력
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {domain.domainAge}
                    </dd>
                  </div>
                  <div className="rounded-md bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      최초 등록일
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {formatDate(domain.creationDate)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          <DomainInfoTabs items={domainInfoItems} />
          <SiteDomainFaq context={context} />
          <ResponsibleUseNotice variant="card" />
        </div>
      </main>
    </>
  );
}
