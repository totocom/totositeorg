import type { Metadata } from "next";
import {
  PolicyList,
  PolicyPage,
  PolicySection,
} from "@/app/components/policy-page";
import { siteUrl } from "@/lib/config";

const canonical = new URL("/content-policy", siteUrl).toString();
const effectiveDate = "2026년 5월 11일";

export const metadata: Metadata = {
  title: { absolute: "후기·제보 운영정책 | 토토사이트 정보" },
  description:
    "토토사이트 정보의 후기와 먹튀 제보 공개 기준, 비공개 처리 기준, 작성자명 마스킹, 민감 정보 처리와 정정·삭제 요청 방법을 안내합니다.",
  alternates: { canonical },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContentPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Content Policy"
      title="후기·제보 운영정책"
      description="토토사이트 정보는 후기와 먹튀 제보를 정보 리포트 자료로 다루며, 개인정보 보호와 중복·허위 제출 방지를 위해 관리자 검토 후 공개합니다."
      effectiveDate={effectiveDate}
    >
      <PolicySection title="1. 후기 공개 기준">
        <PolicyList
          items={[
            "작성자가 제출한 만족도 점수와 설문 응답이 공개 가능한 형식인지 확인합니다.",
            "이용 목적, 이용 기간, 이용 카테고리, 환전·충전 평가, 고객센터 평가, 이벤트 평가, 모바일 사용성 평가 등은 요약 자료로 표시될 수 있습니다.",
            "작성자명은 마스킹해 표시합니다.",
            "후기는 작성자 경험을 바탕으로 한 참고 자료이며 사이트 전체 상태를 확정하지 않습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="2. 먹튀 제보 공개 기준">
        <PolicyList
          items={[
            "발생일, 이용 기간, 피해 유형, 피해 금액, 상황 설명, 증거 자료 등 확인 가능한 항목을 중심으로 검토합니다.",
            "승인된 제보는 피해 유형, 발생일, 이용 기간, 피해 금액 등 공개 가능한 범위만 표시합니다.",
            "입금 관련 민감 정보는 공개하지 않거나 마스킹합니다.",
            "제보는 작성자 주장과 제출 자료를 바탕으로 한 참고 자료이며 사실 확정을 의미하지 않습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="3. 승인되지 않을 수 있는 내용">
        <PolicyList
          items={[
            "허위 제보 또는 사실 확인이 어려운 내용",
            "광고성 후기 또는 홍보 목적의 반복 제출",
            "개인정보가 포함된 내용",
            "계좌번호, 지갑 주소, 연락처, 이메일, 텔레그램 ID, 카카오톡 ID가 포함된 내용",
            "욕설과 과도한 비방",
            "동일하거나 유사한 내용의 반복 제출",
            "확인하기 어려운 단정 표현",
            "관리자 메모, 내부 사유, 증빙 파일 경로처럼 공개 대상이 아닌 정보",
          ]}
        />
      </PolicySection>

      <PolicySection title="4. 작성자명 마스킹 기준">
        <PolicyList
          items={[
            "작성자명 또는 닉네임은 공개 시 일부 문자를 가려 표시합니다.",
            "짧은 이름, 식별 가능성이 높은 이름, 기본 표시명은 일반 대체 문구로 표시될 수 있습니다.",
            "관리자는 작성자 식별 가능성이 높다고 판단하면 추가 마스킹하거나 공개하지 않을 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="5. 민감 정보 비공개 기준">
        <p>
          전화번호, 이메일, 계좌번호, 예금주, 지갑 주소, 메신저 ID, 사용자 ID
          원문, IP, User-Agent, 증빙 이미지 경로, 내부 관리자 메모는 공개하지
          않습니다. 증거 이미지에 민감 정보가 포함되어 있으면 마스킹 또는
          비공개 처리될 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="6. 선택 필드의 공개 반영 범위">
        <PolicyList
          items={[
            "후기 카드 제목에는 주 이용 카테고리 1개와 전체 만족도 정도만 제한적으로 반영합니다.",
            "후기 요약문에는 주 이용 카테고리 또는 세부 종목, 대표 평가 항목 1~2개만 반영합니다.",
            "먹튀 제보 카드 제목에는 대표 피해 유형 최대 2개와 대표 카테고리 1개만 반영합니다.",
            "피해 금액, 작성자명, 입금 은행, 계좌번호, 예금주, 지갑 주소, 연락처, 메신저 ID는 SEO 문구나 카드 제목에 넣지 않습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="7. 정정 및 삭제 요청 방법">
        <PolicyList
          items={[
            "작성자는 본인이 제출한 후기 또는 제보의 정정·삭제를 요청할 수 있습니다.",
            "요청 시 게시물 URL, 작성 시점, 요청 사유, 본인 확인에 필요한 최소 정보를 함께 제출해야 합니다.",
            "개인정보 또는 민감 정보 노출이 확인되면 관리자는 우선 마스킹 또는 비공개 처리할 수 있습니다.",
            "이메일: TODO - 실제 운영 이메일 입력 필요",
          ]}
        />
      </PolicySection>

      <PolicySection title="8. 제보와 후기에 대한 안내">
        <p>
          제보와 후기는 정보 확인을 돕는 참고 자료입니다. 단일 후기나 단일
          제보만으로 외부 사이트의 전체 상태, 분쟁 결과, 사실 관계를 확정하지
          않습니다. 이용자는 공개된 자료의 작성 시점, 세부 항목, 도메인 정보,
          다른 공개 제보와 함께 신중히 비교해야 합니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
