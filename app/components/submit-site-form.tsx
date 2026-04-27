"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteFormValues = {
  siteNameKo: string;
  siteNameEn: string;
  siteUrl: string;
  domainsText: string;
  shortDescription: string;
};

type SiteFormErrors = Partial<Record<keyof SiteFormValues, string>>;
type FormStatus = "idle" | "submitting";

const defaultSiteCategory = "기타 베팅";
const defaultLicenseInfo = "관리자 등록 사이트";

const initialValues = (): SiteFormValues => ({
  siteNameKo: "",
  siteNameEn: "",
  siteUrl: "",
  domainsText: "",
  shortDescription: "",
});

function isValidUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function getDomainList(values: SiteFormValues) {
  return Array.from(
    new Set(
      [values.siteUrl, ...values.domainsText.split(/\r?\n|,/)]
        .map(normalizeUrl)
        .filter(Boolean),
    ),
  );
}

function getDisplayName(values: SiteFormValues) {
  const ko = values.siteNameKo.trim();
  const en = values.siteNameEn.trim();

  if (ko && en) return `${ko} (${en})`;
  return ko || en;
}

function createSlug(name: string) {
  const baseSlug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "site";
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  return `${baseSlug}-${suffix}`;
}

export function SubmitSiteForm() {
  const { user } = useAuth();
  const [values, setValues] = useState(() => initialValues());
  const [errors, setErrors] = useState<SiteFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");

  function updateField<K extends keyof SiteFormValues>(
    field: K,
    value: SiteFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  }

  function validate() {
    const nextErrors: SiteFormErrors = {};

    if (!user) {
      nextErrors.siteNameKo = "로그인 후 사이트를 제보할 수 있습니다.";
    }

    if (!values.siteNameKo.trim() && !values.siteNameEn.trim()) {
      nextErrors.siteNameKo = "한글 이름 또는 영어 이름 중 하나를 입력해주세요.";
    }

    if (!values.siteUrl.trim()) {
      nextErrors.siteUrl = "공식 URL을 입력해주세요.";
    } else if (!isValidUrl(values.siteUrl.trim())) {
      nextErrors.siteUrl = "올바른 URL 형식으로 입력해주세요.";
    }

    const invalidDomains = getDomainList(values).filter(
      (domain) => !isValidUrl(domain),
    );

    if (invalidDomains.length > 0) {
      nextErrors.domainsText =
        "추가 URL은 http:// 또는 https://로 시작하는 URL만 입력해주세요.";
    }

    if (!values.shortDescription.trim()) {
      nextErrors.shortDescription = "간단 설명을 입력해주세요.";
    } else if (values.shortDescription.trim().length < 10) {
      nextErrors.shortDescription = "사이트 설명은 최소 10자 이상 입력해주세요.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setSubmitError("로그인 후 사이트를 제보할 수 있습니다.");
      return;
    }

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage("");
      setSubmitError("");
      return;
    }

    setFormStatus("submitting");
    setSuccessMessage("");
    setSubmitError("");

    const { data: insertedSite, error } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
        slug: createSlug(getDisplayName(values)),
        name: getDisplayName(values),
        name_ko: values.siteNameKo.trim() || null,
        name_en: values.siteNameEn.trim() || null,
        url: normalizeUrl(values.siteUrl),
        domains: getDomainList(values),
        category: defaultSiteCategory,
        available_states: ["전체"],
        license_info: defaultLicenseInfo,
        description: values.shortDescription.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    setFormStatus("idle");

    if (error) {
      if (error.code === "23505") {
        setSubmitError("이미 등록되었거나 검토 중인 사이트 URL입니다.");
        return;
      }

      if (error.code === "42501") {
        setSubmitError(
          "제보를 저장할 권한이 없습니다. Supabase RLS 정책을 확인해주세요.",
        );
        return;
      }

      setSubmitError(
        "사이트 제보 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    const notificationError = insertedSite?.id
      ? await sendSiteSubmissionNotification(insertedSite.id)
      : "";

    setSuccessMessage(
      notificationError
        ? `사이트 제보가 관리자 검토 대기 상태로 접수되었습니다. ${notificationError}`
        : "사이트 제보가 관리자 검토 대기 상태로 접수되었습니다.",
    );
    setValues(initialValues());
  }

  async function sendSiteSubmissionNotification(siteId: string) {
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return "다만 텔레그램 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/telegram/site-submitted", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ siteId }),
    });

    if (response.ok) {
      return "";
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return `다만 텔레그램 알림 전송에 실패했습니다. ${
      body?.error ?? "환경변수와 봇 설정을 확인해주세요."
    }`;
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          사이트 제보는 로그인한 회원만 작성할 수 있습니다.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
        >
          로그인하기
        </a>
      </section>
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
          {successMessage} 관리자 검토 후 공개됩니다.
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {submitError}
        </div>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        사이트 한글 이름
        <input
          value={values.siteNameKo}
          onChange={(event) => updateField("siteNameKo", event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="예: 코리아"
        />
        {errors.siteNameKo ? (
          <span className="text-xs text-red-700">{errors.siteNameKo}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        사이트 영어 이름
        <input
          value={values.siteNameEn}
          onChange={(event) => updateField("siteNameEn", event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="예: korea"
        />
        {errors.siteNameEn ? (
          <span className="text-xs text-red-700">{errors.siteNameEn}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        대표 URL 필수
        <input
          value={values.siteUrl}
          onChange={(event) => updateField("siteUrl", event.target.value)}
          className="h-11 rounded-md border border-line px-3 text-sm"
          placeholder="https://example.com"
        />
        {errors.siteUrl ? (
          <span className="text-xs text-red-700">{errors.siteUrl}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        추가 URL 선택
        <textarea
          value={values.domainsText}
          onChange={(event) => updateField("domainsText", event.target.value)}
          className="min-h-24 rounded-md border border-line px-3 py-3 text-sm"
          placeholder={"대표 URL 외 추가 도메인을 한 줄에 하나씩 입력해주세요.\nhttps://example2.com\nhttps://example3.com"}
        />
        <span className="text-xs text-muted">
          여러 개 입력할 수 있으며, 입력하지 않아도 등록 요청이 가능합니다.
        </span>
        {errors.domainsText ? (
          <span className="text-xs text-red-700">{errors.domainsText}</span>
        ) : null}
      </label>

      <label className="grid gap-1 text-sm font-medium">
        간단 설명
        <textarea
          value={values.shortDescription}
          onChange={(event) =>
            updateField("shortDescription", event.target.value)
          }
          className="min-h-32 rounded-md border border-line px-3 py-3 text-sm"
          placeholder="사이트의 서비스 범위와 확인이 필요한 정보를 중립적으로 작성해주세요."
        />
        {errors.shortDescription ? (
          <span className="text-xs text-red-700">
            {errors.shortDescription}
          </span>
        ) : null}
      </label>

      <div className="rounded-md border border-line bg-background p-4 text-sm">
        <p className="font-semibold text-foreground">승인 알림 안내</p>
        <p className="mt-1 leading-6 text-muted">
          등록 요청 승인 알림은 내 계정의 텔레그램 연결 상태에 따라
          전송됩니다.
        </p>
        <a
          href="/account"
          className="mt-3 inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-foreground"
        >
          계정에서 알림 연결하기
        </a>
      </div>

      <button
        type="submit"
        disabled={formStatus === "submitting"}
        className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white"
      >
        {formStatus === "submitting" ? "저장 중..." : "사이트 제보 제출"}
      </button>
    </form>
  );
}
