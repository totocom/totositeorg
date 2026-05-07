import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";

export function getScamReportFaqItems(
  context: SiteFaqContext,
): SiteFaqItem[] {
  if (context.scamReportCount === 0) {
    return [
      {
        question: "먹튀 제보가 0건이면 문제가 없다는 뜻인가요?",
        answer:
          "아닙니다. 공개된 제보가 없다는 뜻일 뿐이며, 안전성을 보장하지 않습니다. 사이트 상세 정보, 후기, 도메인 정보를 함께 확인해야 합니다.",
      },
      {
        question: `${context.siteName} 제보 내용은 바로 공개되나요?`,
        answer:
          "아닙니다. 개인정보, 중복 여부, 증빙 내용, 과도한 비방 여부를 검토한 뒤 공개 여부가 결정됩니다.",
      },
    ];
  }

  return [
    {
      question: `${context.siteName} 먹튀 제보는 어떤 기준으로 확인해야 하나요?`,
      answer:
        "피해 유형, 발생일, 접수일, 피해 금액, 입금액, 이용 기간, 계정 차단 여부, 고객센터 응답 여부를 함께 확인하는 것이 좋습니다.",
    },
    {
      question:
        context.scamReportCount === 1
          ? `${context.siteName} 먹튀 제보가 1건이면 사이트 전체가 위험하다는 뜻인가요?`
          : `${context.siteName} 먹튀 제보는 어떻게 해석해야 하나요?`,
      answer:
        "단일 제보나 소수의 제보만으로 사이트 전체 상태를 확정하기는 어렵습니다. 다만 출금 거부, 계정 차단, 고객센터 차단처럼 구체적인 피해 정황이 있다면 발생일과 세부 응답을 함께 확인해야 합니다.",
    },
    {
      question: "출금 거부와 출금 지연은 어떻게 다른가요?",
      answer:
        "출금 지연은 출금 처리가 장시간 미뤄지는 사례이고, 출금 거부는 지급 자체가 거부되거나 임의 규정을 이유로 보유금 지급이 막히는 사례입니다.",
    },
    {
      question: "제보 내용은 바로 공개되나요?",
      answer:
        "아닙니다. 개인정보, 중복 여부, 증빙 내용, 과도한 비방 여부를 검토한 뒤 공개 여부가 결정됩니다.",
    },
    {
      question: "먹튀 제보와 이용자 후기는 어떻게 함께 봐야 하나요?",
      answer:
        "먹튀 제보는 피해 가능성을 확인하는 자료이고, 이용자 후기는 만족도와 사용 경험을 확인하는 자료입니다. 두 정보를 함께 보면 더 균형 있게 판단할 수 있습니다.",
    },
  ];
}

export function SiteScamReportFaq({
  context,
}: {
  context: SiteFaqContext;
}) {
  return (
    <SiteFaqList
      title={`${context.siteName} 먹튀 제보 FAQ`}
      items={getScamReportFaqItems(context)}
    />
  );
}
