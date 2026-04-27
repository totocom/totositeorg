"use client";

import { FormEvent, useState } from "react";
import { siteUrl } from "@/lib/config";
import { supabase } from "@/lib/supabase/client";

type ForgotPasswordErrors = {
  email?: string;
  form?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getResetRedirectUrl() {
  if (siteUrl && !siteUrl.includes("localhost")) {
    return `${siteUrl}/reset-password`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/reset-password`;
  }

  return "https://totosite.org/reset-password";
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ForgotPasswordErrors = {};

    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getResetRedirectUrl(),
    });
    setIsSubmitting(false);

    if (error) {
      setErrors({
        form: "비밀번호 재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    setEmail("");
    setSuccessMessage("비밀번호 재설정 링크를 이메일로 보냈습니다.");
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
        가입 이메일
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="email@example.com"
          autoComplete="email"
        />
        {errors.email ? (
          <span className="text-xs text-red-700">{errors.email}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "전송 중..." : "재설정 메일 받기"}
      </button>
    </form>
  );
}
