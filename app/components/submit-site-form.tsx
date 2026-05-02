"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteFormValues = {
  siteNameKo: string;
  siteNameEn: string;
  siteUrl: string;
  domainsText: string;
};

type SiteFormErrors = Partial<Record<keyof SiteFormValues, string>>;
type FormStatus = "idle" | "submitting";
type SupabaseWriteError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};
type DuplicateSite = {
  id: string;
  name: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  publicUrl: string;
};
type DuplicateResult = {
  nameMatches: DuplicateSite[];
  urlMatches: DuplicateSite[];
  domainMatches: DuplicateSite[];
};

const defaultSiteCategory = "기타 베팅";
const defaultLicenseInfo = "관리자 등록 사이트";
const defaultSiteDescription =
  "회원이 등록 요청한 사이트입니다. 도메인과 기본 정보는 관리자 검토 대상입니다.";

const initialValues = (): SiteFormValues => ({
  siteNameKo: "",
  siteNameEn: "",
  siteUrl: "",
  domainsText: "",
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

function getSiteSubmissionErrorMessage(error: SupabaseWriteError) {
  const message = error.message ?? "";
  const details = error.details ?? "";
  const hint = error.hint ?? "";
  const debugDetail = [error.code, message, details, hint].filter(Boolean).join(" / ");

  if (error.code === "23505") {
    return "이미 등록되었거나 검토 중인 사이트 URL입니다.";
  }

  if (error.code === "42501") {
    return "제보를 저장할 권한이 없습니다. Supabase RLS 정책을 확인해주세요.";
  }

  if (
    error.code === "23514" &&
    message.includes("sites_description_length")
  ) {
    return "사이트 설명 기본값이 데이터베이스 검증 조건을 통과하지 못했습니다. 관리자에게 문의해주세요.";
  }

  if (error.code === "23514") {
    return `입력값이 데이터베이스 검증 조건을 통과하지 못했습니다. ${debugDetail}`;
  }

  if (error.code === "PGRST204" || message.includes("schema cache")) {
    return `Supabase 스키마가 최신 코드와 맞지 않습니다. supabase/schema.sql을 운영 DB에 다시 실행한 뒤 API 캐시를 새로고침해주세요. ${debugDetail}`;
  }

  if (message.includes("Could not find")) {
    return `운영 DB에 필요한 컬럼이 아직 없습니다. supabase/schema.sql을 다시 적용해주세요. ${debugDetail}`;
  }

  return `사이트 제보 저장 중 문제가 발생했습니다. ${debugDetail || "잠시 후 다시 시도해주세요."}`;
}

export function SubmitSiteForm() {
  const { user } = useAuth();
  const [values, setValues] = useState(() => initialValues());
  const [errors, setErrors] = useState<SiteFormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [allowSameNameDifferentSite, setAllowSameNameDifferentSite] =
    useState(false);

  const hasNameDuplicate = Boolean(duplicateResult?.nameMatches.length);
  const hasUrlDuplicate = Boolean(duplicateResult?.urlMatches.length);
  const hasDomainDuplicate = Boolean(duplicateResult?.domainMatches.length);
  const hasBlockingDuplicate = hasUrlDuplicate || hasDomainDuplicate;

  useEffect(() => {
    const hasName = values.siteNameKo.trim() || values.siteNameEn.trim();
    const hasUrl = values.siteUrl.trim();

    if (!hasName && !hasUrl) {
      return;
    }

    const invalidUrls = getDomainList(values).filter(
      (domain) => !isValidUrl(domain),
    );

    if (invalidUrls.length > 0) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsCheckingDuplicate(true);

      const response = await fetch("/api/sites/check-duplicate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          nameKo: values.siteNameKo,
          nameEn: values.siteNameEn,
          url: values.siteUrl,
          domains: getDomainList(values),
        }),
        signal: controller.signal,
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }

        return null;
      });
      const result = (await response?.json().catch(() => null)) as
        | DuplicateResult
        | null;

      if (controller.signal.aborted) {
        return;
      }

      setDuplicateResult(response?.ok && result ? result : null);
      setIsCheckingDuplicate(false);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [values]);

  function updateField<K extends keyof SiteFormValues>(
    field: K,
    value: SiteFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDuplicateResult(null);
    setAllowSameNameDifferentSite(false);
    setIsCheckingDuplicate(false);
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

    if (hasBlockingDuplicate) {
      nextErrors.siteUrl =
        "이미 등록되었거나 검토 중인 URL/도메인은 다시 제보할 수 없습니다.";
    }

    if (hasNameDuplicate && !allowSameNameDifferentSite) {
      nextErrors.siteNameKo =
        "같은 이름의 사이트가 있습니다. 동일명 다른 사이트인 경우 확인 체크를 해주세요.";
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

    const duplicateCheck = await checkDuplicates();

    if (duplicateCheck) {
      const blockingDuplicate =
        duplicateCheck.urlMatches.length > 0 ||
        duplicateCheck.domainMatches.length > 0;
      const nameDuplicate =
        duplicateCheck.nameMatches.length > 0 && !allowSameNameDifferentSite;

      if (blockingDuplicate || nameDuplicate) {
        setFormStatus("idle");
        setDuplicateResult(duplicateCheck);
        setErrors((current) => ({
          ...current,
          siteNameKo: nameDuplicate
            ? "같은 이름의 사이트가 있습니다. 동일명 다른 사이트인 경우 확인 체크를 해주세요."
            : current.siteNameKo,
          siteUrl: blockingDuplicate
            ? "이미 등록되었거나 검토 중인 URL/도메인은 다시 제보할 수 없습니다."
            : current.siteUrl,
        }));
        return;
      }
    }

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
        description: defaultSiteDescription,
        status: "pending",
      })
      .select("id")
      .single();

    setFormStatus("idle");

    if (error) {
      console.error("Site submission failed", error);
      setSubmitError(getSiteSubmissionErrorMessage(error));
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
    setDuplicateResult(null);
    setAllowSameNameDifferentSite(false);
  }

  async function checkDuplicates() {
    const response = await fetch("/api/sites/check-duplicate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nameKo: values.siteNameKo,
        nameEn: values.siteNameEn,
        url: values.siteUrl,
        domains: getDomainList(values),
      }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as
      | DuplicateResult
      | null;

    if (!response?.ok || !result) {
      return null;
    }

    return result;
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

      {isCheckingDuplicate ? (
        <div className="rounded-md border border-line bg-background px-4 py-3 text-sm text-muted">
          사이트 중복 여부를 확인하는 중입니다.
        </div>
      ) : null}

      {duplicateResult ? (
        <div className="grid gap-3">
          {duplicateResult.nameMatches.length > 0 ? (
            <DuplicateNotice
              title="같은 이름의 사이트가 있습니다"
              description="한글 이름 또는 영문 이름이 같은 사이트입니다. 동일명 다른 사이트라면 아래 확인 체크 후 제보할 수 있습니다."
              sites={duplicateResult.nameMatches}
              tone="warning"
            />
          ) : null}
          {duplicateResult.urlMatches.length > 0 ? (
            <DuplicateNotice
              title="이미 등록된 URL입니다"
              description="대표 URL 또는 추가 URL이 기존 사이트와 중복되어 제보할 수 없습니다."
              sites={duplicateResult.urlMatches}
              tone="danger"
            />
          ) : null}
          {duplicateResult.domainMatches.length > 0 ? (
            <DuplicateNotice
              title="이미 사용 중인 도메인입니다"
              description="같은 도메인을 사용하는 사이트가 있어 제보할 수 없습니다."
              sites={duplicateResult.domainMatches}
              tone="danger"
            />
          ) : null}
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

      {hasNameDuplicate && !hasBlockingDuplicate ? (
        <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <input
            type="checkbox"
            checked={allowSameNameDifferentSite}
            onChange={(event) =>
              setAllowSameNameDifferentSite(event.target.checked)
            }
            className="mt-1"
          />
          동일명 다른 사이트입니다. 이름은 같지만 대표 URL과 도메인이 다른
          별도 사이트로 제보합니다.
        </label>
      ) : null}

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

function DuplicateNotice({
  title,
  description,
  sites,
  tone,
}: {
  title: string;
  description: string;
  sites: DuplicateSite[];
  tone: "warning" | "danger";
}) {
  const wrapperClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <section className={`rounded-md border px-4 py-3 text-sm ${wrapperClass}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 leading-5">{description}</p>
      <div className="mt-3 grid gap-2">
        {sites.map((site) => (
          <a
            key={site.id}
            href={site.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-white/70 px-3 py-2 font-semibold underline"
          >
            {site.name} · {site.status === "approved" ? "게시물 보기" : "검토 중"}
          </a>
        ))}
      </div>
    </section>
  );
}
