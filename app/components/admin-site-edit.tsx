"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { ScreenshotUploadControl } from "@/app/components/screenshot-upload-control";
import { supabase } from "@/lib/supabase/client";

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  url: string;
  domains: string[] | null;
  screenshot_url: string | null;
  favicon_url: string | null;
  description: string;
};

type EditValues = {
  nameKo: string;
  nameEn: string;
  url: string;
  domainsText: string;
  screenshotUrl: string;
  faviconUrl: string;
  description: string;
};

type EditErrors = Partial<Record<keyof EditValues, string>>;

type AdminSiteEditProps = {
  siteId: string;
};

const initialValues: EditValues = {
  nameKo: "",
  nameEn: "",
  url: "",
  domainsText: "",
  screenshotUrl: "",
  faviconUrl: "",
  description: "",
};

type SiteMetadata = {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  faviconUrl: string;
  finalUrl: string;
  statusCode: number;
};

type WhoisInfo = {
  domain: string;
  registrar: string;
  whoisServer: string;
  updatedDate: string;
  creationDate: string;
  expirationDate: string;
  nameServers: string[];
  dnssec: string;
  provider?: WhoisProvider;
};

type WhoisLookupResult = WhoisInfo & {
  lookupUrl: string;
  lookupLabel: string;
};

type WhoisProvider = "api-ninjas" | "apilayer" | "auto";

type DnsInfo = {
  domain: string;
  a: string[];
  aaaa: string[];
  cname: string[];
  mx: string[];
  ns: string[];
  txt: string[];
  soa: string;
  errorMessage: string;
};

const whoisProviderOptions: { label: string; value: WhoisProvider }[] = [
  { label: "API-Ninjas", value: "api-ninjas" },
  { label: "APILayer", value: "apilayer" },
  { label: "자동 fallback", value: "auto" },
];

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
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

function getDomainList(values: EditValues) {
  return Array.from(
    new Set(
      [values.url, ...values.domainsText.split(/\r?\n|,/)]
        .map(normalizeUrl)
        .filter(Boolean),
    ),
  );
}

function getValidDomainList(values: EditValues) {
  return getDomainList(values).filter(isValidUrl);
}

function getDisplayName(values: EditValues) {
  const ko = values.nameKo.trim();
  const en = values.nameEn.trim();

  if (ko && en) return `${ko} (${en})`;
  return ko || en;
}

function valuesFromSite(site: SiteRow): EditValues {
  const domains =
    Array.isArray(site.domains) && site.domains.length > 0
      ? site.domains
      : [site.url];
  const extraDomains = domains.filter((domain) => domain !== site.url);

  return {
    nameKo: site.name_ko ?? site.name,
    nameEn: site.name_en ?? "",
    url: site.url,
    domainsText: extraDomains.join("\n"),
    screenshotUrl: site.screenshot_url ?? "",
    faviconUrl: site.favicon_url ?? "",
    description: site.description,
  };
}

function formatOptionalDate(value: string) {
  if (!value) return "확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function DnsRecord({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-white p-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 break-all text-foreground">
        {values.length > 0 ? values.join(", ") : "없음"}
      </dd>
    </div>
  );
}

function WhoisInfoCard({ whoisInfo }: { whoisInfo: WhoisLookupResult }) {
  return (
    <div className="grid gap-3 rounded-md border border-line bg-background p-4 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">
          WHOIS 정보 · {whoisInfo.lookupLabel}
          {whoisInfo.provider
            ? ` · ${
                whoisProviderOptions.find(
                  (option) => option.value === whoisInfo.provider,
                )?.label ?? whoisInfo.provider
              }`
            : ""}
        </p>
        <h3 className="mt-1 break-all text-base font-bold">
          {whoisInfo.domain}
        </h3>
        <p className="mt-1 break-all text-xs text-muted">
          조회 URL: {whoisInfo.lookupUrl}
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">등록기관</dt>
          <dd className="mt-1 text-foreground">
            {whoisInfo.registrar || "확인 불가"}
          </dd>
        </div>
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">등록일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.creationDate)}
          </dd>
        </div>
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">만료일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.expirationDate)}
          </dd>
        </div>
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">최근 갱신일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.updatedDate)}
          </dd>
        </div>
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">WHOIS 서버</dt>
          <dd className="mt-1 break-all text-foreground">
            {whoisInfo.whoisServer || "확인 불가"}
          </dd>
        </div>
        <div className="rounded-md bg-white p-3">
          <dt className="text-xs font-semibold text-muted">DNSSEC</dt>
          <dd className="mt-1 text-foreground">
            {whoisInfo.dnssec || "확인 불가"}
          </dd>
        </div>
      </dl>
      <div className="rounded-md bg-white p-3">
        <p className="text-xs font-semibold text-muted">네임서버</p>
        <p className="mt-1 break-all text-foreground">
          {whoisInfo.nameServers.length > 0
            ? whoisInfo.nameServers.join(", ")
            : "확인 불가"}
        </p>
      </div>
    </div>
  );
}

export function AdminSiteEdit({ siteId }: AdminSiteEditProps) {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();
  const [values, setValues] = useState<EditValues>(initialValues);
  const [errors, setErrors] = useState<EditErrors>({});
  const [siteSlug, setSiteSlug] = useState("");
  const [isLoadingSite, setIsLoadingSite] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<SiteMetadata | null>(null);
  const [isFetchingWhois, setIsFetchingWhois] = useState(false);
  const [whoisInfos, setWhoisInfos] = useState<WhoisLookupResult[]>([]);
  const [whoisProvider, setWhoisProvider] = useState<WhoisProvider>("auto");
  const [isFetchingDns, setIsFetchingDns] = useState(false);
  const [dnsInfo, setDnsInfo] = useState<DnsInfo | null>(null);
  const [isCapturingPage, setIsCapturingPage] = useState(false);
  const [isStoringFavicon, setIsStoringFavicon] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSite() {
      if (!isAdmin) {
        setIsLoadingSite(false);
        return;
      }

      setIsLoadingSite(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("sites")
        .select("id, slug, name, name_ko, name_en, url, domains, screenshot_url, favicon_url, description")
        .eq("id", siteId)
        .single();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setErrorMessage("사이트 정보를 불러오지 못했습니다.");
        setIsLoadingSite(false);
        return;
      }

      const site = data as SiteRow;
      setValues(valuesFromSite(site));
      setSiteSlug(site.slug);
      setIsLoadingSite(false);
    }

    if (!isLoading) {
      loadSite();
    }

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isLoading, siteId]);

  function updateField<K extends keyof EditValues>(key: K, value: EditValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };

      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
    setErrorMessage("");
  }

  function validate() {
    const nextErrors: EditErrors = {};

    if (!values.nameKo.trim() && !values.nameEn.trim()) {
      nextErrors.nameKo = "한글 이름 또는 영어 이름 중 하나를 입력해주세요.";
    }

    if (!values.url.trim()) {
      nextErrors.url = "대표 URL을 입력해주세요.";
    } else if (!isValidUrl(values.url.trim())) {
      nextErrors.url = "http:// 또는 https://로 시작하는 URL을 입력해주세요.";
    }

    const invalidDomains = getDomainList(values).filter(
      (domain) => !isValidUrl(domain),
    );

    if (invalidDomains.length > 0) {
      nextErrors.domainsText =
        "추가 도메인은 http:// 또는 https://로 시작하는 URL만 입력해주세요.";
    }

    if (values.screenshotUrl.trim() && !isValidUrl(values.screenshotUrl.trim())) {
      nextErrors.screenshotUrl = "캡처 이미지 URL 형식이 올바르지 않습니다.";
    }

    if (values.faviconUrl.trim() && !isValidUrl(values.faviconUrl.trim())) {
      nextErrors.faviconUrl = "파비콘 이미지 URL 형식이 올바르지 않습니다.";
    }

    if (values.description.trim().length < 30) {
      nextErrors.description = "사이트 설명은 최소 30자 이상 입력해주세요.";
    }

    return nextErrors;
  }

  async function getAdminToken() {
    const { data: sessionResult } = await supabase.auth.getSession();
    return sessionResult.session?.access_token ?? "";
  }

  async function storeFaviconUrl(faviconUrl: string) {
    const trimmedUrl = faviconUrl.trim();

    if (!trimmedUrl) return "";

    const token = await getAdminToken();

    if (!token) {
      throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
    }

    const response = await fetch("/api/admin/sites/favicon", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: trimmedUrl }),
    });
    const result = (await response.json().catch(() => null)) as
      | { faviconUrl?: string; error?: string }
      | null;

    if (!response.ok || !result?.faviconUrl) {
      throw new Error(result?.error ?? "파비콘 파일을 저장소에 복사하지 못했습니다.");
    }

    return result.faviconUrl;
  }

  async function saveFaviconToStorage() {
    setMessage("");
    setErrorMessage("");

    if (!values.faviconUrl.trim() || !isValidUrl(values.faviconUrl.trim())) {
      setErrors((current) => ({
        ...current,
        faviconUrl: "저장할 http:// 또는 https:// 파비콘 URL을 입력해주세요.",
      }));
      return;
    }

    setIsStoringFavicon(true);

    try {
      const storedFaviconUrl = await storeFaviconUrl(values.faviconUrl);
      setValues((current) => ({
        ...current,
        faviconUrl: storedFaviconUrl,
      }));
      setMessage("파비콘을 저장소에 복사했습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "파비콘 파일을 저장소에 복사하지 못했습니다.",
      );
    } finally {
      setIsStoringFavicon(false);
    }
  }

  async function fetchSiteMetadata() {
    setMessage("");
    setErrorMessage("");

    if (!values.url.trim() || !isValidUrl(values.url.trim())) {
      setErrors((current) => ({
        ...current,
        url: "정보를 가져올 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsFetchingMetadata(true);
    const token = await getAdminToken();

    if (!token) {
      setIsFetchingMetadata(false);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/fetch-metadata", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: values.url.trim() }),
    });
    const result = (await response.json().catch(() => null)) as
      | (SiteMetadata & { error?: string })
      | null;

    setIsFetchingMetadata(false);

    if (!response.ok || !result) {
      setErrorMessage(result?.error ?? "도메인 정보를 가져오지 못했습니다.");
      return;
    }

    setMetadata(result);
    setValues((current) => ({
      ...current,
      nameKo: current.nameKo.trim() || result.siteName || result.title,
      faviconUrl: current.faviconUrl.trim() || result.faviconUrl || "",
      description:
        current.description.trim().length >= 30
          ? current.description
          : result.description || current.description,
    }));
    setMessage("도메인 정보를 가져왔습니다.");
  }

  async function fetchWhoisInfo() {
    setMessage("");
    setErrorMessage("");
    setWhoisInfos([]);
    const lookupUrls = getValidDomainList(values);

    if (lookupUrls.length === 0) {
      setErrors((current) => ({
        ...current,
        url: "WHOIS를 조회할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsFetchingWhois(true);
    const token = await getAdminToken();

    if (!token) {
      setIsFetchingWhois(false);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const results: WhoisLookupResult[] = [];

    for (const [index, lookupUrl] of lookupUrls.entries()) {
      const response = await fetch("/api/admin/sites/whois", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: lookupUrl, provider: whoisProvider }),
      });
      const result = (await response.json().catch(() => null)) as
        | (WhoisInfo & { error?: string })
        | null;

      if (!response.ok || !result) {
        setErrorMessage(
          `${lookupUrl} WHOIS 정보를 가져오지 못했습니다. ${
            result?.error ?? ""
          }`.trim(),
        );
        setIsFetchingWhois(false);
        return;
      }

      results.push({
        ...result,
        lookupUrl,
        lookupLabel: index === 0 ? "대표 URL" : `추가 도메인 ${index}`,
      });
    }

    setIsFetchingWhois(false);
    setWhoisInfos(results);
    setMessage(`WHOIS 정보를 ${results.length}개 도메인에서 가져왔습니다.`);
  }

  async function fetchDnsInfo() {
    setMessage("");
    setErrorMessage("");

    if (!values.url.trim() || !isValidUrl(values.url.trim())) {
      setErrors((current) => ({
        ...current,
        url: "DNS를 조회할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsFetchingDns(true);
    const token = await getAdminToken();

    if (!token) {
      setIsFetchingDns(false);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/dns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: values.url.trim() }),
    });
    const result = (await response.json().catch(() => null)) as
      | (DnsInfo & { error?: string })
      | null;

    setIsFetchingDns(false);

    if (!response.ok || !result) {
      setErrorMessage(result?.error ?? "DNS 정보를 가져오지 못했습니다.");
      return;
    }

    setDnsInfo(result);
    setMessage("DNS 정보를 가져왔습니다.");
  }

  async function capturePage() {
    setMessage("");
    setErrorMessage("");

    if (!values.url.trim() || !isValidUrl(values.url.trim())) {
      setErrors((current) => ({
        ...current,
        url: "캡처할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsCapturingPage(true);

    const token = await getAdminToken();

    if (!token) {
      setIsCapturingPage(false);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/capture", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: values.url.trim() }),
    });
    const result = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          screenshotUrl?: string;
          source?: "lightsail" | "mshots";
          error?: string;
        }
      | null;

    setIsCapturingPage(false);

    if (!response.ok || !result?.ok || !result.screenshotUrl) {
      setErrorMessage(
        result?.error ?? "페이지 캡처 이미지를 생성하지 못했습니다.",
      );
      return;
    }

    setValues((current) => ({
      ...current,
      screenshotUrl: result.screenshotUrl ?? "",
    }));
    setMessage(
      result.source === "mshots"
        ? "Lightsail 캡처가 실패해 fallback 이미지가 저장되었습니다."
        : "Lightsail 서울 서버 캡처 이미지가 저장되었습니다.",
    );
  }

  async function saveSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    let faviconUrl = "";

    try {
      faviconUrl = await storeFaviconUrl(values.faviconUrl);
    } catch (error) {
      setIsSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "파비콘 파일을 저장소에 복사하지 못했습니다.",
      );
      return;
    }

    const { error } = await supabase
      .from("sites")
      .update({
        name: getDisplayName(values),
        name_ko: values.nameKo.trim() || null,
        name_en: values.nameEn.trim() || null,
        url: values.url.trim(),
        domains: getDomainList(values),
        screenshot_url: values.screenshotUrl.trim() || null,
        favicon_url: faviconUrl || null,
        description: values.description.trim(),
      })
      .eq("id", siteId);

    setIsSaving(false);

    if (error) {
      if (error.code === "23505") {
        setErrorMessage("이미 사용 중인 URL입니다.");
        return;
      }

      if (error.code === "23514") {
        setErrorMessage("DB 제약 조건에 맞지 않습니다. URL 또는 설명 길이를 확인해주세요.");
        return;
      }

      setErrorMessage("사이트 수정 중 문제가 발생했습니다.");
      return;
    }

    const token = await getAdminToken();

    if (token) {
      await fetch("/api/admin/sites/refresh-dns", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ siteId }),
      }).catch(() => null);
    }

    setMessage("사이트 정보가 수정되었습니다. 저장된 사이트로 이동합니다.");
    router.push(siteSlug ? `/sites/${siteSlug}` : "/admin");
  }

  if (isLoading || isLoadingSite) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          사이트 정보를 불러오는 중입니다.
        </section>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h1 className="text-2xl font-bold">관리자 권한이 필요합니다</h1>
          <p className="mt-2 text-sm text-muted">
            사이트 수정은 관리자만 사용할 수 있습니다.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            관리자 페이지로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm font-semibold text-accent">
        관리자 페이지로 돌아가기
      </Link>

      <section className="mt-5 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-accent">사이트 수정</p>
          <h1 className="mt-1 text-2xl font-bold">등록 사이트 정보 수정</h1>
          {siteSlug ? (
            <p className="mt-2 text-sm text-muted">현재 slug: {siteSlug}</p>
          ) : null}
        </div>

        {message ? (
          <div className="mb-4 rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form onSubmit={saveSite} className="grid gap-4" noValidate>
          <label className="grid gap-1 text-sm font-medium">
            사이트 한글 이름
            <input
              value={values.nameKo}
              onChange={(event) => updateField("nameKo", event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="예: 코리아"
            />
            {errors.nameKo ? (
              <span className="text-xs text-red-700">{errors.nameKo}</span>
            ) : null}
          </label>

          <label className="grid gap-1 text-sm font-medium">
            사이트 영어 이름
            <input
              value={values.nameEn}
              onChange={(event) => updateField("nameEn", event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="예: korea"
            />
          </label>

          <div className="grid gap-1 text-sm font-medium">
            대표 URL
            <div className="grid gap-2 xl:grid-cols-[1fr_auto_auto_auto_auto]">
              <input
                value={values.url}
                onChange={(event) => updateField("url", event.target.value)}
                className="h-11 rounded-md border border-line px-3 text-sm"
              />
              <button
                type="button"
                onClick={fetchSiteMetadata}
                disabled={isFetchingMetadata}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isFetchingMetadata ? "가져오는 중..." : "정보 가져오기"}
              </button>
              <button
                type="button"
                onClick={() => fetchWhoisInfo()}
                disabled={isFetchingWhois}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isFetchingWhois ? "조회 중..." : "WHOIS 조회"}
              </button>
              <button
                type="button"
                onClick={fetchDnsInfo}
                disabled={isFetchingDns}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isFetchingDns ? "조회 중..." : "DNS 조회"}
              </button>
              <button
                type="button"
                onClick={capturePage}
                disabled={isCapturingPage}
                className="h-11 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isCapturingPage ? "캡처 중..." : "페이지 캡처"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {whoisProviderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setWhoisProvider(option.value)}
                  aria-pressed={whoisProvider === option.value}
                  className={`h-9 rounded-md border px-3 text-xs font-semibold transition ${
                    whoisProvider === option.value
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-white text-foreground hover:bg-background"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.url ? (
              <span className="text-xs text-red-700">{errors.url}</span>
            ) : null}
          </div>

          {metadata ? (
            <div className="grid gap-3 rounded-md border border-line bg-background p-4 text-sm">
              <div className="flex items-start gap-3">
                {metadata.imageUrl || metadata.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={metadata.imageUrl || metadata.faviconUrl}
                    alt=""
                    className="h-16 w-16 rounded-md border border-line object-cover"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {metadata.siteName || metadata.title || "사이트명 정보 없음"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-muted">
                    {metadata.description || "설명 메타 정보가 없습니다."}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted">
                    최종 URL: {metadata.finalUrl} · HTTP {metadata.statusCode}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {whoisInfos.length > 0 ? (
            <div className="grid gap-3">
              {whoisInfos.map((whoisInfo) => (
                <WhoisInfoCard key={whoisInfo.lookupUrl} whoisInfo={whoisInfo} />
              ))}
            </div>
          ) : null}

          {dnsInfo ? (
            <div className="grid gap-3 rounded-md border border-line bg-background p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">
                  DNS 정보
                </p>
                <h3 className="mt-1 text-base font-bold">{dnsInfo.domain}</h3>
              </div>
              {dnsInfo.errorMessage ? (
                <p className="rounded-md bg-white p-3 text-muted">
                  {dnsInfo.errorMessage}
                </p>
              ) : null}
              <dl className="grid gap-3 sm:grid-cols-2">
                <DnsRecord label="A" values={dnsInfo.a} />
                <DnsRecord label="AAAA" values={dnsInfo.aaaa} />
                <DnsRecord label="CNAME" values={dnsInfo.cname} />
                <DnsRecord label="MX" values={dnsInfo.mx} />
                <DnsRecord label="NS" values={dnsInfo.ns} />
                <DnsRecord label="TXT" values={dnsInfo.txt} />
                <DnsRecord label="SOA" values={dnsInfo.soa ? [dnsInfo.soa] : []} />
              </dl>
            </div>
          ) : null}

          <label className="grid gap-1 text-sm font-medium">
            추가 도메인
            <textarea
              value={values.domainsText}
              onChange={(event) => updateField("domainsText", event.target.value)}
              className="min-h-24 rounded-md border border-line px-3 py-3 text-sm"
              placeholder={"대표 URL 외 추가 도메인을 한 줄에 하나씩 입력해주세요.\nhttps://example2.com"}
            />
            {errors.domainsText ? (
              <span className="text-xs text-red-700">{errors.domainsText}</span>
            ) : null}
          </label>

          <div className="grid gap-2 text-sm font-medium">
            파비콘 이미지
            <ScreenshotUploadControl
              value={values.faviconUrl}
              onChange={(url) => updateField("faviconUrl", url)}
              onMessage={setMessage}
              onError={setErrorMessage}
              accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
              buttonLabel="파비콘 업로드"
              placeholder="https://example.com/favicon.ico"
              successMessage="파비콘 이미지가 업로드되었습니다."
              description="자동 메타정보가 차단된 경우 파비콘 파일을 직접 업로드하거나 URL을 입력할 수 있습니다. PNG, JPG, WEBP, ICO 형식을 지원합니다."
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveFaviconToStorage}
                disabled={isStoringFavicon || !values.faviconUrl.trim()}
                className="h-10 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isStoringFavicon ? "저장 중..." : "파비콘 저장"}
              </button>
              <span className="text-xs text-muted">
                URL로 보이는 파비콘을 내 저장소 URL로 바꿉니다.
              </span>
            </div>
            {errors.faviconUrl ? (
              <span className="text-xs text-red-700">{errors.faviconUrl}</span>
            ) : null}
          </div>

          {values.faviconUrl ? (
            <div className="flex items-center gap-3 rounded-md border border-line bg-background p-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={values.faviconUrl}
                alt="파비콘 미리보기"
                className="h-10 w-10 rounded-md border border-line bg-white object-contain"
              />
              <span className="break-all text-muted">{values.faviconUrl}</span>
            </div>
          ) : null}

          <div className="grid gap-2 text-sm font-medium">
            캡처 이미지 URL
            <ScreenshotUploadControl
              value={values.screenshotUrl}
              onChange={(url) => updateField("screenshotUrl", url)}
              onMessage={setMessage}
              onError={setErrorMessage}
            />
            {errors.screenshotUrl ? (
              <span className="text-xs text-red-700">{errors.screenshotUrl}</span>
            ) : null}
          </div>

          {values.screenshotUrl ? (
            <div className="overflow-hidden rounded-md border border-line bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={values.screenshotUrl}
                alt="사이트 캡처 미리보기"
                className="aspect-video w-full object-cover"
              />
            </div>
          ) : null}

          <label className="grid gap-1 text-sm font-medium">
            사이트 설명
            <textarea
              value={values.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="min-h-32 rounded-md border border-line px-3 py-3 text-sm"
            />
            {errors.description ? (
              <span className="text-xs text-red-700">{errors.description}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="h-11 w-fit rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "수정 저장"}
          </button>
        </form>
      </section>
    </main>
  );
}
