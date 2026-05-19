import type { Metadata } from "next";
import Link from "next/link";
import {
  buildSiteBreadcrumbJsonLd,
  JsonLd,
} from "@/app/components/site-detail/site-json-ld";
import { PayoutCalculatorClient } from "@/app/tools/_components/payout-calculator-client";
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

const title = "예상 당첨금 계산기";
const metadataTitle = "예상 당첨금 계산기 - 소수 배당 기준";
const description =
  "베팅 금액과 소수 배당을 입력해 예상 지급액과 예상 수익을 계산하는 정보 제공용 계산기입니다.";
const canonical = new URL("/tools/payout-calculator", siteUrl).toString();
const introDescription =
  "베팅 금액과 소수 배당을 입력하면 예상 지급액과 예상 수익을 계산할 수 있습니다. 이 계산기는 한국식 소수 배당 기준의 정보 제공용 도구이며, 계산 결과는 실제 결과나 수익을 보장하지 않습니다.";

const relatedPages = [
  {
    href: "/sites",
    title: "토토사이트 목록 보기",
    description:
      "등록된 사이트의 신뢰 점수, 후기, 먹튀 제보, 도메인 정보를 비교할 수 있습니다.",
  },
  {
    href: "/reviews",
    title: "이용자 후기 확인",
    description: "승인된 이용자 후기와 만족도 평가를 확인할 수 있습니다.",
  },
  {
    href: "/scam-reports",
    title: "먹튀 제보 확인",
    description:
      "출금 거부, 출금 지연, 계정 차단 등 공개 제보를 확인할 수 있습니다.",
  },
  {
    href: "/domains",
    title: "도메인 정보 확인",
    description:
      "대표 도메인, 추가 도메인, 도메인 변경 이력을 확인할 수 있습니다.",
  },
];

const faqItems = [
  {
    question: "예상 당첨금은 어떻게 계산하나요?",
    answer:
      "예상 당첨금은 베팅 금액에 소수 배당을 곱해 계산합니다. 예를 들어 10,000원에 배당 2.50을 입력하면 예상 지급액은 25,000원입니다.",
  },
  {
    question: "예상 지급액과 예상 수익은 무엇이 다른가요?",
    answer:
      "예상 지급액은 베팅 금액을 포함한 전체 금액이고, 예상 수익은 예상 지급액에서 베팅 금액을 뺀 금액입니다.",
  },
  {
    question: "소수 배당 2.00은 어떤 의미인가요?",
    answer:
      "소수 배당 2.00은 입력한 베팅 금액의 2배가 예상 지급액으로 계산된다는 뜻입니다. 10,000원을 입력하면 예상 지급액은 20,000원입니다.",
  },
  {
    question: "계산 결과는 실제 수익을 보장하나요?",
    answer:
      "아닙니다. 계산 결과는 입력값을 기준으로 한 이론값이며 실제 결과나 수익을 보장하지 않습니다.",
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

export default function PayoutCalculatorPage() {
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
            소수 배당 계산
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
            {introDescription}
          </p>
        </header>

        <PayoutCalculatorClient />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            예상 당첨금 계산기란?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            예상 당첨금 계산기는 베팅 금액과 소수 배당을 입력해 예상 지급액과
            예상 수익을 계산하는 도구입니다. 한국 토토사이트에서 자주 쓰이는
            1.50, 1.85, 2.00, 2.50 같은 소수 배당은 베팅 금액에 배당을
            곱해 예상 지급액을 계산합니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            이 계산기는 단일 배당의 결과를 빠르게 확인할 때 사용할 수 있습니다.
            다만 계산 결과는 입력값을 기준으로 한 단순 계산이며 실제 경기 결과,
            배당 변동, 사이트 규정에 따라 실제 결과는 달라질 수 있습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            예상 당첨금 계산 공식
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            소수 배당 기준 예상 지급액은 베팅 금액에 배당을 곱해 계산합니다.
          </p>
          <div className="mt-3 space-y-2 rounded-md border border-line bg-background p-4 text-sm font-semibold leading-6 text-foreground">
            <p>예상 지급액 = 베팅 금액 × 소수 배당</p>
            <p>예상 수익 = 예상 지급액 - 베팅 금액</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            베팅 금액이 10,000원이고 배당이 2.50이면 예상 지급액은
            25,000원입니다. 이때 예상 수익은 25,000원에서 베팅 금액
            10,000원을 뺀 15,000원입니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            입력값을 어떻게 해석하나요?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            베팅 금액은 계산 기준이 되는 원화 금액입니다. 소수 배당은 1.50,
            2.00, 2.50처럼 표시되는 배당값을 의미합니다. 소수 배당이 높을수록
            예상 지급액은 커지지만, 배당이 높다는 이유만으로 실제 결과
            가능성이 높아지는 것은 아닙니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            배당은 결과 가능성, 운영 정책, 시장 상황 등에 따라 달라질 수
            있으므로, 계산 결과는 참고값으로만 확인하는 것이 좋습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            예상 지급액과 예상 수익의 차이
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            예상 지급액은 베팅 금액까지 포함한 전체 지급 예상 금액입니다. 예상
            수익은 예상 지급액에서 처음 입력한 베팅 금액을 제외한 금액입니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            예를 들어 10,000원을 배당 1.80에 입력하면 예상 지급액은
            18,000원이고 예상 수익은 8,000원입니다. 따라서 계산 결과를 볼
            때는 지급액과 수익을 구분해서 확인해야 합니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            계산 결과를 볼 때 주의할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            계산 결과는 입력한 금액과 배당을 기준으로 한 이론값입니다. 실제
            결과, 배당 변경, 취소·무효 처리, 이용 조건 등에 따라 실제 지급액은
            달라질 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            또한 본 계산기는 특정 사이트 이용이나 도박 참여를 권장하기 위한
            도구가 아닙니다. 계산 결과만으로 판단하지 말고, 사이트 상세 정보,
            이용자 후기, 먹튀 제보, 도메인 정보도 함께 확인하는 것이 좋습니다.
          </p>
        </section>

        <ToolNotice />
        <CalculatorLinkGrid currentHref="/tools/payout-calculator" />
        <ToolsHubLink />

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            함께 확인하면 좋은 페이지
          </h2>
          <div className="mt-4 divide-y divide-line">
            {relatedPages.map((item) => (
              <article key={item.href} className="py-4 first:pt-0 last:pb-0">
                <h3 className="text-base font-bold text-foreground">
                  <Link href={item.href} className="transition hover:text-accent">
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
            예상 당첨금 계산기 FAQ
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
