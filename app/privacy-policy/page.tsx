import type { Metadata } from "next";
import {
  PolicyList,
  PolicyPage,
  PolicySection,
} from "@/app/components/policy-page";
import { siteUrl } from "@/lib/config";

const canonical = new URL("/privacy-policy", siteUrl).toString();
const effectiveDate = "2026년 5월 11일";

export const metadata: Metadata = {
  title: { absolute: "개인정보 처리방침 | 토토사이트 정보" },
  description:
    "토토사이트 정보의 개인정보 처리 목적, 수집 항목, 보유 기간, 제보·후기 공개 기준, 개인정보 보호 조치를 안내합니다.",
  alternates: { canonical },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy Policy"
      title="개인정보 처리방침"
      description="토토사이트 정보는 회원 계정, 후기, 먹튀 제보, 사이트 등록 요청, 도메인 제보, AI 요약 보조 기능 운영에 필요한 범위에서 개인정보를 처리합니다."
      effectiveDate={effectiveDate}
    >
      <PolicySection title="1. 개인정보 처리 목적">
        <PolicyList
          items={[
            "회원 등록 및 계정 관리",
            "사이트 등록 요청 접수와 처리",
            "이용 후기 접수, 검토, 공개 여부 판단",
            "먹튀 제보 접수, 검토, 공개 여부 판단",
            "도메인 정보 제보 접수와 관리",
            "중복 제출, 허위 제출, 비정상 요청 등 부정 이용 방지",
            "서비스 품질 개선과 오류 대응",
            "법령상 의무 이행과 분쟁 대응",
          ]}
        />
      </PolicySection>

      <PolicySection title="2. 수집하는 개인정보 항목">
        <div>
          <h3 className="font-bold text-foreground">회원/계정</h3>
          <PolicyList
            items={[
              "이메일",
              "닉네임 또는 작성자명",
              "로그인 인증 정보",
              "계정 상태 정보",
            ]}
          />
        </div>
        <div>
          <h3 className="font-bold text-foreground">후기 작성</h3>
          <PolicyList
            items={[
              "작성자명 또는 닉네임",
              "만족도 점수",
              "이용 목적, 이용 기간, 이용 카테고리",
              "환전/충전 관련 평가",
              "고객센터 평가",
              "이벤트 평가",
              "모바일 사용성 평가",
              "추가 의견",
            ]}
          />
        </div>
        <div>
          <h3 className="font-bold text-foreground">먹튀 제보</h3>
          <PolicyList
            items={[
              "작성자명 또는 닉네임",
              "발생일, 이용 기간, 이용 카테고리",
              "피해 유형, 피해 금액, 입금액",
              "상황 설명",
              "증거 이미지",
              "입금 관련 정보",
            ]}
          />
        </div>
        <div>
          <h3 className="font-bold text-foreground">사이트 등록 요청</h3>
          <PolicyList
            items={[
              "사이트명",
              "대표 도메인",
              "추가 도메인",
              "제보 내용",
              "작성자 정보",
            ]}
          />
        </div>
        <div>
          <h3 className="font-bold text-foreground">자동 수집 정보</h3>
          <PolicyList
            items={[
              "IP 주소",
              "User-Agent",
              "접속 일시",
              "쿠키",
              "세션 정보",
              "보안 로그",
            ]}
          />
        </div>
      </PolicySection>

      <PolicySection title="3. 공개 페이지 노출 기준">
        <PolicyList
          items={[
            "관리자 검토를 거쳐 승인된 후기와 제보만 공개합니다.",
            "작성자명은 공개 시 마스킹합니다.",
            "개인정보, 계좌번호, 예금주, 지갑 주소, 연락처, 텔레그램 ID, 카카오톡 ID는 공개하지 않습니다.",
            "피해 금액, 피해 유형, 이용 기간 등은 승인된 공개 제보 기준으로 표시될 수 있습니다.",
            "제보와 후기는 참고 자료이며 사실 확정을 의미하지 않습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="4. 개인정보 보유 및 이용 기간">
        <PolicyList
          items={[
            "회원 정보는 회원 탈퇴 시까지 보관합니다.",
            "후기와 제보 정보는 검토 및 공개 목적 달성 시까지 또는 삭제 요청 처리 시까지 보관합니다.",
            "부정 이용 방지 및 분쟁 대응 기록은 필요한 기간 동안 보관할 수 있습니다.",
            "법령상 보관 의무가 있는 경우 해당 기간 동안 보관합니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="5. 개인정보의 제3자 제공">
        <p>
          토토사이트 정보는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다.
          다만 법령상 요청이 있거나 정보주체가 별도로 동의한 경우에는 필요한
          범위에서 예외적으로 제공될 수 있습니다.
        </p>
      </PolicySection>

      <PolicySection title="6. 개인정보 처리 위탁">
        <p>
          현재 코드와 운영 환경에서 확인되는 외부 처리 항목은 다음과 같습니다.
          호스팅, DNS, CDN 사업자는 실제 배포 환경 확인 후 운영자가 별도로
          업데이트해야 합니다.
        </p>
        <PolicyList
          items={[
            "Supabase: 데이터베이스, 인증, 파일 저장, 접근 권한 관리",
            "OpenAI: 관리자 요청에 따른 AI 요약 및 검토 보조",
            "Anthropic: 관리자 요청에 따른 AI 초안 작성 및 검토 보조",
            "TODO: 실제 호스팅, DNS, CDN 사업자 확인 후 기재",
          ]}
        />
      </PolicySection>

      <PolicySection title="7. 개인정보 국외 이전">
        <p>
          Supabase, OpenAI, Anthropic 등 해외 사업자가 제공하는 서비스를 사용할
          수 있어 개인정보 또는 마스킹된 입력값이 국외에 보관되거나 처리될 수
          있습니다. 이전 국가, 이전받는 자, 이전 항목, 이전 목적, 보유 기간은
          실제 계약 및 배포 설정 기준으로 관리해야 합니다.
        </p>
        <PolicyList
          items={[
            "이전받는 자: Supabase, OpenAI, Anthropic",
            "이전 항목: 계정 정보, 후기·제보 검토 데이터, 파일 저장 데이터, AI 요약에 필요한 마스킹 데이터",
            "이전 목적: 서비스 운영, 인증, 데이터 저장, AI 요약 및 검토 보조",
            "보유 기간: 서비스 이용 목적 달성 시까지 또는 각 사업자 보관 정책 및 운영자 삭제 요청 처리 시까지",
            "TODO: 국가, 연락처, 세부 보유 기간은 실제 계약과 배포 환경 기준으로 확정",
          ]}
        />
      </PolicySection>

      <PolicySection title="8. AI 활용 안내">
        <PolicyList
          items={[
            "AI는 공개 가능한 사이트 정보, 승인된 후기, 승인된 제보, 도메인 정보를 요약·정리하는 보조 도구로 사용될 수 있습니다.",
            "개인정보와 민감 정보는 AI 입력 전에 마스킹하거나 제외하는 것을 원칙으로 합니다.",
            "AI가 생성한 내용은 관리자 검토 후 공개될 수 있습니다.",
          ]}
        />
      </PolicySection>

      <PolicySection title="9. 쿠키 및 자동 수집 장치">
        <PolicyList
          items={[
            "로그인 세션 유지",
            "보안 및 부정 이용 방지",
            "서비스 품질 개선",
            "분석 도구를 사용하는 경우 별도 고지 또는 설정에 따라 관리",
          ]}
        />
      </PolicySection>

      <PolicySection title="10. 정보주체의 권리">
        <PolicyList
          items={[
            "개인정보 열람 요청",
            "개인정보 정정 요청",
            "개인정보 삭제 요청",
            "개인정보 처리정지 요청",
            "동의 철회",
            "문의 창구를 통한 처리 결과 안내",
          ]}
        />
      </PolicySection>

      <PolicySection title="11. 개인정보 보호책임자 또는 문의 창구">
        <PolicyList
          items={[
            "담당 부서: 개인정보 보호 담당",
            "이메일: TODO - 실제 운영 이메일 입력 필요",
            "문의 방법: 운영 이메일 또는 별도 문의 페이지가 준비되는 경우 해당 페이지를 통해 접수",
          ]}
        />
      </PolicySection>

      <PolicySection title="12. 처리방침 변경">
        <p>
          개인정보 처리방침이 변경되는 경우 이 페이지에 시행일과 변경 내용을
          고지합니다. 중요한 변경이 있는 경우 서비스 화면의 공지 영역을 통해
          추가로 안내할 수 있습니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
