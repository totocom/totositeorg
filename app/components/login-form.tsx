"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type LoginFormProps = {
  redirectTo: string;
};

type LoginErrors = {
  login?: string;
  password?: string;
  form?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};

    if (!login.trim()) {
      nextErrors.login = "아이디 또는 이메일을 입력해주세요.";
    }

    if (!password) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const resolveResponse = await fetch("/api/auth/resolve-login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ login: login.trim() }),
    }).catch(() => null);
    const resolveResult = (await resolveResponse?.json().catch(() => null)) as {
      email?: string;
      error?: string;
    } | null;

    if (!resolveResponse?.ok || !resolveResult?.email) {
      setIsSubmitting(false);
      setErrors({
        form: resolveResult?.error ?? "아이디 또는 비밀번호를 확인해주세요.",
      });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: resolveResult.email,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setErrors({
        form: "로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.",
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
        아이디 또는 이메일
        <input
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="아이디 또는 email@example.com"
          autoComplete="username"
        />
        {errors.login ? (
          <span className="text-xs text-red-700">{errors.login}</span>
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
          autoComplete="current-password"
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

      <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-accent">
        <Link href="/forgot-username">아이디 찾기</Link>
        <span className="text-muted">/</span>
        <Link href="/forgot-password">비밀번호 찾기</Link>
      </div>
    </form>
  );
}
