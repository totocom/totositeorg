"use client";

import { type FormEvent, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteDomainSubmissionFormProps = {
  siteId: string;
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function SiteDomainSubmissionForm({
  siteId,
}: SiteDomainSubmissionFormProps) {
  const { user } = useAuth();
  const [domainUrl, setDomainUrl] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("로그인 후 도메인 추가 요청을 보낼 수 있습니다.");
      return;
    }

    if (!isValidUrl(domainUrl)) {
      setErrorMessage("http:// 또는 https://로 시작하는 도메인 URL을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      setIsSubmitting(false);
      setErrorMessage("로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/site-domains/submit", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ siteId, domainUrl }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(body?.error ?? "도메인 추가 요청을 접수하지 못했습니다.");
      return;
    }

    setDomainUrl("");
    setMessage("도메인 추가 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 border-t border-line px-5 py-4"
      noValidate
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={domainUrl}
          onChange={(event) => {
            setDomainUrl(event.target.value);
            setMessage("");
            setErrorMessage("");
          }}
          disabled={!user || isSubmitting}
          className="h-10 rounded-md border border-line px-3 text-sm disabled:opacity-50"
          placeholder={
            user
              ? "추가할 도메인 URL 예: https://example-new.com"
              : "로그인 후 도메인 추가 요청 가능"
          }
        />
        <button
          type="submit"
          disabled={!user || isSubmitting}
          className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "요청 중..." : "도메인 추가"}
        </button>
      </div>
      {message ? (
        <p className="text-sm font-semibold text-accent">{message}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
      ) : null}
    </form>
  );
}
