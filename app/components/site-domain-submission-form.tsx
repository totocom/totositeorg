"use client";

import { type FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteDomainSubmissionFormProps = {
  siteId: string;
  siteName: string;
};

type DuplicateSite = {
  id: string;
  name: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  publicUrl: string;
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeSiteName(siteName: string) {
  return siteName.replace(/\s+/g, " ").trim() || "해당 사이트";
}

export function SiteDomainSubmissionForm({
  siteId,
  siteName,
}: SiteDomainSubmissionFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [domainUrl, setDomainUrl] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [duplicateSites, setDuplicateSites] = useState<DuplicateSite[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedSiteName = normalizeSiteName(siteName);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setDuplicateSites([]);

    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
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
      duplicateSites?: DuplicateSite[];
    } | null;
    setIsSubmitting(false);

    if (!response.ok) {
      setDuplicateSites(body?.duplicateSites ?? []);
      setErrorMessage(body?.error ?? "도메인 추가 요청을 접수하지 못했습니다.");
      return;
    }

    setDomainUrl("");
    setDuplicateSites([]);
    setMessage("도메인 추가 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 border-t border-line px-4 py-4"
      noValidate
    >
      <div className="grid gap-2">
        <input
          value={domainUrl}
          onChange={(event) => {
            setDomainUrl(event.target.value);
            setMessage("");
            setErrorMessage("");
            setDuplicateSites([]);
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
          disabled={isSubmitting}
          className="min-h-10 rounded-md bg-accent px-4 py-2 text-sm font-semibold leading-5 text-white transition hover:bg-accent/80 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? "요청 중..." : `${normalizedSiteName} 도메인 추가`}
        </button>
      </div>
      {message ? (
        <p className="text-sm font-semibold text-accent">{message}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
      ) : null}
      {duplicateSites.length > 0 ? (
        <div className="grid gap-2">
          {duplicateSites.map((site) => (
            <a
              key={site.id}
              href={site.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:border-red-300 hover:bg-red-100"
            >
              {site.name} 게시물 보기
              <span className="ml-2 font-normal text-red-700">
                {site.status === "approved" ? "승인됨" : "검토 중"}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </form>
  );
}
