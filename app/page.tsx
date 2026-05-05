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
import {
  buildFaqPageJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { getHomePageData } from "@/app/data/public-home";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const revalidate = 600;

const homeTitle = `${siteName} - 안전한 토토사이트 순위 및 이용 후기`;

export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  description: siteDescription,
  keywords: null,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    url: siteUrl,
    title: homeTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: homeTitle,
    description: siteDescription,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
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
  description: siteDescription,
};

const selectionCriteria = [
  {
    title: "라이선스 표기",
    desc: "MGA, UKGC, Curacao 등 공개 라이선스와 운영 주체 표기를 확인합니다.",
  },
  {
    title: "입출금 이력",
    desc: "출금 지연, 출금 거부, 금액 미상 피해 제보가 누적되는지 봅니다.",
  },
  {
    title: "고객지원",
    desc: "문의 채널, 응답 속도, 계정 제한 관련 이용자 경험을 함께 봅니다.",
  },
  {
    title: "도메인 기록",
    desc: "대표 주소, 추가 도메인, DNS와 WHOIS 기반 운영 이력을 분리합니다.",
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
                  안전한 토토사이트,
                  <br />
                  <span className="text-accent">실제 후기로 확인하세요</span>
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

          <HomePopularSites sites={homeData.popularSites} />

          <section className="grid gap-6 lg:grid-cols-2">
            <HomeRecentScamReports reports={homeData.recentScamReports} />
            <HomeRecentReviews reviews={homeData.recentReviews} />
          </section>

          <HomeAboutSection />
          <HomeFaqSection />
        </div>
      </main>
    </>
  );
}
