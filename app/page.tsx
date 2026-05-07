import type { Metadata } from "next";
import Link from "next/link";
import { HomeAboutSection } from "@/app/components/home/home-about-section";
import {
  HomeFaqSection,
  homeFaqItems,
} from "@/app/components/home/home-faq-section";
import { HomeHeroStats } from "@/app/components/home/home-hero-stats";
import { HomePopularSites } from "@/app/components/home/home-popular-sites";
import { HomeRecentReviews } from "@/app/components/home/home-recent-reviews";
import { HomeRecentScamReports } from "@/app/components/home/home-recent-scam-reports";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";
import {
  buildFaqPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { getHomePageData } from "@/app/data/public-home";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 600;

const homeTitle = "토토사이트 정보 - 후기·먹튀 제보·도메인 이력 리포트";
const homeDescription =
  "토토사이트 정보를 후기, 먹튀 제보, 도메인 이력, 신뢰점수로 비교하세요. 등록 사이트의 공개 데이터와 이용자 제보를 바탕으로 사이트별 정보를 확인할 수 있습니다.";

export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  description: homeDescription,
  keywords: null,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    url: siteUrl,
    title: homeTitle,
    description: homeDescription,
  },
  twitter: {
    card: "summary",
    title: homeTitle,
    description: homeDescription,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: homeDescription,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/sites?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: new URL("/logo-96.webp", siteUrl).toString(),
  description: homeDescription,
};

const selectionCriteria = [
  {
    title: "사이트 정보",
    desc: "대표 주소, 추가 도메인, 운영 이력, 라이선스 표기 등 공개 사이트 정보를 모아 확인합니다.",
  },
  {
    title: "먹튀 제보",
    desc: "출금 지연, 출금 거부, 계정 제한, 피해 금액 등 승인된 먹튀 제보를 기준으로 위험 신호를 봅니다.",
  },
  {
    title: "이용 후기",
    desc: "입출금 경험, 고객지원 응답, 계정 이용 제한 등 이용자 후기를 사이트별로 비교합니다.",
  },
  {
    title: "종합 분석",
    desc: "사이트 정보, 도메인 기록, 먹튀 제보, 이용 후기를 함께 묶어 판단에 필요한 맥락을 정리합니다.",
  },
];

const firstVisitSteps = [
  {
    title: "토토사이트 목록에서 사이트명을 검색합니다.",
    href: "/sites",
    label: "토토사이트 목록",
  },
  {
    title: "도메인 정보에서 대표 주소와 변경 이력을 확인합니다.",
    href: "/domains",
    label: "도메인 정보",
  },
  {
    title: "이용자 후기에서 환전, 고객센터, 이벤트 경험을 살펴봅니다.",
    href: "/reviews",
    label: "이용자 후기",
  },
  {
    title:
      "먹튀 제보에서 출금 거부, 계정 차단, 고객센터 차단 사례가 있는지 확인합니다.",
    href: "/scam-reports",
    label: "먹튀 제보",
  },
];

export default async function Home() {
  const homeData = await getHomePageData();

  return (
    <>
      <JsonLd value={websiteJsonLd} />
      <JsonLd value={organizationJsonLd} />
      <JsonLd value={buildFaqPageJsonLd(homeFaqItems)} />
      <main className="flex w-full flex-col">
        <section className="bg-[#111111] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2">
                  <picture className="shrink-0">
                    <source srcSet="/logo-96.avif" type="image/avif" />
                    <source srcSet="/logo-96.webp" type="image/webp" />
                    <img
                      src="/logo-96.webp"
                      alt="토토사이트 정보 로고"
                      width="64"
                      height="64"
                      className="neon-logo h-8 w-8 shrink-0"
                    />
                  </picture>
                  <span className="text-sm font-semibold text-white/60">
                    토토사이트 공개 정보 리포트
                  </span>
                </div>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                  토토사이트 정보 리포트: 후기·먹튀 제보·도메인 이력 비교
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                  등록 사이트의 도메인 이력, 이용자 후기, 먹튀 피해 제보,
                  신뢰점수를 한곳에서 비교합니다. 가입을 유도하지 않고 공개
                  데이터와 이용자 제보를 정보 리포트 형태로 정리합니다.
                </p>
                <div className="mt-6">
                  <HomeHeroStats stats={homeData.stats} />
                </div>
              </div>

              <form action="/sites" method="get" className="w-full lg:shrink-0">
                <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                  <label className="text-sm font-bold text-white" htmlFor="home-search">
                    사이트명 또는 도메인 검색
                  </label>
                  <div className="mt-3 flex overflow-hidden rounded-lg border border-white/20 bg-black/20 focus-within:border-accent">
                    <input
                      id="home-search"
                      name="q"
                      type="search"
                      placeholder="예: 유튜벳, h62c.com"
                      className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="shrink-0 bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
                    >
                      검색
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/sites"
                      className="text-sm font-semibold text-accent transition hover:text-accent/80"
                    >
                      전체 사이트 목록
                    </Link>
                    <Link
                      href="/reviews"
                      className="text-sm font-semibold text-white/60 transition hover:text-white"
                    >
                      이용자 후기
                    </Link>
                    <Link
                      href="/scam-reports"
                      className="text-sm font-semibold text-white/60 transition hover:text-white"
                    >
                      먹튀 제보
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          {homeData.errorMessage ? (
            <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {homeData.errorMessage}
            </section>
          ) : null}

          {homeData.source === "fallback" ? (
            <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted shadow-sm">
              현재 개발용 더미 데이터가 표시되고 있습니다.
            </p>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {selectionCriteria.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-line bg-surface p-5 shadow-sm"
              >
                <h2 className="text-base font-bold text-foreground">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{item.desc}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-lg border border-line bg-surface p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                신뢰점수 안내
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">
                신뢰점수는 비교 참고 지표입니다
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                신뢰점수는 사이트 정보를 비교하기 위한 참고 지표입니다. 점수가
                높다고 해서 안전성이 보장되는 것은 아니며, 점수가 낮다고 해서
                모든 위험이 확정되는 것도 아닙니다. 이용자 후기, 먹튀 제보,
                도메인 이력과 함께 확인하는 것이 좋습니다.
              </p>
            </article>

            <section className="rounded-lg border border-line bg-surface p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                확인 순서
              </p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">
                처음 방문했다면 이렇게 확인하세요
              </h2>
              <ol className="mt-5 grid gap-3">
                {firstVisitSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-3 rounded-md bg-background px-3 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-6 text-foreground">
                        {step.title}
                      </p>
                      <Link
                        href={step.href}
                        className="mt-1 inline-flex text-xs font-bold text-accent transition hover:text-accent/80"
                      >
                        {step.label}
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          <HomePopularSites sites={homeData.popularSites} />

          <section className="grid gap-6 lg:grid-cols-2">
            <HomeRecentScamReports reports={homeData.recentScamReports} />
            <HomeRecentReviews reviews={homeData.recentReviews} />
          </section>

          <HomeAboutSection />
          <HomeFaqSection />
          <ResponsibleUseNotice variant="card" />
        </div>
      </main>
    </>
  );
}
