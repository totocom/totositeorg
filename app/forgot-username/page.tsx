import Link from "next/link";
import { ForgotUsernameForm } from "@/app/components/forgot-username-form";

export default function ForgotUsernamePage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          아이디 찾기
        </p>
        <h1 className="mt-1 text-3xl font-bold">가입 아이디 확인</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          가입 이메일을 입력하면 연결된 아이디와 닉네임을 확인할 수 있습니다.
        </p>
      </div>

      <ForgotUsernameForm />

      <p className="mt-4 text-sm text-muted">
        로그인 화면으로 돌아가려면{" "}
        <Link href="/login" className="font-semibold text-accent">
          로그인
        </Link>
      </p>
    </main>
  );
}
