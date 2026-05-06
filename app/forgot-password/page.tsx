import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/app/components/forgot-password-form";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          비밀번호 찾기
        </p>
        <h1 className="mt-1 text-3xl font-bold">비밀번호 재설정</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          가입 이메일로 비밀번호 재설정 링크를 보내드립니다.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-4 text-sm text-muted">
        비밀번호가 기억났나요?{" "}
        <Link href="/login" className="font-semibold text-accent">
          로그인
        </Link>
      </p>
    </main>
  );
}
