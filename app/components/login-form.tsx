"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type LoginFormProps = {
  redirectTo: string;
};

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    }

    if (!password) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setErrors({
        form: "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.",
      });
      return;
    }

    router.push(redirectTo || "/account");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm"
      noValidate
    >
      {errors.form ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errors.form}
        </div>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        이메일
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="email@example.com"
        />
        {errors.email ? (
          <span className="text-xs text-red-700">{errors.email}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        비밀번호
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="비밀번호"
        />
        {errors.password ? (
          <span className="text-xs text-red-700">{errors.password}</span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
