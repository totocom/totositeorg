import type { Metadata } from "next";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { ExpectedValueCalculatorClient } from "@/app/tools/_components/expected-value-calculator-client";
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

const title = "기대값 계산기";
const metadataTitle = "기대값 계산기 - 소수 배당 기준";
const description =
  "베팅 금액, 소수 배당, 예상 적중 확률을 입력해 이론상 기대값을 계산하는 정보 제공용 계산기입니다.";
const canonical = new URL(
  "/tools/expected-value-calculator",
  siteUrl,
).toString();

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

export default function ExpectedValueCalculatorPage() {
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
            소수 배당 기대값
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description} 예상 적중 확률은 사용자가 직접 입력한 값을 기준으로만
            계산됩니다.
          </p>
        </header>

        <ExpectedValueCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            기대값 계산의 한계
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            기대값은 입력한 예상 적중 확률을 기준으로 한 이론값입니다. 예상
            확률이 달라지면 계산 결과도 크게 달라질 수 있으며, 실제 결과나
            지급 여부를 판단하는 기준으로 단정해서는 안 됩니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/expected-value-calculator" />
        <ToolsHubLink />
      </main>
    </>
  );
}
