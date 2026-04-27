import Link from "next/link";
import { LoginForm } from "@/app/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">로그인</p>
        <h1 className="mt-1 text-3xl font-bold">계정 로그인</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          이메일과 비밀번호로 로그인합니다.
        </p>
      </div>

      <LoginForm redirectTo={redirectTo ?? "/account"} />

      <p className="mt-4 text-sm text-muted">
        계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-accent">
          회원가입
        </Link>
      </p>
    </main>
  );
}
