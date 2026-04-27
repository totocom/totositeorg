import Link from "next/link";
import { SignupForm } from "@/app/components/signup-form";

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">회원가입</p>
        <h1 className="mt-1 text-3xl font-bold">새 계정 만들기</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          리뷰 작성과 사이트 제보 내역을 계정에 연결하기 위한 기본 회원
          기능입니다.
        </p>
      </div>

      <SignupForm />

      <p className="mt-4 text-sm text-muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-accent">
          로그인
        </Link>
      </p>
    </main>
  );
}
