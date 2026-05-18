import type { Metadata } from "next";
import Link from "next/link";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import {
  getCalculatorLinks,
  toolNoticeText,
} from "@/app/tools/_components/tool-page-links";
import {
  getReportOpenGraphImage,
  getReportTwitterImage,
} from "@/app/data/social-images";
import { siteName, siteUrl } from "@/lib/config";

const title = "토토 배당 계산기 모음";
const description =
  "한국식 소수 배당 기준으로 예상 당첨금, 조합 배당, 배당 확률, 기대값을 계산할 수 있는 정보 제공용 도구 모음입니다.";
const canonical = new URL("/tools", siteUrl).toString();
const calculatorLinks = getCalculatorLinks();

export const metadata: Metadata = {
  title: {
    absolute: title,
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
    title,
    description,
    siteName,
    locale: "ko_KR",
    type: "website",
    images: [getReportOpenGraphImage("default")],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [getReportTwitterImage("default")],
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  url: canonical,
  description,
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  },
};

export default function ToolsHubPage() {
  return (
    <>
      <JsonLd value={webPageJsonLd} />
      <JsonLd
        value={buildSiteBreadcrumbJsonLd({
          items: [
            { name: "홈", url: siteUrl },
            { name: "계산기 모음", url: canonical },
          ],
        })}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            소수 배당 도구
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {description}
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {toolNoticeText}
          </p>
        </header>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            계산기 선택
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {calculatorLinks.map((item) => (
              <article
                key={item.href}
                className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
              >
                <h3 className="text-base font-bold text-foreground">
                  <Link
                    href={item.href}
                    className="transition hover:text-accent"
                  >
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  계산기 열기
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            소수 배당 계산 기준
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            이 도구 모음은 한국 토토사이트에서 많이 쓰이는 소수 배당을 기준으로
            계산합니다. 입력값은 1.50, 1.85, 2.00, 2.50 같은 decimal odds
            형식을 사용하며, 각 계산기는 입력값 변경 시 결과를 즉시 갱신합니다.
          </p>
        </section>
      </main>
    </>
  );
}
