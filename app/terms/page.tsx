import type { Metadata } from "next";
import {
  PolicyList,
  PolicyPage,
  PolicySection,
} from "@/app/components/policy-page";
import { siteUrl } from "@/lib/config";

const canonical = new URL("/terms", siteUrl).toString();
const effectiveDate = "2026년 5월 11일";

export const metadata: Metadata = {
  title: { absolute: "이용약관 | 토토사이트 정보" },
  description:
    "토토사이트 정보의 서비스 목적, 계정 관리, 후기·먹튀 제보 작성 기준, 관리자 검토, 책임 제한과 문의 방법을 안내합니다.",
  alternates: { canonical },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="이용약관"
      description="이 약관은 토토사이트 정보가 제공하는 사이트 정보, 후기, 먹튀 제보, 도메인 정보, AI 요약 보조 기능의 이용 기준을 설명합니다."
      effectiveDate={effectiveDate}
    >
      <PolicySection title="1. 서비스 목적">
        <p>
          토토사이트 정보는 사이트별 도메인, 공개 후기, 먹튀 제보, 관측 정보,
          관련 블로그 자료를 정리해 제공하는 정보 리포트 서비스입니다. 본
          서비스는 외부 토토사이트 이용, 도박 참여, 금전 거래를 권유하지
          않습니다.
        </p>
      </PolicySection>

      <PolicySection title="2. 회원 등록 및 계정 관리">
        <PolicyList
          items={[
            "회원은 본인이 관리하는 이메일 등 인증 정보를 사용해야 합니다.",
            "타인의 계정 또는 식별 정보를 사용할 수 없습니다.",
            "계정이 비정상 요청, 허위 제출, 반복 스팸에 사용되는 경우 이용이 제한될 수 있습니다.",
            "관리자는 서비스 보호와 부정 이용 방지를 위해 계정 상태를 확인할 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="3. 후기 작성 기준">
        <PolicyList
          items={[
            "후기는 작성자가 직접 경험했거나 확인 가능한 범위의 내용을 중심으로 작성해야 합니다.",
            "만족도 점수, 이용 카테고리, 환전·충전 경험, 고객센터 응답, 모바일 사용성 등 설문 항목은 공개 검토에 활용될 수 있습니다.",
            "타인 개인정보, 계좌번호, 지갑 주소, 연락처, 메신저 ID는 포함하지 않아야 합니다.",
            "광고성 문구, 대가성 홍보, 확인하기 어려운 단정 표현은 공개되지 않을 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="4. 먹튀 제보 작성 기준">
        <PolicyList
          items={[
            "먹튀 제보는 발생일, 이용 기간, 피해 유형, 피해 금액, 상황 설명, 증거 자료 등 확인 가능한 정보를 중심으로 작성해야 합니다.",
            "입금 관련 정보가 필요한 경우 공개 가능한 범위에서 제출하되, 공개 페이지에는 민감 정보가 노출되지 않도록 처리합니다.",
            "허위 내용, 과장된 단정, 타인 식별 정보가 포함된 제보는 반려되거나 비공개 처리될 수 있습니다.",
            "제보 내용은 작성자 주장과 제출 자료를 바탕으로 검토되며, 사실 확정을 의미하지 않습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="5. 허위 제보 및 광고성 게시물 금지">
        <PolicyList
          items={[
            "사실과 다른 내용으로 특정 사이트나 개인에게 피해를 주는 게시물을 금지합니다.",
            "광고, 홍보, 유도성 문구, 반복 제출은 제한될 수 있습니다.",
            "운영 흐름을 방해하는 자동화 요청이나 대량 제출은 차단될 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="6. 개인정보 포함 게시물 금지">
        <p>
          게시물에는 주민등록번호, 전화번호, 이메일, 계좌번호, 예금주, 지갑
          주소, 텔레그램 ID, 카카오톡 ID, 타인의 식별 정보가 포함되어서는 안
          됩니다. 발견 시 관리자는 해당 내용을 마스킹, 수정 요청, 비공개 처리
          또는 삭제할 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="7. 관리자 검토 및 비공개 처리 기준">
        <PolicyList
          items={[
            "후기와 제보는 관리자 검토 후 공개될 수 있습니다.",
            "개인정보, 민감 정보, 중복 내용, 허위 가능성, 과도한 비방, 광고성 문구가 있으면 비공개 처리될 수 있습니다.",
            "관리자는 공개 후에도 신고, 정정 요청, 추가 확인 필요성이 있는 게시물을 임시 비공개로 전환할 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="8. 사이트 정보의 성격">
        <p>
          사이트 정보, 후기, 제보, 도메인 기록, AI 요약은 참고 자료입니다.
          공개된 내용만으로 외부 사이트의 전체 상태나 분쟁 결과를 확정하지
          않습니다. 이용자는 관련 법령과 개인 사정을 고려해 스스로 판단해야
          합니다.
        </p>
      </PolicySection>

      <PolicySection title="9. 도박 참여 권유 아님">
        <p>
          토토사이트 정보는 외부 사이트 이용, 도박 참여, 금전 입금, 계정 생성,
          이벤트 참여를 권유하지 않습니다. 본 서비스는 정보 확인과 피해 제보
          정리를 목적으로 운영됩니다.
        </p>
      </PolicySection>

      <PolicySection title="10. 책임 제한">
        <PolicyList
          items={[
            "서비스에 표시되는 후기와 제보는 작성자 제출 자료와 관리자 검토 기준에 따라 공개됩니다.",
            "외부 사이트의 운영, 결제, 환전, 분쟁 처리에 대해 토토사이트 정보가 대신 책임지지 않습니다.",
            "기술적 장애, 데이터 지연, 외부 API 오류로 일부 정보가 늦게 반영될 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="11. 서비스 변경 및 중단">
        <p>
          운영자는 서비스 개선, 보안 대응, 법령 준수, 외부 서비스 장애, 시스템
          점검 등의 사유로 기능 일부를 변경하거나 일시 중단할 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="12. 문의 방법">
        <PolicyList
          items={[
            "담당 부서: 서비스 운영 담당",
            "이메일: TODO - 실제 운영 이메일 입력 필요",
            "문의 내용에는 요청 대상 URL, 작성 시점, 수정 또는 삭제 요청 사유를 함께 적어 주세요.",
          ]}
        />
      </PolicySection>
    </PolicyPage>
  );
}
