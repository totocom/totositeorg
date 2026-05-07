import type { Metadata } from "next";
import Link from "next/link";
import { SiteBrowser } from "@/app/components/site-browser";
import {
  buildFaqPageJsonLd,
  JsonLd,
  type SiteFaqItem,
} from "@/app/components/site-detail/site-json-ld";
import { formatDisplayDomain } from "@/app/data/domain-display";
import { getPublicSites } from "@/app/data/public-sites";
import type { ReviewTarget } from "@/app/data/sites";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

const sitesH1 = "토토사이트 목록과 사이트별 정보 비교";
const sitesMetaTitle = "토토사이트 목록과 리뷰·먹튀 제보 비교 | Totosite.ORG";
const sitesDescription =
  "토토사이트 목록을 검색하고 사이트별 정보를 비교하세요. 신뢰 점수, 운영 이력, 이용자 리뷰, 먹튀 제보, 도메인 정보를 함께 확인할 수 있습니다.";
const sitesCanonical = `${siteUrl}/sites`;
const siteListPageSize = 12;

export const metadata: Metadata = {
  title: {
    absolute: sitesMetaTitle,
  },
  description: sitesDescription,
  keywords: null,
  alternates: {
    canonical: sitesCanonical,
  },
  openGraph: {
    url: sitesCanonical,
    title: sitesMetaTitle,
    description: sitesDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: sitesMetaTitle,
    description: sitesDescription,
  },
};

const comparisonItems = [
  {
    title: "신뢰 점수",
    description:
      "사이트 정보, 운영 이력, 리뷰, 제보 등 여러 요소를 바탕으로 참고할 수 있는 비교 지표",
  },
  {
    title: "운영 이력",
    description:
      "사이트가 관측된 기간이나 도메인 운영 흐름을 확인하는 참고 정보",
  },
  {
    title: "이용자 리뷰",
    description:
      "실제 이용자가 남긴 만족도 평가와 경험을 확인할 수 있는 정보",
  },
  {
    title: "먹튀 제보",
    description:
      "출금 거부, 출금 지연, 계정 차단 등 피해 가능성이 있는 제보를 확인하는 정보",
  },
  {
    title: "도메인 정보",
    description:
      "대표 주소, 추가 도메인, 도메인 변경 이력, DNS·WHOIS 정보를 확인하는 자료",
  },
  {
    title: "사이트 상세 리뷰",
    description:
      "개별 사이트의 화면 구성, 주요 정보, 후기, 제보, 도메인 정보를 종합적으로 확인하는 페이지",
  },
];

const searchGuideItems = [
  "사이트명을 알고 있으면 검색 먼저 사용하기",
  "운영 이력이 긴 사이트와 짧은 사이트를 비교하기",
  "리뷰 수와 신뢰 점수를 함께 확인하기",
  "먹튀 제보가 있는 사이트는 상세 내용을 확인하기",
  "대표 주소와 도메인 정보도 함께 확인하기",
];

const detailReviewItems = [
  "사이트 기본 정보",
  "대표 주소와 도메인 정보",
  "화면 구성과 관측 정보",
  "이용자 리뷰",
  "먹튀 제보",
  "운영 이력",
  "FAQ 또는 관련 안내",
];

const relatedLinks = [
  {
    href: "/reviews",
    title: "토토사이트 후기",
    description:
      "이용자 만족도 평가, 환전 후기, 고객센터 후기, 이벤트 후기 등을 확인",
  },
  {
    href: "/scam-reports",
    title: "먹튀 제보",
    description: "출금 거부, 출금 지연, 계정 차단 등 피해 제보를 확인",
  },
  {
    href: "/domains",
    title: "토토사이트 주소",
    description: "대표 주소, 추가 도메인, 도메인 변경 이력, DNS·WHOIS 정보를 확인",
  },
  {
    href: "/site-registration",
    title: "사이트 등록",
    description: "아직 등록되지 않은 사이트를 제보하거나 등록 요청",
  },
];

const sitesFaqItems: SiteFaqItem[] = [
  {
    question: "토토사이트 목록은 어떤 기준으로 확인해야 하나요?",
    answer:
      "사이트명만 보는 것보다 신뢰 점수, 운영 이력, 이용자 리뷰, 먹튀 제보, 도메인 정보를 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "신뢰 점수가 높으면 안전한 사이트인가요?",
    answer:
      "신뢰 점수는 참고 지표일 뿐이며 안전성을 보장하지 않습니다. 리뷰, 먹튀 제보, 운영 이력, 도메인 정보를 함께 확인해야 합니다.",
  },
  {
    question: "리뷰가 없는 사이트는 어떻게 봐야 하나요?",
    answer:
      "리뷰가 없는 사이트는 이용자 경험 데이터가 부족하다는 의미일 수 있습니다. 운영 이력, 도메인 정보, 먹튀 제보 여부를 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "먹튀 신고가 없는 사이트는 안전한가요?",
    answer:
      "먹튀 신고가 없다고 해서 안전이 보장되는 것은 아닙니다. 공개된 제보가 없을 뿐일 수 있으므로 사이트 상세 리뷰와 다른 정보도 함께 확인해야 합니다.",
  },
  {
    question: "사이트 상세 리뷰에서는 무엇을 볼 수 있나요?",
    answer:
      "사이트 상세 리뷰에서는 사이트 기본 정보, 대표 주소, 도메인 정보, 이용자 후기, 먹튀 제보, 운영 이력 등을 더 자세히 확인할 수 있습니다.",
  },
];

function buildDomainSearchText(site: ReviewTarget) {
  const domains = Array.from(new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]))
    .filter(Boolean)
    .slice(0, 6);

  const searchText = domains
    .flatMap((domain) => [
      domain,
      formatDisplayDomain(domain),
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

function getSiteSearchText(site: ReviewTarget) {
  return [
    site.siteName,
    site.siteUrl,
    ...site.domains,
    site.category,
    site.shortDescription,
    site.licenseInfo,
    ...(site.resolvedIps ?? []),
    site.domainSearchText ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function getInitialVisibleSites(sites: ReviewTarget[], initialQuery: string) {
  const normalizedQuery = initialQuery.trim().toLowerCase();

  return sites
    .filter((site) => {
      if (!normalizedQuery) return true;

      return getSiteSearchText(site).includes(normalizedQuery);
    })
    .slice(0, siteListPageSize);
}

function buildCollectionPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: sitesH1,
    url: sitesCanonical,
    description: sitesDescription,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };
}

function buildSiteItemListJsonLd(sites: ReviewTarget[], initialQuery: string) {
  const visibleSites = getInitialVisibleSites(sites, initialQuery);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "토토사이트 목록",
    url: sitesCanonical,
    itemListElement: visibleSites.map((site, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: site.siteName,
      url: new URL(`/sites/${encodeURIComponent(site.slug)}`, siteUrl).toString(),
    })),
  };
}

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialQuery =
    firstSearchParam(params.search) || firstSearchParam(params.q);
  const { sites, errorMessage, source } = await getPublicSites();
  const searchableSites = sites.map(buildDomainSearchText);

  return (
    <>
      <JsonLd value={buildCollectionPageJsonLd()} />
      {searchableSites.length > 0 ? (
        <JsonLd value={buildSiteItemListJsonLd(searchableSites, initialQuery)} />
      ) : null}
      <JsonLd value={buildFaqPageJsonLd(sitesFaqItems)} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              사이트 목록
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {sitesH1}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              등록된 토토사이트 목록을 검색하고 사이트별 정보를 비교할 수
              있는 페이지입니다. 신뢰 점수, 운영 이력, 이용자 리뷰, 먹튀
              제보, 도메인 정보를 함께 확인하고 사이트 상세 리뷰를 통해 더
              자세한 내용을 살펴보세요.
            </p>
          </div>
          <Link
            href="/site-registration"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            사이트 등록
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

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 목록을 비교할 때 확인할 정보
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            토토사이트 목록을 확인할 때는 사이트명이나 대표 주소만 보는
            것보다 신뢰 점수, 운영 이력, 이용자 리뷰, 먹튀 제보 여부를 함께
            비교하는 것이 좋습니다. 같은 사이트라도 리뷰 수, 운영 기간, 도메인
            변경 이력, 피해 제보 여부에 따라 참고해야 할 정보가 달라질 수
            있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            이 페이지의 정보는 사이트를 판단하기 위한 참고 자료이며, 특정
            사이트 이용을 보장하거나 권장하는 내용은 아닙니다. 자세한 내용은
            각{" "}
            <Link
              href="/sites"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              사이트 상세 리뷰
            </Link>
            와{" "}
            <Link
              href="/reviews"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              토토사이트 후기
            </Link>
            ,{" "}
            <Link
              href="/scam-reports"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              먹튀 제보
            </Link>{" "}
            페이지를 함께 확인해보세요.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            사이트별 비교 항목 안내
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {comparisonItems.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-line bg-background p-4"
              >
                <h3 className="text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            검색과 정렬 기능 활용 방법
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            사이트명을 알고 있다면 검색으로 빠르게 찾을 수 있습니다. 정렬은
            최신 등록순, 운영 이력 오래된순, 이름순, 리뷰 많은순, 신뢰 점수
            높은순, 먹튀 건수 많은순 등으로 바꿔 볼 수 있습니다. 정렬 결과는
            참고용이며, 하나의 기준만 보고 판단하지 않는 것이 좋습니다.
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {searchGuideItems.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            신뢰 점수는 어떻게 봐야 하나요?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            신뢰 점수는 사이트별 정보를 비교하기 위한 참고 지표입니다. 점수가
            높다고 해서 안전성이 보장되는 것은 아니며, 점수가 낮다고 해서 모든
            위험이 확정되는 것도 아닙니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            신뢰 점수는 이용자 리뷰, 먹튀 제보, 운영 이력, 도메인 정보와 함께
            확인하는 것이 좋습니다. 특히 리뷰 수가 적거나 운영 이력이 짧은
            사이트는 추가 정보를 함께 확인해야 합니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            사이트 상세 리뷰에서 확인할 수 있는 정보
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            목록 페이지에서는 요약 정보를 확인하고, 상세 페이지에서는 개별
            사이트의 더 많은 정보를 확인할 수 있습니다.
          </p>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {detailReviewItems.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            함께 확인하면 좋은 페이지
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {relatedLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
              >
                <h3 className="text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 목록 FAQ
          </h2>
          <div className="mt-4 divide-y divide-line">
            {sitesFaqItems.map((item) => (
              <article key={item.question} className="py-4 first:pt-0 last:pb-0">
                <h3 className="text-base font-bold text-foreground">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
