import type { Metadata } from "next";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { HedgeCalculatorClient } from "@/app/tools/_components/hedge-calculator-client";
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

const title = "헤지 계산기";
const metadataTitle = "헤지 계산기 - 결과별 손익 비교";
const description =
  "기존 베팅 금액과 배당, 반대 결과 배당을 입력해 결과별 예상 손익을 비교하는 정보 제공용 계산기입니다.";
const canonical = new URL("/tools/hedge-calculator", siteUrl).toString();

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

export default function HedgeCalculatorPage() {
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
            결과별 손익 비교
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description} 자동 균등 지급 계산 모드와 직접 반대 베팅 금액 입력
            모드를 선택할 수 있습니다.
          </p>
        </header>

        <HedgeCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            헤지 계산 시 참고할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            헤지 계산은 결과별 손익을 비교하기 위한 이론 계산입니다. 실제 체결
            가능성, 배당 변동, 사이트 규정, 경기 결과에 따라 실제 손익은 달라질
            수 있습니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/hedge-calculator" />
        <ToolsHubLink />
      </main>
    </>
  );
}
