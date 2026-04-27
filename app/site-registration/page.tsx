import type { Metadata } from "next";
import { SubmitSiteForm } from "@/app/components/submit-site-form";

export const metadata: Metadata = {
  title: "사이트 등록",
  description:
    "로그인한 회원이 토토사이트를 등록 요청할 수 있습니다. 제출된 사이트는 관리자 검수 후 공개됩니다.",
};

export default function SiteRegistrationPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          사이트 등록
        </p>
        <h1 className="mt-1 text-3xl font-bold">새 사이트 등록 요청</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          로그인한 회원만 사이트를 등록 요청할 수 있습니다. 대표 URL은
          필수이며, 추가 URL은 여러 개를 선택적으로 입력할 수 있습니다.
          WHOIS, DNS, 페이지 캡처 등 검수 정보는 관리자가 확인합니다.
        </p>
      </div>

      <SubmitSiteForm />
    </main>
  );
}
