import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

export function getDomainFaqItems(context: SiteFaqContext): SiteFaqItem[] {
  return [
    {
      question: "대표 주소와 추가 도메인은 어떻게 구분하나요?",
      answer: `${context.siteName}의 대표 주소는 ${context.representativeDomain}로 표시합니다. 추가 도메인은 같은 사이트에 연결된 것으로 등록된 주소를 중복 제거해 계산하며, 현재 도메인 수는 ${context.domainCount}개입니다.`,
    },
    {
      question: "도메인 운영 이력은 안전성을 보장하나요?",
      answer: `아닙니다. ${context.siteName}의 운영 이력은 ${context.operatingPeriod}로 표시되지만, 도메인 생성일이나 DNS 정보만으로 이용 결과를 보장할 수는 없습니다.`,
    },
    {
      question: "DNS 정보가 비어 있으면 어떤 의미인가요?",
      answer: `${context.siteName} 도메인 정보는 조회 시점과 공개 가능한 레코드에 따라 달라질 수 있습니다. 최근 관측일은 ${context.latestObservationDate ?? "확인 불가"}이며, 빈 값은 해당 레코드를 확인하지 못했다는 뜻입니다.`,
    },
    {
      question: "도메인 변경 제보도 가능한가요?",
      answer: `가능합니다. ${context.siteName}의 주소가 바뀌었거나 ${context.representativeDomain} 외 다른 도메인을 확인했다면 도메인 제보로 남길 수 있습니다. 관리자가 중복과 연결성을 검토한 뒤 반영합니다.`,
    },
  ];
}

export function SiteDomainFaq({ context }: { context: SiteFaqContext }) {
  return (
    <SiteFaqList
      title={`${context.siteName} 주소·도메인 FAQ`}
      items={getDomainFaqItems(context)}
    />
  );
}
