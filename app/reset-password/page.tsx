import { ResetPasswordForm } from "@/app/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          새 비밀번호
        </p>
        <h1 className="mt-1 text-3xl font-bold">비밀번호 변경</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          이메일의 재설정 링크로 접속한 뒤 새 비밀번호를 입력해주세요.
        </p>
      </div>

      <ResetPasswordForm />
    </main>
  );
}
