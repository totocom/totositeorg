import type { Metadata } from "next";
import Link from "next/link";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: `${siteName} - 안전한 토토사이트 순위 및 이용 후기`,
  },
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    url: siteUrl,
    title: `${siteName} - 안전한 토토사이트 순위 및 이용 후기`,
    description: siteDescription,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/sites?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "토토사이트란 무엇인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "토토사이트는 스포츠 경기 결과를 예측해 베팅하는 온라인 플랫폼입니다. 국내 합법 스포츠토토 외에도 해외 라이선스 기반의 다양한 사설 사이트들이 운영되고 있으며, 이용 전 라이선스 보유 여부와 안전성 확인이 중요합니다.",
      },
    },
    {
      "@type": "Question",
      name: "안전한 토토사이트를 어떻게 구별하나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "안전한 토토사이트는 몰타(MGA), 퀴라소, 지브롤터, 영국(UKGC) 등 신뢰할 수 있는 기관의 공식 라이선스를 보유합니다. 또한 출금 지연 없이 신속한 처리, 투명한 이용 약관, 한국어 고객지원 여부를 확인하는 것이 중요합니다.",
      },
    },
    {
      "@type": "Question",
      name: "먹튀 토토사이트를 어떻게 알아볼 수 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "먹튀 토토사이트의 주요 징후로는 출금 지연 또는 거부, 고객센터 연락 두절, 불명확한 보너스 약관, 라이선스 정보 미공개 등이 있습니다. 이용 전 커뮤니티 후기를 반드시 확인하세요.",
      },
    },
    {
      "@type": "Question",
      name: "토토사이트 이용 시 주의사항은 무엇인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "19세 이상만 이용 가능하며, 이용 전 공식 라이선스와 이용 약관을 반드시 확인해야 합니다. 도박 중독이 우려될 경우 한국도박문제관리센터(1336)에 도움을 요청하세요.",
      },
    },
  ],
};

export default async function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-accent">
              한국 토토사이트 추천 및 리뷰
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">
              안전한 토토사이트 순위와 실제 이용 경험을 확인하세요
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              관리자가 등록한 사이트 목록을 확인하고, 사이트별 이용 경험과
              만족도 평가를 참고할 수 있습니다.
            </p>
          </div>
          <Link
            href="/sites"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            사이트 목록
          </Link>
        </header>

        <section className="grid gap-6 rounded-lg border border-line bg-surface p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              토토사이트란?
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              토토사이트는 스포츠 경기 결과를 예측해 베팅하는 온라인 플랫폼을 말합니다.
              국내 합법 스포츠토토 외에도 해외 라이선스 기반의 온라인 베팅 사이트들이
              다양하게 운영되고 있습니다. 안전한 토토사이트를 선택하려면 라이선스
              보유 여부, 입출금 처리 속도, 고객지원 품질 등을 꼼꼼히 확인해야 합니다.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground">
              안전한 토토사이트 선택 기준
            </h2>
            <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted">
              <li>
                <span className="font-semibold text-foreground">공식 라이선스 확인</span> —
                몰타(MGA), 퀴라소, 지브롤터, 영국(UKGC) 등 공신력 있는 기관의 라이선스
                보유 여부를 확인하세요.
              </li>
              <li>
                <span className="font-semibold text-foreground">입출금 후기</span> —
                출금 지연, 거부 사례가 없는지 실제 이용자 후기를 통해 확인하세요.
              </li>
              <li>
                <span className="font-semibold text-foreground">고객센터 응답</span> —
                한국어 지원 여부와 응답 속도를 확인하세요.
              </li>
              <li>
                <span className="font-semibold text-foreground">먹튀 이력</span> —
                커뮤니티에서 먹튀 신고 이력이 없는지 반드시 검토하세요.
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">자주 묻는 질문</h2>
          <dl className="mt-4 grid gap-5">
            <div>
              <dt className="text-sm font-semibold text-foreground">
                먹튀 토토사이트를 어떻게 알아볼 수 있나요?
              </dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                출금 지연·거부, 고객센터 연락 두절, 불명확한 보너스 약관,
                라이선스 정보 미공개가 대표적인 먹튀 징후입니다. 이용 전 반드시
                커뮤니티 후기를 확인하세요.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-foreground">
                토토사이트 이용 가능한 나이는?
              </dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                19세 이상만 이용 가능합니다. 미성년자는 이용이 금지되어 있습니다.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-foreground">
                리뷰는 어떻게 작성하나요?
              </dt>
              <dd className="mt-1 text-sm leading-6 text-muted">
                사이트 목록에서 특정 사이트를 선택한 뒤, 해당 사이트 상세
                화면에서 이용 경험을 공유할 수 있습니다. 제출된 내용은 관리자
                검토 후 공개됩니다.
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}
