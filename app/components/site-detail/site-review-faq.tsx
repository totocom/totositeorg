import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

export function getReviewFaqItems(context: SiteFaqContext): SiteFaqItem[] {
  const sharedItems: SiteFaqItem[] = [
    {
      question: `${context.siteName} 후기는 어떤 기준으로 확인해야 하나요?`,
      answer: `단순 점수보다 이용 기간, 이용 카테고리, 환전 경험, 고객센터 응답, 이벤트 만족도, 모바일 사용성, 안전성 체감 평가를 함께 확인하는 것이 좋습니다. 현재 대표 도메인은 ${context.representativeDomain}로 표시합니다.`,
    },
    {
      question:
        context.reviewCount <= 1
          ? `${context.siteName} 후기가 1건이면 신뢰할 수 있나요?`
          : `${context.siteName} 후기가 적으면 어떻게 봐야 하나요?`,
      answer: `후기 ${context.reviewCount}건만으로 전체 이용자 의견을 대표한다고 보기는 어렵습니다. 작성 시점, 세부 응답, 먹튀 제보 ${context.scamReportCount}건, 도메인 정보 ${context.domainCount}개와 함께 참고해야 합니다.`,
    },
    {
      question: "평점은 어떻게 반영되나요?",
      answer: `평점은 ${context.siteName}에 대해 승인된 이용자 후기만 기준으로 계산됩니다. 후기 수가 적을 경우 평균 점수가 쉽게 변동될 수 있습니다.`,
    },
    {
      question: "부정적인 후기도 작성할 수 있나요?",
      answer: `가능합니다. 다만 개인정보, 욕설, 광고성 문구, 확인되지 않은 단정 표현은 공개 검토 과정에서 제외될 수 있습니다. 최근 도메인 관측일은 ${context.latestObservationDate ?? "확인 불가"}입니다.`,
    },
    {
      question: "후기와 먹튀 제보는 어떻게 함께 봐야 하나요?",
      answer: `후기는 이용자 만족도와 사용 경험을 확인하는 자료이고, 먹튀 제보는 피해 가능성을 확인하는 자료입니다. 두 정보를 함께 보면 더 균형 있게 판단할 수 있습니다.`,
    },
  ];

  if (context.reviewCount > 0) return sharedItems;

  return [
    {
      question: "후기가 0건이면 이용자가 없다는 뜻인가요?",
      answer: `아닙니다. ${context.siteName}은 현재 대표 도메인 ${context.representativeDomain} 기준으로 공개되어 있지만, 승인된 후기가 0건이라는 뜻일 뿐 실제 이용자 수를 의미하지 않습니다.`,
    },
    ...sharedItems.filter(
      (item) =>
        !item.question.includes("후기가 1건이면") &&
        !item.question.includes("후기가 적으면"),
    ),
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
