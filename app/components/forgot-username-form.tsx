"use client";

import { FormEvent, useState } from "react";

type ForgotUsernameErrors = {
  email?: string;
  form?: string;
};

type UsernameResult = {
  username: string;
  nickname: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotUsernameForm() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<UsernameResult | null>(null);
  const [errors, setErrors] = useState<ForgotUsernameErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: ForgotUsernameErrors = {};

    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    }

    setErrors(nextErrors);
    setResult(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/auth/find-username", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => null);
    setIsSubmitting(false);

    const body = (await response?.json().catch(() => null)) as {
      found?: boolean;
      username?: string;
      nickname?: string;
      error?: string;
    } | null;

    if (!response?.ok) {
      setErrors({
        form: body?.error ?? "아이디를 확인하지 못했습니다.",
      });
      return;
    }

    if (!body?.found || !body.username || !body.nickname) {
      setErrors({
        form: "해당 이메일로 가입된 아이디를 찾지 못했습니다.",
      });
      return;
    }

    setResult({
      username: body.username,
      nickname: body.nickname,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm"
      noValidate
    >
      {result ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm">
          <p className="font-semibold text-accent">가입 아이디: {result.username}</p>
          <p className="mt-1 text-muted">닉네임: {result.nickname}</p>
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
        {isSubmitting ? "확인 중..." : "아이디 찾기"}
      </button>
    </form>
  );
}
