import type { Metadata } from "next";
import Link from "next/link";
import { PublicDomainList } from "@/app/components/public-domain-list";
import {
  buildFaqPageJsonLd,
  buildSiteBreadcrumbJsonLd,
  JsonLd,
  type SiteFaqItem,
} from "@/app/components/site-detail/site-json-ld";
import { formatDisplayDomain } from "@/app/data/domain-display";
import { getPublicSites } from "@/app/data/public-sites";
import type { ReviewTarget } from "@/app/data/sites";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

const domainsH1 = "토토사이트 주소 및 도메인 정보 목록";
const domainsMetaTitle =
  "토토사이트 주소와 도메인 변경 정보 확인 | Totosite.ORG";
const domainsDescription =
  "토토사이트 주소와 도메인 정보를 확인하세요. 대표 주소, 추가 도메인, 도메인 변경 이력, 운영 기간, DNS·WHOIS 확인 정보를 바탕으로 사이트별 주소 정보를 비교할 수 있습니다.";
const domainsCanonical = `${siteUrl}/domains`;
const domainListPageSize = 12;

export const metadata: Metadata = {
  title: {
    absolute: domainsMetaTitle,
  },
  description: domainsDescription,
  keywords: null,
  alternates: {
    canonical: domainsCanonical,
  },
  openGraph: {
    url: domainsCanonical,
    title: domainsMetaTitle,
    description: domainsDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: domainsMetaTitle,
    description: domainsDescription,
  },
};

const addressInfoItems = [
  {
    title: "대표 주소",
    description: "사이트별 기준으로 삼는 주요 도메인",
  },
  {
    title: "추가 도메인",
    description: "같은 사이트와 연결되어 있거나 과거·현재 함께 수집된 도메인",
  },
  {
    title: "운영 이력",
    description: "도메인이 관측된 기간 또는 등록일 기반 참고 정보",
  },
  {
    title: "최초 등록일",
    description: "도메인 정보 확인 시 참고할 수 있는 날짜",
  },
];

const domainChangeChecklist = [
  "대표 주소가 자주 바뀌는지 확인하기",
  "추가 도메인이 갑자기 늘어났는지 확인하기",
  "최초 등록일이 너무 최근인지 확인하기",
  "운영 이력이 짧은 사이트는 다른 정보도 함께 확인하기",
  "동일 사이트에 먹튀 제보가 있는지 확인하기",
  "사이트 상세 리뷰와 토토사이트 후기도 함께 확인하기",
  "도메인 정보만으로 안전성을 단정하지 않기",
];

const relatedLinks = [
  {
    href: "/sites",
    title: "사이트 상세 리뷰",
    description: "사이트별 기본 정보, 도메인, 후기, 먹튀 제보를 한 번에 확인",
  },
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
    href: "/site-registration",
    title: "사이트 등록",
    description: "아직 등록되지 않은 사이트를 제보하거나 등록 요청",
  },
];

const domainFaqItems: SiteFaqItem[] = [
  {
    question: "토토사이트 주소 정보는 무엇을 기준으로 확인하나요?",
    answer:
      "대표 주소, 추가 도메인, 최초 등록일, 운영 이력, DNS·WHOIS 정보 등을 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "추가 도메인이 많으면 위험한 사이트인가요?",
    answer:
      "추가 도메인이 많다고 해서 무조건 위험하다고 볼 수는 없습니다. 다만 도메인 변경이 잦거나 운영 이력이 짧다면 사이트 상세 리뷰와 먹튀 제보도 함께 확인해야 합니다.",
  },
  {
    question: "도메인 운영 이력이 길면 안전한 사이트인가요?",
    answer:
      "운영 이력이 길다는 점은 참고 자료가 될 수 있지만, 안전성을 보장하지는 않습니다. 이용자 후기와 피해 제보를 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "WHOIS 정보는 왜 확인하나요?",
    answer:
      "WHOIS 정보는 도메인의 등록일, 등록기관, 만료일 등을 확인할 수 있는 기술적 참고 자료입니다. 단, 개인정보 보호 설정으로 일부 정보가 비공개일 수 있습니다.",
  },
  {
    question: "토토사이트 주소만 보고 이용 여부를 판단해도 되나요?",
    answer:
      "아닙니다. 주소 정보는 참고 자료일 뿐이며, 사이트 상세 리뷰, 토토사이트 후기, 먹튀 제보를 함께 확인해야 더 균형 있게 판단할 수 있습니다.",
  },
];

function getSiteDomains(site: ReviewTarget) {
  return Array.from(new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]))
    .filter(Boolean);
}

function getOldestDomainTime(site: ReviewTarget) {
  if (!site.oldestDomainCreationDate) return Number.POSITIVE_INFINITY;

  const time = new Date(site.oldestDomainCreationDate).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function getInitialDomainListSites(sites: ReviewTarget[]) {
  return [...sites]
    .sort((first, second) => getOldestDomainTime(first) - getOldestDomainTime(second))
    .slice(0, domainListPageSize);
}

function buildCollectionPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: domainsH1,
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
  const visibleSites = getInitialDomainListSites(sites);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "토토사이트 주소·도메인 정보 목록",
    url: domainsCanonical,
    itemListElement: visibleSites.map((site, index) => ({
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
      <JsonLd value={buildFaqPageJsonLd(domainFaqItems)} />
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
              {domainsH1}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              토토사이트 주소와 도메인 정보를 사이트별로 확인할 수 있는
              목록입니다. 대표 주소, 추가 도메인, 도메인 변경 이력, 운영
              기간, 최초 등록일, DNS·WHOIS 확인 정보를 함께 살펴보고 사이트
              상세 리뷰와 먹튀 제보도 함께 비교해보세요.
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

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 주소와 도메인 정보를 확인해야 하는 이유
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            토토사이트 주소와 도메인 정보는 사이트를 비교할 때 참고할 수 있는
            기본 자료입니다. 대표 주소뿐 아니라 추가 도메인, 도메인 변경 이력,
            운영 기간, 최초 등록일을 함께 확인하면 사이트의 운영 흐름을 더
            구체적으로 살펴볼 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            다만 주소 정보만으로 사이트의 안전성을 단정할 수는 없습니다.
            도메인 정보는{" "}
            <Link
              href="/sites"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              사이트 상세 리뷰
            </Link>
            ,{" "}
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
            </Link>
            와 함께 비교해서 판단하는 것이 좋습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            대표 주소와 추가 도메인의 차이
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            대표 주소는 현재 사이트 정보에서 기준으로 삼는 주요 도메인입니다.
            추가 도메인은 같은 사이트와 연결되어 있거나 과거·현재 함께 수집된
            관련 도메인입니다. 추가 도메인이 많다고 해서 무조건 좋은 것도,
            나쁜 것도 아니므로 도메인 수, 변경 이력, 운영 기간을 함께 봐야
            합니다.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {addressInfoItems.map((item) => (
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
            도메인 변경 이력을 볼 때 체크할 점
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {domainChangeChecklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            DNS·WHOIS 정보는 무엇을 의미하나요?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            DNS 정보는 도메인이 어떤 서버나 네트워크 설정과 연결되는지
            확인하는 참고 자료입니다. WHOIS 정보는 도메인 등록일, 등록기관,
            만료일 등을 확인할 수 있는 기술적 자료입니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            일부 도메인은 개인정보 보호 설정으로 상세 등록자 정보가 보이지
            않을 수 있습니다. DNS·WHOIS 정보는 사이트 신뢰도를 단독으로
            보장하지 않으므로 다른 공개 정보와 함께 확인해야 합니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 주소 정보 확인 시 주의할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            주소가 존재한다고 해서 안전한 사이트라는 뜻은 아닙니다. 도메인
            운영 기간이 길어도 이용자 후기와 먹튀 제보를 함께 확인해야 하며,
            토토사이트 신규 주소처럼 운영 이력이 짧은 도메인은 추가 확인이
            필요합니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            유사 도메인이나 사칭 도메인 가능성도 주의해야 합니다. 개인정보
            입력이나 금전 거래 전에는 대표 주소, 추가 도메인, 사이트 상세
            리뷰, 피해 제보를 충분히 비교해보는 것이 좋습니다.
          </p>
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
            토토사이트 주소·도메인 정보 FAQ
          </h2>
          <div className="mt-4 divide-y divide-line">
            {domainFaqItems.map((item) => (
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
