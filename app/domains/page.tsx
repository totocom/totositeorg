import type { Metadata } from "next";
import Link from "next/link";
import { PublicDomainList } from "@/app/components/public-domain-list";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { formatDisplayDomain } from "@/app/data/domain-display";
import { getPublicSites } from "@/app/data/public-sites";
import type { ReviewTarget } from "@/app/data/sites";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

const domainsTitle = "토토사이트 주소·도메인 정보";
const domainsDescription =
  "승인된 토토사이트의 대표 주소, 추가 도메인, 운영 이력, DNS·WHOIS 정보를 사이트별로 확인할 수 있는 도메인 정보 목록입니다.";
const domainsCanonical = `${siteUrl}/domains`;

export const metadata: Metadata = {
  title: {
    absolute: domainsTitle,
  },
  description: domainsDescription,
  keywords: null,
  alternates: {
    canonical: domainsCanonical,
  },
  openGraph: {
    url: domainsCanonical,
    title: domainsTitle,
    description: domainsDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: domainsTitle,
    description: domainsDescription,
  },
};

function getSiteDomains(site: ReviewTarget) {
  return Array.from(new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]))
    .filter(Boolean);
}

function buildCollectionPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: domainsTitle,
    url: domainsCanonical,
    description: domainsDescription,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };
}

function buildDomainItemListJsonLd(sites: ReviewTarget[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "토토사이트 주소·도메인 정보 목록",
    url: domainsCanonical,
    itemListElement: sites.map((site, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${site.siteName} 주소·도메인`,
      url: new URL(
        `/sites/${encodeURIComponent(site.slug)}/domains`,
        siteUrl,
      ).toString(),
    })),
  };
}

export default async function DomainsPage() {
  const { sites, errorMessage, source } = await getPublicSites();
  const totalDomainCount = sites.reduce(
    (total, site) => total + getSiteDomains(site).length,
    0,
  );
  const representativeDomains = sites
    .map((site) => getSiteDomains(site)[0])
    .filter((domain): domain is string => Boolean(domain))
    .slice(0, 4);

  return (
    <>
      <JsonLd value={buildCollectionPageJsonLd()} />
      {sites.length > 0 ? <JsonLd value={buildDomainItemListJsonLd(sites)} /> : null}
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "도메인 정보", url: domainsCanonical },
          ],
        })}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              도메인 정보
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              토토사이트 주소·도메인 정보 목록
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              사이트별 대표 주소와 추가 도메인, 운영 이력, DNS·WHOIS 확인
              페이지를 모아 제공합니다. 각 항목을 선택하면 해당 사이트의
              주소·도메인 상세 페이지로 이동합니다.
            </p>
          </div>
          <Link
            href="/site-registration"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            사이트 등록
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">승인 사이트</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {sites.length}개
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">수집 도메인</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {totalDomainCount}개
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">확인 항목</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-foreground">
              대표 주소 · 추가 도메인 · 운영 이력 · DNS
            </p>
          </div>
        </section>

        {representativeDomains.length > 0 ? (
          <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground">
              최근 목록의 대표 도메인
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {representativeDomains.map((domain) => (
                <span
                  key={domain}
                  className="break-all rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted"
                >
                  {formatDisplayDomain(domain)}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {source === "fallback" ? (
          <p className="text-sm text-muted">
            현재 개발용 더미 데이터가 표시되고 있습니다.
          </p>
        ) : null}

        {sites.length > 0 ? (
          <PublicDomainList sites={sites} />
        ) : (
          <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">
              공개된 도메인 정보가 없습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              관리자 승인이 완료된 사이트가 있으면 이곳에 주소·도메인 정보가
              표시됩니다.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
