"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ResetPasswordErrors = {
  password?: string;
  passwordConfirm?: string;
  form?: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ResetPasswordErrors = {};

    if (!password) {
      nextErrors.password = "새 비밀번호를 입력해주세요.";
    } else if (password.length < 6) {
      nextErrors.password = "비밀번호는 최소 6자 이상 입력해주세요.";
    }

    if (!passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    } else if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호가 서로 일치하지 않습니다.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setErrors({
        form: "비밀번호를 변경하지 못했습니다. 이메일의 재설정 링크로 다시 접속해주세요.",
      });
      return;
    }

    setPassword("");
    setPasswordConfirm("");
    setSuccessMessage("비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.");
    window.setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm"
      noValidate
    >
      {successMessage ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {successMessage}
        </div>
      ) : null}

      {errors.form ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errors.form}
        </div>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        새 비밀번호
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="최소 6자"
          autoComplete="new-password"
        />
        {errors.password ? (
          <span className="text-xs text-red-700">{errors.password}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        새 비밀번호 확인
        <input
          type="password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="비밀번호 재입력"
          autoComplete="new-password"
        />
        {errors.passwordConfirm ? (
          <span className="text-xs text-red-700">
            {errors.passwordConfirm}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
