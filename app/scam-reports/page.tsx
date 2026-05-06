import type { Metadata } from "next";
import Link from "next/link";
import { PublicScamReportList } from "@/app/components/public-scam-report-list";
import {
  buildFaqPageJsonLd,
  JsonLd,
  type SiteFaqItem,
} from "@/app/components/site-detail/site-json-ld";
import {
  getPublicScamReportList,
  type PublicScamReportListItem,
} from "@/app/data/public-sites";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

const scamReportsH1 = "먹튀 제보 및 토토사이트 먹튀 피해 사례";
const scamReportsMetaTitle =
  "먹튀 제보와 토토사이트 피해 사례 확인 | Totosite.ORG";
const scamReportsDescription =
  "먹튀 제보와 토토사이트 먹튀 피해 사례를 확인하세요. 출금 거부, 출금 지연, 계정 차단, 고객센터 차단, 입금 후 미반영 등 승인된 피해 제보를 유형별로 살펴볼 수 있습니다.";
const scamReportsCanonical = `${siteUrl}/scam-reports`;

export const metadata: Metadata = {
  title: {
    absolute: scamReportsMetaTitle,
  },
  description: scamReportsDescription,
  keywords: null,
  alternates: {
    canonical: scamReportsCanonical,
  },
  openGraph: {
    url: scamReportsCanonical,
    title: scamReportsMetaTitle,
    description: scamReportsDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: scamReportsMetaTitle,
    description: scamReportsDescription,
  },
};

const damageTypeGuides = [
  {
    title: "출금 거부 먹튀",
    description:
      "출금 신청 후 지급이 거부되거나 임의 규정을 이유로 보유금 지급이 중단되는 사례",
  },
  {
    title: "출금 지연 먹튀",
    description:
      "출금 요청 후 장시간 처리가 지연되거나 반복적으로 검수 중이라는 답변만 받는 사례",
  },
  {
    title: "계정 차단 먹튀",
    description:
      "환전 요청 이후 계정 접근이 제한되거나 로그인이 차단되는 사례",
  },
  {
    title: "고객센터 차단 먹튀",
    description:
      "문의 후 답변이 중단되거나 상담 채널에서 차단되는 사례",
  },
  {
    title: "보너스 규정 악용 먹튀",
    description:
      "이벤트나 보너스 조건을 이유로 수익금 지급을 거부하는 사례",
  },
  {
    title: "입금 후 미반영 먹튀",
    description:
      "입금 후 사이트 머니가 반영되지 않거나 확인이 지연되는 사례",
  },
];

const scamCaseChecklist = [
  "피해 유형이 출금 거부인지 출금 지연인지 구분하기",
  "발생일과 접수일이 언제인지 확인하기",
  "피해 금액과 입금액을 함께 비교하기",
  "계정 차단이나 고객센터 차단 여부 확인하기",
  "동일 사이트에 여러 먹튀 제보가 있는지 확인하기",
  "사이트 상세 리뷰와 토토사이트 후기도 함께 확인하기",
  "평가 수와 제보 수가 적은 경우 단정하지 않기",
];

const reportIncludedInfo = [
  "사이트명",
  "발생일",
  "이용 기간",
  "피해 유형",
  "피해 금액",
  "입금액",
  "이용 카테고리",
  "고객센터 응답 여부",
  "계정 차단 여부",
  "상황 설명",
];

const reportExcludedInfo = [
  "개인정보",
  "계좌 전체 번호",
  "전화번호",
  "주민등록번호 등 민감 정보",
  "확인되지 않은 과도한 비방",
  "광고성 문구",
  "반복 제출",
];

const relatedLinks = [
  {
    href: "/reviews",
    title: "토토사이트 후기",
    description:
      "이용자 만족도 평가, 환전 후기, 고객센터 후기, 이벤트 후기 등을 확인",
  },
  {
    href: "/sites",
    title: "사이트 상세 리뷰",
    description: "사이트별 기본 정보, 도메인, 후기, 먹튀 제보를 한 번에 확인",
  },
  {
    href: "/site-registration",
    title: "사이트 등록",
    description: "아직 등록되지 않은 사이트를 제보하거나 등록 요청",
  },
  {
    href: "/submit-scam-report",
    title: "먹튀 제보하기",
    description: "피해 사례가 있다면 확인 가능한 정보를 중심으로 제보 작성",
  },
];

const scamReportFaqItems: SiteFaqItem[] = [
  {
    question: "먹튀 제보는 어떤 내용을 기준으로 확인해야 하나요?",
    answer:
      "피해 유형, 발생일, 접수일, 피해 금액, 입금액, 계정 차단 여부, 고객센터 응답 여부를 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "먹튀 피해 제보가 1건만 있어도 위험한 사이트인가요?",
    answer:
      "단일 제보만으로 모든 사실을 단정하기는 어렵습니다. 다만 출금 거부, 계정 차단, 고객센터 차단 등 구체적인 피해 정황이 있다면 주의해서 확인해야 합니다.",
  },
  {
    question: "출금 지연 먹튀와 출금 거부 먹튀는 어떻게 다른가요?",
    answer:
      "출금 지연은 출금 처리가 장시간 미뤄지는 사례이고, 출금 거부는 사이트가 지급 자체를 거부하거나 임의 규정을 이유로 보유금 지급을 막는 사례입니다.",
  },
  {
    question: "먹튀 신고를 작성할 때 어떤 정보를 넣어야 하나요?",
    answer:
      "사이트명, 발생일, 피해 유형, 피해 금액, 이용 기간, 고객센터 응답 여부, 계정 차단 여부 등 확인 가능한 정보를 중심으로 작성하는 것이 좋습니다.",
  },
  {
    question: "먹튀 제보와 토토사이트 후기는 어떻게 함께 봐야 하나요?",
    answer:
      "먹튀 제보는 피해 가능성을 확인하는 자료이고, 토토사이트 후기는 이용자 만족도와 사용 경험을 확인하는 자료입니다. 두 페이지를 함께 확인하면 더 균형 있게 판단할 수 있습니다.",
  },
];

function buildCollectionPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: scamReportsH1,
    url: scamReportsCanonical,
    description: scamReportsDescription,
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };
}

function buildScamReportItemListJsonLd(items: PublicScamReportListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "승인된 먹튀 피해 제보 목록",
    url: scamReportsCanonical,
    itemListElement: items.map((report, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${report.site.siteName} ${report.damageTypes.join(", ") || report.mainCategory}`,
      url: new URL(
        `/sites/${encodeURIComponent(report.site.slug)}/scam-reports`,
        siteUrl,
      ).toString(),
    })),
  };
}

export default async function ScamReportsPage() {
  const { items, errorMessage, source } = await getPublicScamReportList();

  return (
    <>
      <JsonLd value={buildCollectionPageJsonLd()} />
      {items.length > 0 ? (
        <JsonLd value={buildScamReportItemListJsonLd(items)} />
      ) : null}
      <JsonLd value={buildFaqPageJsonLd(scamReportFaqItems)} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              먹튀 피해 제보
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {scamReportsH1}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              먹튀 제보는 이용자가 경험한 출금 거부, 출금 지연, 계정 차단,
              고객센터 차단, 보너스 규정 악용, 입금 후 미반영 등의 피해
              사례를 정리한 참고 자료입니다. 승인된 토토사이트 먹튀 제보를
              유형별로 확인하고, 사이트 상세 리뷰와 이용자 후기도 함께 비교해
              신중하게 판단해보세요.
            </p>
          </div>
          <Link
            href="/submit-scam-report"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            먹튀 제보하기
          </Link>
        </header>

        {errorMessage ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {source === "fallback" ? (
          <p className="text-sm text-muted">
            Supabase 공개 데이터를 불러오지 못했습니다.
          </p>
        ) : null}

        {items.length > 0 ? (
          <PublicScamReportList items={items} />
        ) : (
          <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">
              공개된 먹튀 피해 제보가 없습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              관리자 승인이 완료된 먹튀 피해 제보가 있으면 이곳에 표시됩니다.
            </p>
          </section>
        )}

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            먹튀 제보를 확인해야 하는 이유
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            먹튀 피해 제보는 단순한 불만 글이 아니라 출금 거부, 출금 지연,
            계정 차단, 고객센터 차단처럼 구체적인 피해 유형을 확인하는
            자료입니다. 토토사이트 먹튀 제보를 볼 때는 피해 금액만 보지 말고
            발생일, 접수일, 이용 기간, 사이트 대응 여부를 함께 확인하는 것이
            좋습니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            단일 먹튀 사례만으로 사이트 전체를 단정하기는 어렵지만, 비슷한
            피해 유형이 반복된다면 주의해서 살펴볼 필요가 있습니다. 또한{" "}
            <Link
              href="/reviews"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              토토사이트 후기
            </Link>{" "}
            페이지와{" "}
            <Link
              href="/sites"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              사이트 상세 리뷰
            </Link>
            를 함께 확인하면 만족도 평가와 피해 제보를 균형 있게 비교할 수
            있습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            주요 먹튀 피해 유형
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {damageTypeGuides.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-line bg-background p-4"
              >
                <h3 className="text-base font-bold text-foreground">
                  {item.title}
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
            먹튀 사례를 볼 때 체크할 점
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {scamCaseChecklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            제보 수가 적은 사이트를 볼 때 주의할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            공개된 먹튀 피해 제보 수가 적다고 해서 해당 사이트가 무조건
            안전하다고 볼 수는 없습니다. 반대로 제보가 1건만 있다고 해서 모든
            사실이 확정되는 것도 아닙니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            먹튀 사례를 확인할 때는 제보 작성 시점, 피해 유형, 피해 금액,
            사이트 대응 여부를 함께 살펴보는 것이 좋습니다. 가능하다면 사이트
            상세 리뷰, 토토사이트 후기, 도메인 정보도 함께 비교해 판단해야
            합니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            먹튀 제보 작성 시 포함하면 좋은 정보
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            먹튀 신고 또는 제보를 남길 때는 감정적인 표현보다 확인 가능한
            정보를 중심으로 작성하는 것이 좋습니다.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-line bg-background p-4">
              <h3 className="text-base font-bold text-foreground">
                포함하면 좋은 정보
              </h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                {reportIncludedInfo.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-background p-4">
              <h3 className="text-base font-bold text-foreground">
                피해야 할 정보
              </h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                {reportExcludedInfo.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            함께 확인하면 좋은 페이지
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
          <h2 className="text-xl font-bold text-foreground">먹튀 제보 FAQ</h2>
          <div className="mt-4 divide-y divide-line">
            {scamReportFaqItems.map((item) => (
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
