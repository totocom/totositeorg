"use client";

import { FormEvent, useState } from "react";
import { siteUrl } from "@/lib/config";
import { supabase } from "@/lib/supabase/client";

type SignupErrors = {
  username?: string;
  nickname?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  telegram?: string;
  form?: string;
};

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isValidUsername(value: string) {
  return /^[a-z0-9_]{4,20}$/.test(value);
}

function createVerificationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(8);

  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function getTelegramSignupUrl(code: string) {
  if (!telegramBotUrl || !code) return "";

  try {
    const url = new URL(telegramBotUrl);
    url.searchParams.set("start", `signup_${code}`);
    return url.toString();
  } catch {
    const separator = telegramBotUrl.includes("?") ? "&" : "?";
    return `${telegramBotUrl}${separator}start=signup_${encodeURIComponent(code)}`;
  }
}

function getSignupRedirectUrl() {
  if (siteUrl && !siteUrl.includes("localhost")) {
    return `${siteUrl}/account`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/account`;
  }

  return "https://totosite.org/account";
}

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [telegramCode, setTelegramCode] = useState("");
  const [isTelegramVerified, setIsTelegramVerified] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramCopyMessage, setTelegramCopyMessage] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(false);

  function startTelegramVerification() {
    const code = createVerificationCode();
    const telegramUrl = getTelegramSignupUrl(code);

    setTelegramCode(code);
    setIsTelegramVerified(false);
    setTelegramCopyMessage("");
    setTelegramMessage(
      "텔레그램 봇에서 시작 버튼을 누른 뒤 이 화면으로 돌아와 인증 확인을 눌러주세요.",
    );
    setErrors((currentErrors) => ({ ...currentErrors, telegram: undefined }));

    if (telegramUrl) {
      window.open(telegramUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function copyTelegramStartCommand() {
    if (!telegramCode) {
      return;
    }

    const command = `/start signup_${telegramCode}`;

    try {
      await navigator.clipboard.writeText(command);
      setTelegramCopyMessage("인증 명령어를 복사했습니다.");
    } catch {
      setTelegramCopyMessage("복사하지 못했습니다. 명령어를 직접 선택해주세요.");
    }
  }

  async function checkTelegramVerification() {
    if (!telegramCode) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        telegram: "먼저 텔레그램 인증을 시작해주세요.",
      }));
      return;
    }

    setIsCheckingTelegram(true);
    const response = await fetch(
      `/api/telegram/signup-verification/status?code=${encodeURIComponent(
        telegramCode,
      )}`,
    ).catch(() => null);
    setIsCheckingTelegram(false);

    const result = (await response?.json().catch(() => null)) as {
      verified?: boolean;
      reason?: string;
      details?: string;
    } | null;

    if (!response?.ok || !result?.verified) {
      const reasonMessage =
        result?.reason === "db_error"
          ? "인증 정보를 확인하는 중 DB 오류가 발생했습니다. 관리자에게 문의해주세요."
          : result?.reason === "expired"
            ? "텔레그램 인증 코드가 만료되었습니다. 인증을 다시 시작해주세요."
            : result?.reason === "consumed"
              ? "이미 사용된 텔레그램 인증 코드입니다. 인증을 다시 시작해주세요."
              : "아직 텔레그램 인증이 확인되지 않았습니다. 봇 대화방에서 시작 버튼을 누른 뒤 다시 확인해주세요.";

      setIsTelegramVerified(false);
      setErrors((currentErrors) => ({
        ...currentErrors,
        telegram: reasonMessage,
      }));
      return;
    }

    setIsTelegramVerified(true);
    setTelegramMessage("텔레그램 인증이 확인되었습니다.");
    setErrors((currentErrors) => ({ ...currentErrors, telegram: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: SignupErrors = {};
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      nextErrors.username = "아이디를 입력해주세요.";
    } else if (!isValidUsername(normalizedUsername)) {
      nextErrors.username =
        "아이디는 영문 소문자, 숫자, 밑줄(_) 4~20자로 입력해주세요.";
    }

    if (!nickname.trim()) {
      nextErrors.nickname = "닉네임을 입력해주세요.";
    } else if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      nextErrors.nickname = "닉네임은 2~20자로 입력해주세요.";
    }

    if (!email.trim()) {
      nextErrors.email = "이메일을 입력해주세요.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "올바른 이메일 형식으로 입력해주세요.";
    }

    if (!password) {
      nextErrors.password = "비밀번호를 입력해주세요.";
    } else if (password.length < 6) {
      nextErrors.password = "비밀번호는 최소 6자 이상 입력해주세요.";
    }

    if (!passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    } else if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = "비밀번호가 서로 일치하지 않습니다.";
    }

    if (!telegramBotUrl) {
      nextErrors.telegram = "텔레그램 봇 링크 환경변수 설정이 필요합니다.";
    } else if (!isTelegramVerified) {
      nextErrors.telegram = "텔레그램 인증을 완료해주세요.";
    }

    setErrors(nextErrors);
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const usernameResponse = await fetch(
      `/api/auth/check-username?username=${encodeURIComponent(
        normalizedUsername,
      )}`,
    ).catch(() => null);
    const usernameResult = (await usernameResponse?.json().catch(() => null)) as {
      available?: boolean;
    } | null;

    if (!usernameResponse?.ok || !usernameResult?.available) {
      setIsSubmitting(false);
      setErrors({
        username: "이미 사용 중인 아이디이거나 확인할 수 없습니다.",
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getSignupRedirectUrl(),
        data: {
          username: normalizedUsername,
          nickname: nickname.trim(),
          telegram_signup_code: telegramCode,
        },
      },
    });
    setIsSubmitting(false);

    if (error) {
      setErrors({
        form: "회원가입에 실패했습니다. 입력 정보를 확인하거나 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    setUsername("");
    setNickname("");
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setTelegramCode("");
    setIsTelegramVerified(false);
    setTelegramCopyMessage("");
    setTelegramMessage("");
    setSuccessMessage(
      "회원가입 요청이 완료되었습니다. 이메일 인증을 위해 받은 편지함을 확인해주세요.",
    );
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
        아이디
        <input
          value={username}
          onChange={(event) => setUsername(normalizeUsername(event.target.value))}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="영문 소문자, 숫자, _"
          autoComplete="username"
        />
        {errors.username ? (
          <span className="text-xs text-red-700">{errors.username}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        닉네임
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="사이트에서 표시할 이름"
          autoComplete="nickname"
        />
        {errors.nickname ? (
          <span className="text-xs text-red-700">{errors.nickname}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        이메일
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

      <label className="grid gap-1 text-sm font-medium">
        비밀번호
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
        비밀번호 확인
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

      <section className="rounded-md border border-line bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">텔레그램 인증</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              봇을 시작하면 가입 후 승인 알림을 같은 대화로 받을 수 있습니다.
            </p>
            {telegramCode ? (
              <div className="mt-2 grid gap-2 text-xs text-muted">
                <p>
                  인증 코드 <span className="font-semibold">{telegramCode}</span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="break-all rounded bg-surface px-2 py-1.5">
                    /start signup_{telegramCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyTelegramStartCommand}
                    className="h-8 rounded-md border border-line px-3 text-xs font-semibold text-foreground"
                  >
                    인증키 복사
                  </button>
                </div>
                {telegramCopyMessage ? (
                  <p className="font-semibold text-accent">
                    {telegramCopyMessage}
                  </p>
                ) : (
                  <p>버튼 연결이 안 되면 복사한 인증키를 봇 대화방에 보내주세요.</p>
                )}
              </div>
            ) : null}
            {telegramMessage ? (
              <p className="mt-2 text-xs font-semibold text-accent">
                {telegramMessage}
              </p>
            ) : null}
            {errors.telegram ? (
              <p className="mt-2 text-xs text-red-700">{errors.telegram}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={startTelegramVerification}
              disabled={!telegramBotUrl}
              className="h-10 rounded-md border border-line px-3 text-xs font-semibold disabled:opacity-50"
            >
              텔레그램 인증 시작
            </button>
            <button
              type="button"
              onClick={checkTelegramVerification}
              disabled={!telegramCode || isCheckingTelegram}
              className="h-10 rounded-md bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isCheckingTelegram
                ? "확인 중..."
                : isTelegramVerified
                  ? "인증 완료"
                  : "인증 확인"}
            </button>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "가입 처리 중..." : "회원가입"}
      </button>
    </form>
  );
}
