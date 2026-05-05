import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

export function getReviewFaqItems(context: SiteFaqContext): SiteFaqItem[] {
  return [
    {
      question: "후기가 0건이면 이용자가 없다는 뜻인가요?",
      answer: `아닙니다. ${context.siteName}은 현재 대표 도메인 ${context.representativeDomain} 기준으로 공개되어 있지만, 승인된 후기가 ${context.reviewCount}건이라는 뜻일 뿐 실제 이용자 수를 의미하지 않습니다.`,
    },
    {
      question: "후기는 어떤 기준으로 공개되나요?",
      answer: `${context.siteName} 후기는 중복, 욕설, 개인정보, 근거 없는 단정 표현을 검토한 뒤 공개됩니다. 도메인 ${context.domainCount}개나 운영 이력 ${context.operatingPeriod} 같은 정보는 참고값일 뿐 후기 검토를 대체하지 않습니다.`,
    },
    {
      question: "평점은 어떻게 반영되나요?",
      answer: `평점은 ${context.siteName}에 대해 승인된 후기만 평균에 반영합니다. 현재 공개 승인 후기가 ${context.reviewCount}건이면 그 수만 평균 계산과 화면 표시에 반영됩니다.`,
    },
    {
      question: "부정적인 후기도 작성할 수 있나요?",
      answer: `가능합니다. ${context.siteName} 이용 중 불편했던 내용도 작성할 수 있지만, 사실 관계와 경험 내용을 구체적으로 적어야 공개 검토가 가능합니다. 최근 도메인 관측일은 ${context.latestObservationDate ?? "확인 불가"}입니다.`,
    },
  ];
}

export function SiteReviewFaq({ context }: { context: SiteFaqContext }) {
  return (
    <SiteFaqList
      title={`${context.siteName} 후기 FAQ`}
      items={getReviewFaqItems(context)}
    />
  );
}
