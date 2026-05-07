import type { Metadata } from "next";
import Link from "next/link";
import { SubmitSiteForm } from "@/app/components/submit-site-form";
import {
  buildFaqPageJsonLd,
  JsonLd,
  type SiteFaqItem,
} from "@/app/components/site-detail/site-json-ld";
import { siteName, siteUrl } from "@/lib/config";

const registrationTitle = "토토사이트 등록 및 사이트 제보 요청";
const registrationMetaTitle =
  "토토사이트 등록과 신규 사이트 제보 안내 | 토토사이트 정보";
const registrationDescription =
  "토토사이트 등록 요청과 신규 사이트 제보 방법을 안내합니다. 사이트명, 대표 주소, 도메인 정보, 이용 후기, 먹튀 제보 등 확인 가능한 정보를 기준으로 등록 요청을 작성할 수 있습니다.";
const registrationCanonical = `${siteUrl}/site-registration`;

export const metadata: Metadata = {
  title: {
    absolute: registrationMetaTitle,
  },
  description: registrationDescription,
  keywords: null,
  alternates: {
    canonical: registrationCanonical,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    url: registrationCanonical,
    title: registrationMetaTitle,
    description: registrationDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: registrationMetaTitle,
    description: registrationDescription,
  },
};

const requiredInfoItems = [
  "사이트명",
  "대표 주소",
  "추가 도메인",
  "운영 기간 또는 이용 기간",
  "이용 카테고리",
  "이용자 후기",
  "고객센터 응답 경험",
  "환전 또는 입금 관련 경험",
  "먹튀 제보 여부",
  "도메인 변경 이력",
];

const preSubmitChecklist = [
  "이미 사이트 목록에 등록되어 있는지 확인하기",
  "대표 주소와 추가 도메인이 정확한지 확인하기",
  "동일 사이트에 먹튀 제보가 있는지 확인하기",
  "도메인 정보나 운영 이력이 너무 짧지 않은지 확인하기",
  "후기나 제보 내용에 개인정보가 포함되지 않았는지 확인하기",
];

const difficultRegistrationItems = [
  "사이트 주소가 확인되지 않는 경우",
  "광고성 문구만 포함된 경우",
  "개인정보나 계좌 정보가 포함된 경우",
  "확인되지 않은 비방만 포함된 경우",
  "동일한 내용이 반복 제출된 경우",
  "실제 사이트 정보와 다른 내용이 포함된 경우",
];

const relatedLinks = [
  {
    href: "/sites",
    title: "토토사이트 목록",
    description: "등록된 사이트 정보를 먼저 검색하고 비교할 수 있습니다.",
  },
  {
    href: "/reviews",
    title: "토토사이트 후기",
    description: "이용자 만족도 평가와 실제 이용후기를 확인할 수 있습니다.",
  },
  {
    href: "/scam-reports",
    title: "먹튀 제보",
    description: "출금 거부, 출금 지연, 계정 차단 등 피해 사례를 확인할 수 있습니다.",
  },
  {
    href: "/domains",
    title: "토토사이트 주소",
    description: "대표 주소, 추가 도메인, 도메인 변경 이력을 확인할 수 있습니다.",
  },
];

const registrationFaqItems: SiteFaqItem[] = [
  {
    question: "토토사이트 등록 요청은 누가 할 수 있나요?",
    answer:
      "로그인한 회원이 사이트 등록 요청을 작성할 수 있습니다. 비회원은 안내 내용을 확인한 뒤 로그인 후 요청을 진행할 수 있습니다.",
  },
  {
    question: "등록 요청을 하면 바로 공개되나요?",
    answer:
      "아니요. 등록 요청은 내부 검토 후 반영될 수 있으며, 확인이 어려운 정보나 광고성 내용은 제외될 수 있습니다.",
  },
  {
    question: "어떤 정보를 입력하면 좋나요?",
    answer:
      "사이트명, 대표 주소, 추가 도메인, 이용 경험, 먹튀 제보 여부, 도메인 변경 이력 등 확인 가능한 정보를 입력하는 것이 좋습니다.",
  },
  {
    question: "이미 등록된 사이트도 제보할 수 있나요?",
    answer:
      "이미 등록된 사이트라도 주소 변경, 추가 도메인, 후기, 먹튀 제보 등 새로운 정보가 있다면 관련 페이지를 통해 보완 요청을 할 수 있습니다.",
  },
  {
    question: "등록된 사이트는 이용이 보장된다는 뜻인가요?",
    answer:
      "아닙니다. 등록은 정보 제공을 위한 절차이며, 안전성이나 이용을 보장하는 의미가 아닙니다. 사이트 상세 리뷰, 후기, 먹튀 제보, 도메인 정보를 함께 확인해야 합니다.",
  },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: registrationTitle,
  url: registrationCanonical,
  description: registrationDescription,
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  },
};

export default function SiteRegistrationPage() {
  return (
    <>
      <JsonLd value={webPageJsonLd} />
      <JsonLd value={buildFaqPageJsonLd(registrationFaqItems)} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-accent">
            사이트 등록
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {registrationTitle}
          </h1>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-muted">
            <p>
              토토사이트 등록은 아직 목록에 없는 사이트 정보를 제보하거나,
              기존 사이트의 주소·도메인·운영 정보 보완을 요청하는 기능입니다.
              사이트명, 대표 주소, 추가 도메인, 이용 경험, 먹튀 제보 여부 등
              확인 가능한 정보를 중심으로 등록 요청을 작성할 수 있습니다.
            </p>
            <p>
              등록 요청은 내부 검토 후 반영될 수 있으며, 광고성 문구나 확인이
              어려운 정보, 개인정보가 포함된 내용은 공개되지 않을 수 있습니다.
            </p>
          </div>
        </header>

        <section aria-labelledby="site-registration-form-heading">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                등록 요청
              </p>
              <h2
                id="site-registration-form-heading"
                className="mt-1 text-xl font-bold text-foreground"
              >
                사이트 제보하기
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
            >
              로그인
            </Link>
          </div>
          <SubmitSiteForm />
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 등록 요청이란?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            토토사이트 등록 요청은 이용자가 알고 있는 사이트 정보를 제보하여
            목록에 추가 검토를 요청하는 절차입니다. 등록 요청이 접수되면
            사이트명, 대표 주소, 도메인 정보, 이용자 후기, 먹튀 제보 여부 등을
            기준으로 확인이 진행됩니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            등록 요청이 곧바로 사이트 이용 권장이나 안전성 보장을 의미하는
            것은 아닙니다. 등록된 정보는 이용자가 사이트별 정보를 비교할 수
            있도록 제공되는 참고 자료입니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            등록 요청 시 필요한 정보
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            토토사이트 정보 등록이나 신규 사이트 제보를 작성할 때는 가능한 한
            확인 가능한 정보를 중심으로 입력하는 것이 좋습니다.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {requiredInfoItems.map((item) => (
              <div
                key={item}
                className="rounded-md border border-line bg-background px-3 py-2 text-sm font-semibold text-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            등록 전 확인할 기준
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {preSubmitChecklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            등록이 어려운 사례
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            아래와 같은 사이트 등록 요청은 반영되지 않거나 검토가 지연될 수
            있습니다.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {difficultRegistrationItems.map((item) => (
              <div
                key={item}
                className="rounded-md border border-line bg-background px-3 py-2 text-sm text-muted"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            등록 요청 후 어떻게 처리되나요?
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            등록 요청이 접수되면 입력된 사이트명, 대표 주소, 도메인 정보,
            관련 후기, 먹튀 제보 여부 등을 기준으로 검토가 진행됩니다. 검토가
            완료된 정보는 사이트 목록, 사이트 상세 리뷰, 도메인 정보 페이지
            등에 반영될 수 있습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            단, 모든 요청이 반드시 공개되는 것은 아니며, 확인이 어렵거나
            기준에 맞지 않는 정보는 제외될 수 있습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            등록 전 함께 확인하면 좋은 페이지
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {relatedLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
              >
                <h3 className="text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 등록 FAQ
          </h2>
          <div className="mt-4 divide-y divide-line">
            {registrationFaqItems.map((item) => (
              <article key={item.question} className="py-4 first:pt-0 last:pb-0">
                <h3 className="text-base font-bold text-foreground">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
