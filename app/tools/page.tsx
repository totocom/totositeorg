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

const h1Title = "토토 배당 계산기 모음";
const metadataTitle = "토토 배당 계산기 모음 - 소수 배당·예상 당첨금 계산";
const description =
  "소수 배당 기준으로 예상 당첨금, 조합 배당, 배당 확률, 기대값, 헤지 금액, 북메이커 마진을 계산할 수 있는 정보 제공용 도구 모음입니다.";
const introDescription =
  "토토 배당 계산기 모음은 한국식 소수 배당 기준으로 예상 당첨금, 조합 배당, 배당 확률, 기대값, 결과별 손익, 북메이커 마진을 계산할 수 있는 정보 제공용 도구입니다. 각 계산기는 별도 페이지에서 직접 숫자를 입력해 결과를 확인할 수 있습니다.";
const canonical = new URL("/tools", siteUrl).toString();
const calculatorLinks = getCalculatorLinks();

const relatedLinks = [
  {
    href: "/sites",
    title: "토토사이트 목록",
    description:
      "등록된 사이트의 신뢰 점수, 후기, 먹튀 제보, 도메인 정보를 비교할 수 있습니다.",
  },
  {
    href: "/reviews",
    title: "토토사이트 후기",
    description: "이용자 만족도 평가와 실제 이용 경험을 확인할 수 있습니다.",
  },
  {
    href: "/scam-reports",
    title: "먹튀 제보",
    description:
      "출금 거부, 출금 지연, 계정 차단 등 공개 제보를 확인할 수 있습니다.",
  },
  {
    href: "/domains",
    title: "토토사이트 주소·도메인",
    description:
      "대표 도메인, 추가 도메인, 도메인 변경 이력을 확인할 수 있습니다.",
  },
];

const faqItems = [
  {
    question: "소수 배당은 어떻게 계산하나요?",
    answer:
      "소수 배당은 베팅 금액에 배당을 곱해 예상 지급액을 계산합니다. 예를 들어 10,000원에 배당 2.50을 입력하면 예상 지급액은 25,000원입니다.",
  },
  {
    question: "조합 배당은 어떻게 계산하나요?",
    answer:
      "선택한 각 배당을 모두 곱해 조합 배당을 계산합니다. 예를 들어 1.80과 2.00을 조합하면 조합 배당은 3.60입니다.",
  },
  {
    question: "암시 확률은 실제 적중 확률인가요?",
    answer:
      "아닙니다. 암시 확률은 배당을 확률로 환산한 이론값이며 실제 결과 확률을 의미하지 않습니다.",
  },
  {
    question: "기대값 계산기는 수익을 보장하나요?",
    answer:
      "아닙니다. 기대값은 사용자가 입력한 예상 적중 확률을 기준으로 계산한 이론값이며 실제 수익을 보장하지 않습니다.",
  },
  {
    question: "이 계산기는 특정 사이트 이용을 권장하나요?",
    answer:
      "아닙니다. 본 계산기는 정보 제공용 도구이며 특정 사이트 이용이나 도박 참여를 권장하지 않습니다.",
  },
];

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
  "@type": "CollectionPage",
  name: h1Title,
  url: canonical,
  description,
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  },
};

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: calculatorLinks.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.title,
    description: item.description,
    url: new URL(item.href, siteUrl).toString(),
  })),
};

export default function ToolsHubPage() {
  return (
    <>
      <JsonLd value={webPageJsonLd} />
      <JsonLd value={itemListJsonLd} />
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
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {h1Title}
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {introDescription}
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
                  {item.ctaText}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            소수 배당 계산기란?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            소수 배당 계산기는 1.50, 1.85, 2.00, 2.50처럼 표시되는
            배당을 기준으로 예상 지급액, 예상 수익, 암시 확률 등을 계산하는
            도구입니다. 한국 토토사이트나 스포츠·카지노 관련 배당 표기에서는
            소수 배당 방식이 자주 사용되며, 베팅 금액에 배당을 곱하면 예상
            지급액을 계산할 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            예를 들어 10,000원에 배당 2.50을 입력하면 예상 지급액은
            25,000원이고, 예상 수익은 15,000원입니다. 다만 계산 결과는 단순
            수학적 결과일 뿐 실제 결과나 수익을 보장하지 않습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            계산기별 사용 목적
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            각 계산기는 서로 다른 상황에서 사용할 수 있습니다. 예상 당첨금
            계산기는 단일 배당의 지급액을 확인할 때, 조합 배당 계산기는 여러
            배당을 곱한 결과를 확인할 때 적합합니다. 배당 확률 계산기는 소수
            배당을 이론상 확률로 바꿔볼 때 사용할 수 있고, 기대값 계산기는
            사용자가 입력한 예상 적중 확률을 기준으로 손익 구조를 확인할 때
            사용할 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            헤지 계산기, 북메이커 마진 계산기, 배당 차이 계산기는 결과별
            손익이나 배당 구조를 비교하기 위한 도구입니다. 이 계산기들은 실제
            결과를 약속하는 기능이 아니라 입력값을 기준으로 한 참고 계산입니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            소수 배당 계산 공식
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            소수 배당의 기본 공식은 간단합니다.
          </p>
          <div className="mt-3 space-y-2 rounded-md border border-line bg-background p-4 text-sm font-semibold leading-6 text-foreground">
            <p>예상 지급액 = 베팅 금액 × 배당</p>
            <p>예상 수익 = 예상 지급액 - 베팅 금액</p>
            <p>암시 확률 = 1 ÷ 배당 × 100</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            예를 들어 배당 2.00은 암시 확률 50%, 배당 1.50은 약 66.7%,
            배당 2.50은 40%로 계산됩니다. 암시 확률은 배당을 확률로 변환한
            이론값이며 실제 결과 확률을 의미하지 않습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            계산 결과를 볼 때 주의할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            계산 결과는 입력한 배당과 금액을 기준으로 한 이론값입니다. 실제
            경기 결과, 배당 변동, 사이트 규정, 취소·무효 처리, 이용 조건에
            따라 실제 결과는 달라질 수 있습니다. 따라서 계산 결과만으로 이용
            여부를 결정하지 말고, 도메인 정보, 이용자 후기, 먹튀 제보, 사이트
            상세 정보를 함께 확인하는 것이 좋습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            함께 확인하면 좋은 페이지
          </h2>
          <div className="mt-4 divide-y divide-line">
            {relatedLinks.map((item) => (
              <article key={item.href} className="py-4 first:pt-0 last:pb-0">
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
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토 배당 계산기 FAQ
          </h2>
          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="text-base font-bold text-foreground">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
