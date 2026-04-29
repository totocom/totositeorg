import type { Metadata } from "next";
import Link from "next/link";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

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
      <main className="flex w-full flex-col">
        {/* Hero */}
        <section className="bg-[#111111] px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="로고" className="neon-logo h-8 w-8 shrink-0" />
                  <span className="text-sm font-semibold text-white/60">검증된 토토사이트 정보</span>
                </div>
                <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                  안전한 토토사이트,<br />
                  <span className="text-accent">실제 후기로 확인하세요</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/60">
                  관리자가 직접 검증한 사이트 목록과 실이용자의 만족도 평가를 한곳에서 확인할 수 있습니다.
                </p>
              </div>
              <form action="/sites" method="get" className="w-full max-w-md lg:shrink-0">
                <div className="flex overflow-hidden rounded-lg border border-white/20 bg-white/10 focus-within:border-accent">
                  <input
                    name="q"
                    type="search"
                    placeholder="사이트명 또는 도메인 검색"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
                  >
                    검색
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/sites" className="text-sm font-semibold text-accent transition hover:text-accent/80">
                    전체 사이트 목록 →
                  </Link>
                  <Link href="/reviews" className="text-sm font-semibold text-white/60 transition hover:text-white">
                    만족도 평가 보기
                  </Link>
                  <Link href="/scam-reports" className="text-sm font-semibold text-white/60 transition hover:text-white">
                    먹튀 제보 확인
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {/* 선택 기준 */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🏛️", title: "공식 라이선스", desc: "MGA, UKGC 등 공신력 있는 기관 인증 사이트만" },
              { icon: "💸", title: "빠른 입출금", desc: "출금 지연·거부 이력 없는 사이트" },
              { icon: "💬", title: "한국어 지원", desc: "한국어 고객센터 운영 여부 확인" },
              { icon: "🛡️", title: "먹튀 이력 없음", desc: "커뮤니티 신고 이력 검토 완료" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 text-sm font-bold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{item.desc}</p>
              </div>
            ))}
          </section>

          {/* 토토사이트 설명 */}
          <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">토토사이트란?</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              토토사이트는 스포츠 경기 결과를 예측해 베팅하는 온라인 플랫폼을 말합니다.
              국내 합법 스포츠토토 외에도 해외 라이선스 기반의 온라인 베팅 사이트들이
              다양하게 운영되고 있습니다. 안전한 토토사이트를 선택하려면 라이선스
              보유 여부, 입출금 처리 속도, 고객지원 품질 등을 꼼꼼히 확인해야 합니다.
            </p>
          </section>

          {/* FAQ */}
          <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground">자주 묻는 질문</h2>
            <dl className="mt-5 grid gap-0 divide-y divide-line">
              {[
                {
                  q: "먹튀 토토사이트를 어떻게 알아볼 수 있나요?",
                  a: "출금 지연·거부, 고객센터 연락 두절, 불명확한 보너스 약관, 라이선스 정보 미공개가 대표적인 먹튀 징후입니다. 이용 전 반드시 커뮤니티 후기를 확인하세요.",
                },
                {
                  q: "토토사이트 이용 가능한 나이는?",
                  a: "19세 이상만 이용 가능합니다. 미성년자는 이용이 금지되어 있습니다.",
                },
                {
                  q: "리뷰는 어떻게 작성하나요?",
                  a: "사이트 목록에서 특정 사이트를 선택한 뒤, 해당 사이트 상세 화면에서 이용 경험을 공유할 수 있습니다. 제출된 내용은 관리자 검토 후 공개됩니다.",
                },
              ].map((item) => (
                <div key={item.q} className="py-4">
                  <dt className="text-sm font-semibold text-foreground">{item.q}</dt>
                  <dd className="mt-1 text-sm leading-6 text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}
