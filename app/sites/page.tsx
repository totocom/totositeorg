import type { Metadata } from "next";
import Link from "next/link";
import { domainToUnicode } from "node:url";
import { SiteBrowser } from "@/app/components/site-browser";
import { getPublicSites } from "@/app/data/public-sites";
import type { ReviewTarget } from "@/app/data/sites";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "사이트 목록",
  description:
    "관리자가 등록하고 승인한 토토사이트 목록을 검색하고 카테고리별로 확인하세요.",
  alternates: {
    canonical: `${siteUrl}/sites`,
  },
  openGraph: {
    url: `${siteUrl}/sites`,
    title: `사이트 목록 | ${siteName}`,
    description: siteDescription,
  },
};

function formatSearchDomain(value: string) {
  try {
    const url = new URL(value);
    return domainToUnicode(url.hostname) || url.hostname;
  } catch {
    return domainToUnicode(value) || value;
  }
}

function buildDomainSearchText(site: ReviewTarget) {
  const domains = Array.from(new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]))
    .filter(Boolean)
    .slice(0, 6);

  const searchText = domains
    .flatMap((domain) => [
      domain,
      formatSearchDomain(domain),
    ])
    .filter(Boolean)
    .join(" ");

  return {
    ...site,
    domainSearchText: searchText,
  };
}

type SitesPageProps = {
  searchParams?: Promise<{
    search?: string | string[];
    q?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialQuery =
    firstSearchParam(params.search) || firstSearchParam(params.q);
  const { sites, errorMessage, source } = await getPublicSites();
  const searchableSites = sites.map(buildDomainSearchText);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-accent">
            사이트 목록
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            등록된 토토사이트를 검색하고 비교하세요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            관리자가 등록하고 승인한 사이트만 표시됩니다. 사이트별 상세
            정보와 이용자 만족도 평가를 함께 확인할 수 있습니다.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
        >
          홈으로
        </Link>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </section>
      ) : null}

      {sites.length === 0 ? (
        <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            공개된 토토사이트 정보가 없습니다
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            관리자 승인이 완료된 사이트가 있으면 이곳에 표시됩니다.
          </p>
        </section>
      ) : null}

      {source === "fallback" ? (
        <p className="text-sm text-muted">
          현재 개발용 더미 데이터가 표시되고 있습니다.
        </p>
      ) : null}

      <SiteBrowser sites={searchableSites} initialQuery={initialQuery} />
    </main>
  );
}
