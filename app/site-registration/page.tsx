import type { Metadata } from "next";
import { SubmitSiteForm } from "@/app/components/submit-site-form";

export const metadata: Metadata = {
  title: "사이트 등록",
  description:
    "로그인한 회원이 토토사이트를 등록 요청할 수 있습니다. 제출된 사이트는 관리자 검수 후 공개됩니다.",
};

export default function SiteRegistrationPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          사이트 등록
        </p>
        <h1 className="mt-1 text-3xl font-bold">새 사이트 등록 요청</h1>
      </div>

      <SubmitSiteForm />
    </main>
  );
}
