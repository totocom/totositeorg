import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";

export function getScamReportFaqItems(
  context: SiteFaqContext,
): SiteFaqItem[] {
  return [
    {
      question: "먹튀 제보가 0건이면 문제가 없다는 뜻인가요?",
      answer: `아닙니다. ${context.siteName}은 대표 도메인 ${context.representativeDomain}과 도메인 ${context.domainCount}개를 기준으로 정리되어 있지만, 이런 정보만으로 안전성을 보장할 수는 없습니다. 이 페이지에는 관리자 승인을 거친 공개 제보만 표시됩니다.`,
    },
    {
      question: "제보는 바로 공개되나요?",
      answer: `${context.siteName} 관련 제보가 접수되더라도 바로 공개되지는 않습니다. 개인정보, 중복 여부, 증빙 내용을 확인한 뒤 공개 여부가 결정됩니다. 현재 공개 승인 제보 수는 ${context.scamReportCount}건입니다.`,
    },
    {
      question: "피해 금액을 모르면 제보할 수 있나요?",
      answer: `가능합니다. ${context.siteName} 제보를 작성할 때 피해 금액을 모르면 금액 미상으로 접수하고, 상황 설명과 증빙을 중심으로 남길 수 있습니다. 운영 이력은 ${context.operatingPeriod}로 표시됩니다.`,
    },
    {
      question: "비슷한 사례는 어디서 볼 수 있나요?",
      answer: `${context.siteName} 페이지 안에서는 승인 제보 ${context.scamReportCount}건을 기준으로 표시합니다. 다른 공개 사례는 전체 먹튀 피해 제보 목록에서 함께 확인할 수 있습니다.`,
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
