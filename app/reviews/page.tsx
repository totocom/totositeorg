import type { Metadata } from "next";
import Link from "next/link";
import { PublicReviewList } from "@/app/components/public-review-list";
import {
  buildFaqPageJsonLd,
  JsonLd,
  type SiteFaqItem,
} from "@/app/components/site-detail/site-json-ld";
import { getPublicReviewList } from "@/app/data/public-sites";
import { siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

const reviewsTitle = "토토사이트 후기 및 이용자 만족도 평가";
const reviewsDescription =
  "토토사이트 후기와 이용자 만족도 평가를 확인하세요. 환전 후기, 고객센터 후기, 이벤트 후기, 모바일 후기, 안전성 후기를 바탕으로 사이트별 리뷰를 비교할 수 있습니다.";

export const metadata: Metadata = {
  title: {
    absolute: reviewsTitle,
  },
  description: reviewsDescription,
  keywords: null,
  alternates: {
    canonical: `${siteUrl}/reviews`,
  },
  openGraph: {
    url: `${siteUrl}/reviews`,
    title: reviewsTitle,
    description: reviewsDescription,
    siteName,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: reviewsTitle,
    description: reviewsDescription,
  },
};

const reviewReasons = [
  "토토사이트 리뷰는 단순 별점보다 환전 속도, 고객센터 응답, 이벤트 조건처럼 구체적인 이용 경험을 함께 봐야 합니다.",
  "토토사이트 이용후기에는 모바일 사용성, 접속 안정성, 계정 이용 과정에서 느낀 안전성 후기까지 포함될 수 있습니다.",
  "한두 개의 토토사이트 평가만으로 전체 사이트를 단정하기보다 여러 작성자의 후기와 작성 시점을 함께 비교하는 것이 좋습니다.",
  "피해성 신호는 별도 먹튀 제보 페이지와 함께 확인하면 긍정 평가와 부정 제보를 더 균형 있게 볼 수 있습니다.",
];

const satisfactionItems = [
  {
    title: "환전 후기",
    description: "환전 요청 후 처리 속도, 지연 여부, 안내 방식",
  },
  {
    title: "고객센터 후기",
    description: "응답 속도, 답변 정확도, 문제 해결 태도",
  },
  {
    title: "이벤트 후기",
    description: "보너스 조건, 참여 난이도, 실제 혜택 체감",
  },
  {
    title: "모바일 후기",
    description: "모바일 화면 구성, 접속 속도, 사용 편의성",
  },
  {
    title: "안전성 후기",
    description: "계정 이용 안정성, 접속 안정성, 개인정보 보호 체감",
  },
];

const reviewChecklist = [
  "별점만 보지 말고 작성 내용까지 확인하기",
  "환전 후기와 고객센터 후기를 함께 보기",
  "이벤트 후기는 조건과 제한 사항까지 확인하기",
  "모바일 이용이 많다면 모바일 후기 확인하기",
  "평가 수가 적은 사이트는 단정하지 않기",
  "동일 사이트의 먹튀 제보 여부 함께 확인하기",
];

const relatedLinks = [
  {
    href: "/scam-reports",
    title: "먹튀 제보",
    description: "환전 지연, 지급 거부, 계정 제한 등 피해성 제보 확인",
  },
  {
    href: "/sites",
    title: "사이트 상세 리뷰",
    description: "사이트별 기본 정보, 도메인, 후기, 제보를 한 번에 확인",
  },
  {
    href: "/site-registration",
    title: "사이트 등록",
    description: "아직 등록되지 않은 사이트를 제보하거나 등록 요청",
  },
];

const reviewFaqItems: SiteFaqItem[] = [
  {
    question: "토토사이트 후기는 어떻게 확인해야 하나요?",
    answer:
      "단순 별점보다 환전 후기, 고객센터 후기, 이벤트 후기, 모바일 후기, 안전성 후기 등 세부 항목을 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "토토사이트 리뷰만 보고 이용 여부를 결정해도 되나요?",
    answer:
      "아닙니다. 리뷰는 참고 자료이며, 평가 수와 작성 시점, 먹튀 제보 여부, 사이트 상세 정보를 함께 확인해야 합니다.",
  },
  {
    question: "환전 후기는 왜 중요한가요?",
    answer:
      "환전 후기는 처리 속도, 지연 여부, 안내 방식 등을 확인할 수 있어 이용자 만족도 평가에서 중요한 항목입니다.",
  },
  {
    question: "고객센터 후기는 무엇을 봐야 하나요?",
    answer:
      "응답 속도, 답변의 정확성, 문제 해결 태도, 상담 과정의 일관성을 확인하는 것이 좋습니다.",
  },
  {
    question: "사이트에 대한 후기는 어디서 남길 수 있나요?",
    answer:
      "사이트 상세 페이지 또는 후기 작성 페이지에서 이용 경험을 남길 수 있습니다. 단, 개인정보나 확인되지 않은 비방, 광고성 문구는 제외될 수 있습니다.",
  },
];

export default async function ReviewsPage() {
  const { items, errorMessage, source } = await getPublicReviewList();

  return (
    <>
      <JsonLd value={buildFaqPageJsonLd(reviewFaqItems)} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              토토사이트 리뷰 허브
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              {reviewsTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              토토사이트 후기는 실제 이용자가 남긴 만족도 평가를 바탕으로
              사이트별 사용 경험을 비교할 수 있는 참고 자료입니다. 환전,
              고객센터, 이벤트, 모바일 사용성, 안전성 등 여러 항목을 함께
              확인해 신중하게 판단해보세요.
            </p>
          </div>
          <Link
            href="/submit-review"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            만족도 평가 작성
          </Link>
        </header>

        {errorMessage ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {source === "fallback" ? (
          <p className="text-sm text-muted">
            현재 개발용 더미 데이터가 표시되고 있습니다.
          </p>
        ) : null}

        {items.length > 0 ? (
          <PublicReviewList items={items} />
        ) : (
          <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">
              공개된 만족도 평가가 없습니다
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              관리자 승인이 완료된 만족도 평가가 있으면 이곳에 표시됩니다.
            </p>
          </section>
        )}

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            토토사이트 후기를 확인해야 하는 이유
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reviewReasons.map((reason) => (
              <p
                key={reason}
                className="rounded-lg border border-line bg-background p-4 text-sm leading-6 text-muted"
              >
                {reason}
              </p>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            이용자 후기와 만족도 평가는 참고 자료입니다. 특정 사이트 이용을
            보장하거나 권장하는 정보가 아니며, 공개된{" "}
            <Link
              href="/scam-reports"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              먹튀 제보
            </Link>
            와 사이트별 상세 정보를 함께 확인해야 합니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            이용자 만족도 평가 항목
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {satisfactionItems.map((item) => (
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
            토토사이트 이용후기 볼 때 체크할 점
          </h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted md:grid-cols-2">
            {reviewChecklist.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            평가 수가 적은 사이트를 볼 때 주의할 점
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            리뷰 수가 적으면 전체 이용자 의견을 대표한다고 보기 어렵습니다.
            최근 작성된 후기인지 확인하고, 긍정 후기와 부정 후기를 함께
            비교해야 합니다.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            평가가 충분하지 않은 경우에는{" "}
            <Link
              href="/sites"
              className="font-semibold text-accent transition hover:text-accent/80"
            >
              사이트 상세 리뷰
            </Link>
            와 먹튀 제보 현황을 함께 확인하는 것이 좋습니다.
          </p>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            함께 확인하면 좋은 페이지
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            토토사이트 후기 FAQ
          </h2>
          <div className="mt-4 divide-y divide-line">
            {reviewFaqItems.map((item) => (
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
