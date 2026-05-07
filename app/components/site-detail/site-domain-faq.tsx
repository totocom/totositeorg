import { SiteFaqList } from "@/app/components/site-detail/site-faq-list";
import type { SiteFaqContext } from "@/app/components/site-detail/site-faq-context";
import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

export function getDomainFaqItems(context: SiteFaqContext): SiteFaqItem[] {
  if (context.domainCount === 0) {
    return [
      {
        question: `${context.siteName} 도메인 정보가 없으면 어떻게 봐야 하나요?`,
        answer:
          "공개 가능한 대표 도메인이나 추가 도메인이 아직 정리되지 않은 상태입니다. 도메인 정보가 없는 페이지는 사이트 안전성이나 이용 가능성을 판단하는 자료로 보기 어렵고, 후기와 먹튀 제보 같은 다른 공개 정보를 함께 확인해야 합니다.",
      },
      {
        question: "DNS 정보가 비어 있으면 어떤 의미인가요?",
        answer:
          "DNS 정보는 조회 시점과 공개 가능한 레코드에 따라 달라질 수 있습니다. 빈 값은 해당 레코드를 확인하지 못했다는 뜻이며, 위험 또는 안전을 확정하는 의미는 아닙니다.",
      },
      {
        question: "도메인 변경 제보도 가능한가요?",
        answer:
          "가능합니다. 대표 도메인 외 다른 도메인을 확인했거나 주소 변경 이력이 있다면 도메인 제보로 남길 수 있습니다. 관리자가 중복 여부와 연결성을 검토한 뒤 반영할 수 있습니다.",
      },
    ];
  }

  return [
    {
      question: `${context.siteName}의 대표 도메인과 추가 도메인은 어떻게 구분하나요?`,
      answer: `대표 도메인은 현재 사이트 정보에서 기준으로 삼는 주요 도메인이고, 추가 도메인은 같은 사이트와 연결된 것으로 등록되거나 관측된 도메인입니다. 도메인 수는 참고 자료이며 안전성이나 이용 가능성을 보장하지 않습니다. 현재 대표 도메인은 ${context.representativeDomain}로 표시합니다.`,
    },
    {
      question: "도메인 운영 이력은 안전성을 보장하나요?",
      answer:
        "아닙니다. 운영 이력은 참고 자료일 뿐이며, 도메인 생성일이나 DNS·WHOIS 정보만으로 사이트의 안전성이나 이용 결과를 단정할 수 없습니다.",
    },
    {
      question: "DNS 정보가 비어 있으면 어떤 의미인가요?",
      answer:
        "DNS 정보는 조회 시점과 공개 가능한 레코드에 따라 달라질 수 있습니다. 빈 값은 해당 레코드를 확인하지 못했다는 뜻이며, 위험 또는 안전을 확정하는 의미는 아닙니다.",
    },
    {
      question: "WHOIS 정보는 왜 확인하나요?",
      answer:
        "WHOIS 정보는 도메인 등록일, 등록기관, 만료일 등을 확인할 수 있는 기술적 참고 자료입니다. 일부 정보는 개인정보 보호 설정으로 비공개일 수 있습니다.",
    },
    {
      question: "도메인 변경 제보도 가능한가요?",
      answer:
        "가능합니다. 대표 도메인 외 다른 도메인을 확인했거나 주소 변경 이력이 있다면 도메인 제보로 남길 수 있습니다. 관리자가 중복 여부와 연결성을 검토한 뒤 반영할 수 있습니다.",
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
