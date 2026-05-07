import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

export const homeFaqItems: SiteFaqItem[] = [
  {
    question: "토토사이트란 무엇인가요?",
    answer:
      "토토사이트는 스포츠 경기 결과를 예측해 베팅하는 온라인 플랫폼을 말합니다. 국내 합법 스포츠토토와 해외 라이선스 기반 사이트는 운영 주체와 규제 체계가 다르므로 구분해서 확인해야 합니다.",
  },
  {
    question: "토토사이트 정보를 확인할 때 어떤 기준을 봐야 하나요?",
    answer:
      "라이선스 표기, 출금 처리 이력, 고객지원 응답, 도메인 운영 기간, 이용자 후기와 먹튀 피해 제보를 함께 확인하는 것이 좋습니다. 단일 지표만으로 안전성이나 이용 가능성을 단정하기는 어렵습니다.",
  },
  {
    question: "먹튀 토토사이트를 어떻게 알아볼 수 있나요?",
    answer:
      "출금 지연 또는 거부, 고객센터 연락 두절, 불명확한 보너스 약관, 도메인 잦은 변경, 라이선스 정보 미공개는 주요 위험 신호입니다. 공개 제보와 후기를 함께 확인하는 것이 좋습니다.",
  },
  {
    question: "도박 중독 상담은 어디서 받을 수 있나요?",
    answer:
      "도박 문제로 일상생활이나 금전 관리가 어려워졌다면 한국도박문제예방치유원 1336 상담을 이용할 수 있습니다. 본인뿐 아니라 가족도 상담과 안내를 받을 수 있습니다.",
  },
  {
    question: "먹튀 피해를 당했을 때 어떻게 대응하나요?",
    answer:
      "입금 내역, 대화 기록, 사이트 주소, 계정 정보, 피해 시점을 먼저 보관해야 합니다. 이후 경찰청 사이버범죄 신고시스템이나 관련 기관을 통해 신고 절차를 확인하는 것이 좋습니다.",
  },
  {
    question: "사이트 운영 이력만으로 안전성을 판단할 수 있나요?",
    answer:
      "운영 이력은 참고 자료일 뿐입니다. 오래 운영된 도메인이라도 운영 주체 변경, 출금 정책 변경, 피해 제보 증가가 있을 수 있어 후기와 신고 이력까지 함께 확인해야 합니다.",
  },
  {
    question: "토토사이트와 합법 스포츠토토의 차이는 무엇인가요?",
    answer:
      "국내 합법 스포츠토토는 체육진흥투표권 제도 안에서 운영됩니다. 그 외 온라인 베팅 사이트는 해외 라이선스나 별도 운영 체계를 내세우는 경우가 많아 법적 지위와 이용 위험을 구분해야 합니다.",
  },
];

export function HomeFaqSection() {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        FAQ
      </p>
      <h2 className="mt-1 text-2xl font-bold text-foreground">
        토토사이트 정보 확인 FAQ
      </h2>
      <dl className="mt-5 divide-y divide-line">
        {homeFaqItems.map((item) => (
          <div key={item.question} className="py-4 first:pt-0 last:pb-0">
            <dt className="text-sm font-bold text-foreground">
              {item.question}
            </dt>
            <dd className="mt-2 text-sm leading-7 text-muted">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
