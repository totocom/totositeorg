import type { Metadata } from "next";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { ImpliedProbabilityCalculatorClient } from "@/app/tools/_components/implied-probability-calculator-client";
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

const title = "배당 확률 계산기";
const metadataTitle = "배당 확률 계산기 - 소수 배당을 확률로 변환";
const description =
  "소수 배당을 입력해 암시 확률을 계산하는 정보 제공용 계산기입니다.";
const canonical = new URL(
  "/tools/implied-probability-calculator",
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

export default function ImpliedProbabilityCalculatorPage() {
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
            소수 배당 확률 변환
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description} 예를 들어 배당 2.00은 50%, 1.50은 약 66.7%,
            2.50은 40%로 환산됩니다.
          </p>
        </header>

        <ImpliedProbabilityCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            암시 확률을 해석할 때
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            암시 확률은 소수 배당을 이론상 확률로 환산한 값입니다. 실제 경기나
            이벤트의 결과 확률을 뜻하지 않으며, 배당 산정 방식과 마진의 영향을
            받을 수 있습니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/implied-probability-calculator" />
        <ToolsHubLink />
      </main>
    </>
  );
}
