import type { Metadata } from "next";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { NoVigCalculatorClient } from "@/app/tools/_components/no-vig-calculator-client";
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

const title = "북메이커 마진 계산기";
const metadataTitle = "북메이커 마진 계산기 - 소수 배당 기준";
const description =
  "2개 또는 3개 결과의 소수 배당을 입력해 암시 확률, 합산 확률, 이론상 마진과 공정 배당을 계산합니다.";
const canonical = new URL("/tools/no-vig-calculator", siteUrl).toString();

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

export default function NoVigCalculatorPage() {
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
            마진과 확률 계산
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description} 결과 수는 2개 또는 3개 중 선택할 수 있습니다.
          </p>
        </header>

        <NoVigCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            마진 계산 시 참고할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            마진과 공정 배당은 입력된 배당을 기준으로 계산한 이론값입니다.
            실제 시장 확률이나 결과를 의미하지 않으며, 특정 베팅을 권장하지
            않습니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/no-vig-calculator" />
        <ToolsHubLink />
      </main>
    </>
  );
}
