import type { Metadata } from "next";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { OddsDifferenceCalculatorClient } from "@/app/tools/_components/odds-difference-calculator-client";
import {
  CalculatorLinkGrid,
  ToolNotice,
  ToolsHubLink,
} from "@/app/tools/_components/tool-page-links";
import {
  getReportOpenGraphImage,
  getReportTwitterImage,
} from "@/app/data/social-images";
import { siteName, siteUrl } from "@/lib/config";

const title = "배당 차이 계산기";
const metadataTitle = "배당 차이 계산기 - 소수 배당 기준";
const description =
  "서로 다른 결과의 소수 배당과 총 계산 금액을 입력해 결과별 배분 금액과 이론상 손익을 비교합니다.";
const canonical = new URL("/tools/odds-difference-calculator", siteUrl).toString();

export const metadata: Metadata = {
  title: {
    absolute: metadataTitle,
  },
  description,
  keywords: null,
  alternates: {
    canonical,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    url: canonical,
    title: metadataTitle,
    description,
    siteName,
    locale: "ko_KR",
    type: "website",
    images: [getReportOpenGraphImage("default")],
  },
  twitter: {
    card: "summary_large_image",
    title: metadataTitle,
    description,
    images: [getReportTwitterImage("default")],
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  url: canonical,
  description,
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  },
};

export default function OddsDifferenceCalculatorPage() {
  return (
    <>
      <JsonLd value={webPageJsonLd} />
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "계산기 모음", url: new URL("/tools", siteUrl).toString() },
            { name: title, url: canonical },
          ],
        })}
      />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            이론상 배당 차이 비교
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description} 처음 구현은 2개 결과 기준으로 계산합니다.
          </p>
        </header>

        <OddsDifferenceCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            배당 차이 계산 시 참고할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            배당 차이 계산은 입력값을 기준으로 한 이론값입니다. 실제 체결
            가능성, 배당 변동, 규정에 따라 결과는 달라질 수 있습니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/odds-difference-calculator" />
        <ToolsHubLink />
      </main>
    </>
  );
}
