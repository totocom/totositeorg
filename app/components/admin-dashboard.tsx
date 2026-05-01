"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AdminBlogManager } from "@/app/components/admin-blog-manager";
import { useAuth } from "@/app/components/auth-provider";
import { ReviewSummary } from "@/app/components/review-summary";
import { ScreenshotUploadControl } from "@/app/components/screenshot-upload-control";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import {
  formatRatingScore,
  issueTypeLabels,
  moderationStatusLabels,
} from "@/app/data/sites";
import { supabase } from "@/lib/supabase/client";

type ModerationStatus = "pending" | "approved" | "rejected";
export type AdminSection =
  | "home"
  | "sites"
  | "rejected-sites"
  | "site-registration"
  | "blog"
  | "users"
  | "reviews"
  | "scam-reports"
  | "rejected-reviews"
  | "surveys";

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  url: string;
  domains: string[] | null;
  screenshot_url: string | null;
  screenshot_thumb_url: string | null;
  favicon_url: string | null;
  category: string;
  available_states: string[];
  license_info: string;
  status: ModerationStatus;
  description: string;
  contact_telegram: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  site_id: string;
  rating: number;
  title: string;
  experience: string;
  issue_type: keyof typeof issueTypeLabels;
  reviewer_name: string | null;
  reviewer_email: string | null;
  status: ModerationStatus;
  created_at: string;
  sites?: {
    name: string;
  }[] | null;
};

type ScamReportRow = {
  id: string;
  site_id: string;
  incident_date: string;
  usage_period: string;
  main_category: string;
  damage_types: string[] | null;
  damage_amount: number | null;
  damage_amount_unknown: boolean;
  situation_description: string;
  review_status: ModerationStatus;
  is_published: boolean;
  created_at: string;
  sites?: {
    name: string;
    url: string;
    screenshot_url: string | null;
    screenshot_thumb_url: string | null;
  }[] | null;
};

type SiteDomainSubmissionRow = {
  id: string;
  site_id: string;
  user_id: string | null;
  domain_url: string;
  status: ModerationStatus;
  created_at: string;
  sites?: {
    name: string;
    url: string;
  }[] | null;
};

type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  nickname: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  telegram_verified_at: string | null;
  telegram_username: string | null;
  telegram_is_active: boolean;
  is_admin: boolean;
  is_current_user: boolean;
};

type UpdatingItem = {
  table: "sites" | "reviews" | "scam_reports" | "site_domain_submissions";
  id: string;
  status: ModerationStatus;
} | null;

type DeletingItem = {
  table: "sites" | "reviews" | "scam_reports";
  id: string;
} | null;

type BlogDraftGeneration = {
  siteId: string;
  mode: "create" | "update";
} | null;

type EditingSlug = {
  siteId: string;
  value: string;
} | null;

type AdminSiteFormValues = {
  nameKo: string;
  nameEn: string;
  url: string;
  domainsText: string;
  faviconUrl: string;
  description: string;
};

type AdminSiteFormErrors = Partial<Record<keyof AdminSiteFormValues, string>>;

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

type AdminDataResult =
  | {
      sites: SiteRow[];
      reviews: ReviewRow[];
      scamReports: ScamReportRow[];
      siteDomainSubmissions: SiteDomainSubmissionRow[];
      errorMessage: "";
    }
  | {
      sites: [];
      reviews: [];
      scamReports: [];
      siteDomainSubmissions: [];
      errorMessage: string;
    };

const adminStatusLabels = moderationStatusLabels;
const defaultSiteCategory = "기타 베팅";
const defaultLicenseInfo = "관리자 등록 사이트";

const initialAdminSiteFormValues: AdminSiteFormValues = {
  nameKo: "",
  nameEn: "",
  url: "",
  domainsText: "",
  faviconUrl: "",
  description: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatOptionalDate(value: string) {
  if (!value) return "확인 불가";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function isRlsError(code?: string) {
  return code === "42501" || code === "PGRST301";
}

function getReviewSiteName(review: ReviewRow) {
  return review.sites?.[0]?.name ?? "알 수 없음";
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function refreshAdminCounts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin-counts-refresh"));
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return trimmed;
  }
}

function getDomainList(values: AdminSiteFormValues) {
  return Array.from(
    new Set(
      [values.url, ...values.domainsText.split(/\r?\n|,/)]
        .map(normalizeUrl)
        .filter(Boolean),
    ),
  );
}

function getValidDomainList(values: AdminSiteFormValues) {
  return getDomainList(values).filter(isValidUrl);
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

function getDisplayName(nameKo: string, nameEn: string) {
  const ko = nameKo.trim();
  const en = nameEn.trim();

  if (ko && en) return `${ko} (${en})`;
  return ko || en;
}

async function fetchAdminData(): Promise<AdminDataResult> {
  const [
    sitesResult,
    reviewsResult,
    scamReportsResult,
    siteDomainSubmissionsResult,
  ] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, screenshot_thumb_url, favicon_url, category, available_states, license_info, status, description, contact_telegram, created_at",
      )
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select(
        "id, site_id, rating, title, experience, issue_type, reviewer_name, reviewer_email, status, created_at, sites(name)",
      )
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, incident_date, usage_period, main_category, damage_types, damage_amount, damage_amount_unknown, situation_description, review_status, is_published, created_at, sites(name, url, screenshot_url, screenshot_thumb_url)",
      )
      .in("review_status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false }),
    supabase
      .from("site_domain_submissions")
      .select("id, site_id, user_id, domain_url, status, created_at, sites(name, url)")
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false }),
  ]);

  if (
    sitesResult.error ||
    reviewsResult.error ||
    scamReportsResult.error ||
    siteDomainSubmissionsResult.error
  ) {
    return {
      sites: [],
      reviews: [],
      scamReports: [],
      siteDomainSubmissions: [],
      errorMessage:
        "관리자 데이터를 불러오지 못했습니다. Supabase RLS 정책 또는 네트워크 상태를 확인해주세요.",
    };
  }

  return {
    sites: (sitesResult.data ?? []) as SiteRow[],
    reviews: (reviewsResult.data ?? []) as ReviewRow[],
    scamReports: (scamReportsResult.data ?? []) as ScamReportRow[],
    siteDomainSubmissions:
      (siteDomainSubmissionsResult.data ?? []) as SiteDomainSubmissionRow[],
    errorMessage: "",
  };
}

export function AdminDashboard({ section = "home" }: { section?: AdminSection }) {
  const { user } = useAuth();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [scamReports, setScamReports] = useState<ScamReportRow[]>([]);
  const [siteDomainSubmissions, setSiteDomainSubmissions] = useState<
    SiteDomainSubmissionRow[]
  >([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [usersErrorMessage, setUsersErrorMessage] = useState("");
  const [updatingItem, setUpdatingItem] = useState<UpdatingItem>(null);
  const [deletingItem, setDeletingItem] = useState<DeletingItem>(null);
  const [generatingBlogDraft, setGeneratingBlogDraft] =
    useState<BlogDraftGeneration>(null);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [editingSlug, setEditingSlug] = useState<EditingSlug>(null);
  const [slugErrorMessage, setSlugErrorMessage] = useState("");
  const [blogDraftMessage, setBlogDraftMessage] = useState("");
  const [siteFormValues, setSiteFormValues] = useState<AdminSiteFormValues>(
    initialAdminSiteFormValues,
  );
  const [siteFormErrors, setSiteFormErrors] = useState<AdminSiteFormErrors>({});
  const [siteFormMessage, setSiteFormMessage] = useState("");
  const [siteFormErrorMessage, setSiteFormErrorMessage] = useState("");
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<SiteMetadata | null>(null);
  const [metadataMessage, setMetadataMessage] = useState("");
  const [metadataErrorMessage, setMetadataErrorMessage] = useState("");
  const [isFetchingWhois, setIsFetchingWhois] = useState(false);
  const [whoisInfos, setWhoisInfos] = useState<WhoisLookupResult[]>([]);
  const [whoisProvider, setWhoisProvider] = useState<WhoisProvider>("auto");
  const [whoisMessage, setWhoisMessage] = useState("");
  const [whoisErrorMessage, setWhoisErrorMessage] = useState("");
  const [isFetchingDns, setIsFetchingDns] = useState(false);
  const [dnsInfo, setDnsInfo] = useState<DnsInfo | null>(null);
  const [dnsMessage, setDnsMessage] = useState("");
  const [dnsErrorMessage, setDnsErrorMessage] = useState("");
  const [pageCaptureUrl, setPageCaptureUrl] = useState("");
  const [pageCaptureThumbUrl, setPageCaptureThumbUrl] = useState("");
  const [pendingPageCaptureUrl, setPendingPageCaptureUrl] = useState("");
  const [pendingPageCaptureThumbUrl, setPendingPageCaptureThumbUrl] = useState("");
  const [isCapturingPage, setIsCapturingPage] = useState(false);
  const [isStoringFavicon, setIsStoringFavicon] = useState(false);
  const [pageCaptureMessage, setPageCaptureMessage] = useState("");
  const [pageCaptureErrorMessage, setPageCaptureErrorMessage] = useState("");

  const pendingSites = useMemo(
    () => sites.filter((site) => site.status === "pending"),
    [sites],
  );
  const approvedSites = useMemo(
    () => sites.filter((site) => site.status === "approved"),
    [sites],
  );
  const rejectedSites = useMemo(
    () => sites.filter((site) => site.status === "rejected"),
    [sites],
  );
  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending"),
    [reviews],
  );
  const approvedReviews = useMemo(
    () => reviews.filter((review) => review.status === "approved"),
    [reviews],
  );
  const rejectedReviews = useMemo(
    () => reviews.filter((review) => review.status === "rejected"),
    [reviews],
  );
  const pendingScamReports = useMemo(
    () => scamReports.filter((report) => report.review_status === "pending"),
    [scamReports],
  );
  const approvedScamReports = useMemo(
    () => scamReports.filter((report) => report.review_status === "approved"),
    [scamReports],
  );
  const rejectedScamReports = useMemo(
    () => scamReports.filter((report) => report.review_status === "rejected"),
    [scamReports],
  );
  const pendingSiteDomainSubmissions = useMemo(
    () =>
      siteDomainSubmissions.filter((submission) => submission.status === "pending"),
    [siteDomainSubmissions],
  );

  async function loadAdminData() {
    setIsLoading(true);
    setErrorMessage("");
    const result = await fetchAdminData();
    setErrorMessage(result.errorMessage);
    setSites(result.sites);
    setReviews(result.reviews);
    setScamReports(result.scamReports);
    setSiteDomainSubmissions(result.siteDomainSubmissions);
    setIsLoading(false);
    refreshAdminCounts();
  }

  async function loadAdminUsers() {
    setIsLoadingUsers(true);
    setUsersErrorMessage("");

    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      setAdminUsers([]);
      setUsersErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      setIsLoadingUsers(false);
      refreshAdminCounts();
      return;
    }

    const response = await fetch("/api/admin/users", {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    const result = (await response.json().catch(() => null)) as {
      users?: AdminUserRow[];
      error?: string;
    } | null;

    setIsLoadingUsers(false);

    if (!response.ok || !result?.users) {
      setAdminUsers([]);
      setUsersErrorMessage(
        result?.error ?? "회원 목록을 불러오지 못했습니다.",
      );
      refreshAdminCounts();
      return;
    }

    setAdminUsers(result.users);
    refreshAdminCounts();
  }

  useEffect(() => {
    let isMounted = true;

    fetchAdminData().then((result) => {
      if (!isMounted) {
        return;
      }

      setErrorMessage(result.errorMessage);
      setSites(result.sites);
      setReviews(result.reviews);
      setScamReports(result.scamReports);
      setSiteDomainSubmissions(result.siteDomainSubmissions);
      setIsLoading(false);
      refreshAdminCounts();
    });
    Promise.resolve().then(() => loadAdminUsers());

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateStatus(
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) {
    setUpdatingItem({ table, id, status });
    setErrorMessage("");

    const updatePayload =
      table === "scam_reports"
        ? {
            review_status: status,
            is_published: status === "approved",
            reviewed_at: new Date().toISOString(),
            approved_at: status === "approved" ? new Date().toISOString() : null,
            published_at: status === "approved" ? new Date().toISOString() : null,
          }
        : { status };

    const { error } = await supabase.from(table).update(updatePayload).eq("id", id);

    setUpdatingItem(null);

    if (error) {
      if (isRlsError(error.code)) {
        setErrorMessage(
          "상태 변경 권한이 없습니다. 현재 RLS 정책에서 public update가 막혀 있을 수 있습니다. 다음 단계에서 관리자 권한 정책을 추가해야 합니다.",
        );
        return;
      }

      setErrorMessage(
        "상태 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    let notificationError = "";

    if (table === "sites" && status === "approved") {
      await refreshSiteDns(id);
      notificationError = await sendSiteApprovalNotification(id);
    } else if (table === "reviews" && status === "approved") {
      notificationError = await sendContentApprovalNotification("review", id);
    } else if (table === "scam_reports" && status === "approved") {
      notificationError = await sendContentApprovalNotification("scam_report", id);
    }

    await loadAdminData();

    if (notificationError) {
      setErrorMessage(notificationError);
    }
  }

  async function reviewSiteDomainSubmission(
    submissionId: string,
    status: "approved" | "rejected",
  ) {
    setUpdatingItem({
      table: "site_domain_submissions",
      id: submissionId,
      status,
    });
    setErrorMessage("");

    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      setUpdatingItem(null);
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/site-domains/review", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ submissionId, status }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      siteId?: string;
    } | null;

    setUpdatingItem(null);

    if (!response.ok) {
      setErrorMessage(body?.error ?? "도메인 추가 요청 처리에 실패했습니다.");
      return;
    }

    if (status === "approved" && body?.siteId) {
      await refreshSiteDns(body.siteId);
    }

    await loadAdminData();
  }

  async function refreshSiteDns(siteId: string) {
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return;
    }

    await fetch("/api/admin/sites/refresh-dns", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ siteId }),
    }).catch(() => null);
  }

  async function sendSiteApprovalNotification(siteId: string) {
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return "사이트는 승인됐지만 등록자 텔레그램 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/admin/telegram/site-approved", {
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

    return `사이트는 승인됐지만 등록자 텔레그램 알림 전송에 실패했습니다. ${
      body?.error ?? "봇 연결 상태와 환경변수를 확인해주세요."
    }`;
  }

  async function sendContentApprovalNotification(
    type: "review" | "scam_report",
    contentId: string,
  ) {
    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      return "게시물은 승인됐지만 텔레그램 승인 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/admin/telegram/content-approved", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ type, contentId }),
    });

    if (response.ok) {
      return "";
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return `게시물은 승인됐지만 텔레그램 승인 알림 전송에 실패했습니다. ${
      body?.error ?? "봇 연결 상태와 환경변수를 확인해주세요."
    }`;
  }

  async function getAdminToken() {
    const { data: sessionResult } = await supabase.auth.getSession();
    return sessionResult.session?.access_token ?? "";
  }

  async function generateSiteBlogDraft(
    site: SiteRow,
    mode: "create" | "update",
  ) {
    const actionLabel =
      mode === "update" ? "AI 블로그 업데이트 초안" : "AI 블로그 초안";
    const confirmed = window.confirm(
      `${site.name} 사이트 데이터로 ${actionLabel}을 생성할까요? DNS/WHOIS를 최신 조회한 뒤 draft로 저장합니다.`,
    );

    if (!confirmed) return;

    setGeneratingBlogDraft({ siteId: site.id, mode });
    setErrorMessage("");
    setBlogDraftMessage("");

    try {
      const token = await getAdminToken();

      if (!token) {
        throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
      }

      const endpoint =
        mode === "update"
          ? `/api/admin/sites/${site.id}/generate-blog-update-draft`
          : `/api/admin/sites/${site.id}/generate-blog-draft`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json().catch(() => null)) as {
        post?: {
          slug?: string;
          title?: string;
        };
        error?: string;
        snapshotSummary?: {
          reviews: number;
          scamReports: number;
          dnsRecords: number;
          whoisRecords: number;
          sameIpSites: number;
        };
      } | null;

      if (!response.ok || !result?.post) {
        throw new Error(
          result?.error ?? `${actionLabel} 생성에 실패했습니다.`,
        );
      }

      const summary = result.snapshotSummary;
      const summaryText = summary
        ? ` 리뷰 ${summary.reviews}건, 피해 제보 ${summary.scamReports}건, DNS ${summary.dnsRecords}건, WHOIS ${summary.whoisRecords}건을 반영했습니다.`
        : "";

      setBlogDraftMessage(
        `${actionLabel}을 draft로 저장했습니다: /blog/${result.post.slug ?? ""}.${summaryText}`,
      );
      refreshAdminCounts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `${actionLabel} 생성 중 문제가 발생했습니다.`,
      );
    } finally {
      setGeneratingBlogDraft(null);
    }
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
    setMetadataMessage("");
    setMetadataErrorMessage("");
    setSiteFormMessage("");
    setSiteFormErrorMessage("");

    if (
      !siteFormValues.faviconUrl.trim() ||
      !isValidUrl(siteFormValues.faviconUrl.trim())
    ) {
      setSiteFormErrors((current) => ({
        ...current,
        faviconUrl: "저장할 http:// 또는 https:// 파비콘 URL을 입력해주세요.",
      }));
      return;
    }

    setIsStoringFavicon(true);

    try {
      const storedFaviconUrl = await storeFaviconUrl(siteFormValues.faviconUrl);
      setSiteFormValues((current) => ({
        ...current,
        faviconUrl: storedFaviconUrl,
      }));
      setMetadataMessage("파비콘을 저장소에 복사했습니다.");
    } catch (error) {
      setMetadataErrorMessage(
        error instanceof Error
          ? error.message
          : "파비콘 파일을 저장소에 복사하지 못했습니다.",
      );
    } finally {
      setIsStoringFavicon(false);
    }
  }

  async function deleteItem(table: "sites" | "reviews" | "scam_reports", id: string) {
    const confirmed = window.confirm(
      table === "sites"
        ? "사이트를 삭제하면 연결된 리뷰도 함께 삭제될 수 있습니다. 정말 삭제할까요?"
        : table === "scam_reports"
          ? "이 먹튀 제보를 완전히 삭제할까요?"
          : "이 리뷰를 완전히 삭제할까요?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingItem({ table, id });
    setErrorMessage("");

    const { error } = await supabase.from(table).delete().eq("id", id);

    setDeletingItem(null);

    if (error) {
      if (isRlsError(error.code)) {
        setErrorMessage(
          "삭제 권한이 없습니다. Supabase RLS에서 관리자 delete 정책을 확인해주세요.",
        );
        return;
      }

      setErrorMessage("삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    await loadAdminData();
  }

  async function deleteUser(targetUser: AdminUserRow) {
    if (targetUser.is_current_user) {
      setUsersErrorMessage("현재 로그인한 관리자 계정은 직접 삭제할 수 없습니다.");
      return;
    }

    const label =
      targetUser.email || targetUser.username || targetUser.nickname || targetUser.id;
    const confirmed = window.confirm(
      `${label} 회원을 삭제할까요? Auth 계정, 프로필, 텔레그램 연결이 삭제되며 작성 콘텐츠의 작성자 연결은 비워집니다.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(targetUser.id);
    setUsersErrorMessage("");

    const { data: sessionResult } = await supabase.auth.getSession();
    const accessToken = sessionResult.session?.access_token;

    if (!accessToken) {
      setDeletingUserId("");
      setUsersErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId: targetUser.id }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setDeletingUserId("");

    if (!response.ok) {
      setUsersErrorMessage(result?.error ?? "회원 삭제에 실패했습니다.");
      return;
    }

    await loadAdminUsers();
    await loadAdminData();
  }

  async function updateSlug(siteId: string, nextSlug: string) {
    const normalizedSlug = nextSlug.trim().toLowerCase();
    setSlugErrorMessage("");

    if (!isValidSlug(normalizedSlug)) {
      setSlugErrorMessage(
        "slug는 소문자, 숫자, 하이픈만 사용할 수 있으며 하이픈으로 시작하거나 끝날 수 없습니다.",
      );
      return;
    }

    const { error } = await supabase
      .from("sites")
      .update({ slug: normalizedSlug })
      .eq("id", siteId);

    if (error) {
      if (error.code === "23505") {
        setSlugErrorMessage("이미 사용 중인 slug입니다. 다른 값을 입력해주세요.");
        return;
      }

      if (error.code === "23514") {
        setSlugErrorMessage("slug 형식이 올바르지 않습니다.");
        return;
      }

      if (isRlsError(error.code)) {
        setSlugErrorMessage(
          "slug를 수정할 권한이 없습니다. 관리자 RLS 정책을 확인해주세요.",
        );
        return;
      }

      setSlugErrorMessage(
        "slug 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
      return;
    }

    setEditingSlug(null);
    await loadAdminData();
  }

  function updateSiteForm<K extends keyof AdminSiteFormValues>(
    key: K,
    value: AdminSiteFormValues[K],
  ) {
    setSiteFormValues((current) => {
      const next = { ...current, [key]: value };

      return next;
    });
    setSiteFormErrors((current) => ({ ...current, [key]: undefined }));
    setSiteFormMessage("");
    setSiteFormErrorMessage("");
    setMetadataMessage("");
    setMetadataErrorMessage("");
    setWhoisMessage("");
    setWhoisErrorMessage("");
    setDnsMessage("");
    setDnsErrorMessage("");
    if (key === "url") {
      setPendingPageCaptureUrl("");
    }
    setPageCaptureMessage("");
    setPageCaptureErrorMessage("");
  }

  function validateSiteForm() {
    const nextErrors: AdminSiteFormErrors = {};

    if (!siteFormValues.nameKo.trim() && !siteFormValues.nameEn.trim()) {
      nextErrors.nameKo = "한글 이름 또는 영어 이름 중 하나를 입력해주세요.";
    }

    if (!siteFormValues.url.trim()) {
      nextErrors.url = "사이트 URL을 입력해주세요.";
    } else if (!isValidUrl(siteFormValues.url.trim())) {
      nextErrors.url = "http:// 또는 https://로 시작하는 URL을 입력해주세요.";
    }

    const invalidDomains = getDomainList(siteFormValues).filter(
      (domain) => !isValidUrl(domain),
    );

    if (invalidDomains.length > 0) {
      nextErrors.domainsText =
        "추가 도메인은 http:// 또는 https://로 시작하는 URL만 입력해주세요.";
    }

    if (
      siteFormValues.faviconUrl.trim() &&
      !isValidUrl(siteFormValues.faviconUrl.trim())
    ) {
      nextErrors.faviconUrl = "파비콘 이미지 URL 형식이 올바르지 않습니다.";
    }

    if (siteFormValues.description.trim().length < 30) {
      nextErrors.description = "사이트 설명은 최소 30자 이상 입력해주세요.";
    }

    return nextErrors;
  }

  async function fetchSiteMetadata() {
    setMetadataMessage("");
    setMetadataErrorMessage("");
    setSiteFormMessage("");
    setSiteFormErrorMessage("");

    const url = siteFormValues.url.trim();
    if (!url || !isValidUrl(url)) {
      setSiteFormErrors((current) => ({
        ...current,
        url: "정보를 가져올 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsFetchingMetadata(true);

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;

    if (!token) {
      setIsFetchingMetadata(false);
      setMetadataErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/fetch-metadata", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json().catch(() => null)) as
      | (SiteMetadata & { error?: string })
      | null;

    setIsFetchingMetadata(false);

    if (!response.ok || !result) {
      setMetadataErrorMessage(
        result?.error ?? "도메인 정보를 가져오지 못했습니다.",
      );
      return;
    }

    setMetadata(result);
    setSiteFormValues((current) => ({
      ...current,
      nameKo: current.nameKo.trim() || result.siteName || result.title,
      faviconUrl: current.faviconUrl.trim() || result.faviconUrl || "",
      description:
        current.description.trim().length >= 30
          ? current.description
          : result.description || current.description,
    }));
    setMetadataMessage(
      "도메인 정보를 가져왔습니다. 비어 있거나 짧은 항목을 자동으로 채웠습니다.",
    );
  }

  async function fetchWhoisInfo(targetUrls = getValidDomainList(siteFormValues)) {
    setWhoisMessage("");
    setWhoisErrorMessage("");
    setSiteFormMessage("");
    setSiteFormErrorMessage("");
    setWhoisInfos([]);

    const lookupUrls = Array.from(new Set(targetUrls.map(normalizeUrl))).filter(
      isValidUrl,
    );

    if (lookupUrls.length === 0) {
      setSiteFormErrors((current) => ({
        ...current,
        url: "WHOIS를 조회할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    const results: WhoisLookupResult[] = [];
    setIsFetchingWhois(true);

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;

    if (!token) {
      setIsFetchingWhois(false);
      setWhoisErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

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
        setWhoisErrorMessage(
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
    setWhoisMessage(`WHOIS 정보를 ${results.length}개 도메인에서 가져왔습니다.`);
  }

  async function fetchDnsInfo() {
    setDnsMessage("");
    setDnsErrorMessage("");
    setSiteFormMessage("");
    setSiteFormErrorMessage("");

    const url = siteFormValues.url.trim();
    if (!url || !isValidUrl(url)) {
      setSiteFormErrors((current) => ({
        ...current,
        url: "DNS를 조회할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsFetchingDns(true);

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;

    if (!token) {
      setIsFetchingDns(false);
      setDnsErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/dns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json().catch(() => null)) as
      | (DnsInfo & { error?: string })
      | null;

    setIsFetchingDns(false);

    if (!response.ok || !result) {
      setDnsErrorMessage(result?.error ?? "DNS 정보를 가져오지 못했습니다.");
      return;
    }

    setDnsInfo(result);
    setDnsMessage("DNS 정보를 가져왔습니다.");
  }

  async function previewPageCapture() {
    setPageCaptureMessage("");
    setPageCaptureErrorMessage("");
    setSiteFormMessage("");
    setSiteFormErrorMessage("");

    const url = siteFormValues.url.trim();
    if (!url || !isValidUrl(url)) {
      setSiteFormErrors((current) => ({
        ...current,
        url: "캡처할 http:// 또는 https:// URL을 입력해주세요.",
      }));
      return;
    }

    setIsCapturingPage(true);

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;

    if (!token) {
      setIsCapturingPage(false);
      setPageCaptureErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    const response = await fetch("/api/admin/sites/capture", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          screenshotUrl?: string;
          screenshotThumbUrl?: string;
          source?: "lightsail" | "mshots";
          error?: string;
        }
      | null;

    setIsCapturingPage(false);

    if (!response.ok || !result?.ok || !result.screenshotUrl) {
      setPageCaptureErrorMessage(
        result?.error ?? "페이지 캡처 이미지를 생성하지 못했습니다.",
      );
      return;
    }

    setPendingPageCaptureUrl(result.screenshotUrl);
    setPendingPageCaptureThumbUrl(result.screenshotThumbUrl ?? "");
    setPageCaptureUrl("");
    setPageCaptureThumbUrl("");
    setPageCaptureMessage(
      result.source === "mshots"
        ? "Lightsail 캡처가 실패해 fallback 이미지가 생성되었습니다. 미리보기를 확인한 뒤 저장 여부를 선택해주세요."
        : "Lightsail 서울 서버 캡처 이미지가 생성되었습니다. 미리보기를 확인한 뒤 저장 여부를 선택해주세요.",
    );
  }

  function savePageCapturePreview() {
    if (!pendingPageCaptureUrl) return;

    setPageCaptureUrl(pendingPageCaptureUrl);
    setPageCaptureThumbUrl(pendingPageCaptureThumbUrl);
    setPendingPageCaptureUrl("");
    setPendingPageCaptureThumbUrl("");
    setPageCaptureMessage(
      "캡처 이미지가 선택되었습니다. 사이트 등록을 완료하면 사이트 목록과 상세 화면에 표시됩니다.",
    );
    setPageCaptureErrorMessage("");
  }

  function cancelPageCapturePreview() {
    setPendingPageCaptureUrl("");
    setPendingPageCaptureThumbUrl("");
    setPageCaptureUrl("");
    setPageCaptureThumbUrl("");
    setPageCaptureMessage("캡처 이미지 선택을 취소했습니다.");
    setPageCaptureErrorMessage("");
  }

  async function createSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateSiteForm();
    setSiteFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (pageCaptureUrl.trim() && !isValidUrl(pageCaptureUrl.trim())) {
      setSiteFormErrorMessage("수동 캡처 이미지 URL 형식이 올바르지 않습니다.");
      return;
    }

    setIsCreatingSite(true);
    setSiteFormMessage("");
    setSiteFormErrorMessage("");

    let faviconUrl = "";

    try {
      faviconUrl = await storeFaviconUrl(siteFormValues.faviconUrl);
    } catch (error) {
      setIsCreatingSite(false);
      setSiteFormErrorMessage(
        error instanceof Error
          ? error.message
          : "파비콘 파일을 저장소에 복사하지 못했습니다.",
      );
      return;
    }

    const { data: insertedSite, error: insertError } = await supabase
      .from("sites")
      .insert({
        user_id: user?.id ?? null,
        slug: createSlug(getDisplayName(siteFormValues.nameKo, siteFormValues.nameEn)),
        name: getDisplayName(siteFormValues.nameKo, siteFormValues.nameEn),
        name_ko: siteFormValues.nameKo.trim() || null,
        name_en: siteFormValues.nameEn.trim() || null,
        url: siteFormValues.url.trim(),
        domains: getDomainList(siteFormValues),
        screenshot_url: pageCaptureUrl.trim() || null,
        screenshot_thumb_url: pageCaptureThumbUrl.trim() || null,
        favicon_url: faviconUrl || null,
        category: defaultSiteCategory,
        available_states: ["전체"],
        license_info: defaultLicenseInfo,
        description: siteFormValues.description.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !insertedSite) {
      setIsCreatingSite(false);
      if (insertError?.code === "23505") {
        setSiteFormErrorMessage("이미 등록된 사이트 URL 또는 slug입니다.");
        return;
      }
      if (insertError?.code === "23514") {
        const detail = `${insertError.message ?? ""} ${insertError.details ?? ""}`;
        if (detail.includes("sites_category_allowed")) {
          setSiteFormErrorMessage(
            "DB의 카테고리 허용값이 아직 갱신되지 않았습니다. supabase/schema.sql의 sites_category_allowed 재생성 블록을 Supabase SQL Editor에서 다시 실행해주세요.",
          );
          return;
        }
        if (detail.includes("sites_description_length")) {
          setSiteFormErrorMessage("사이트 설명은 최소 30자 이상 입력해주세요.");
          return;
        }
        if (detail.includes("sites_available_states_not_empty")) {
          setSiteFormErrorMessage(
            "DB의 지역 제약 조건 때문에 저장에 실패했습니다. available_states 기본값 저장 로직을 확인해주세요.",
          );
          return;
        }
        setSiteFormErrorMessage(
          "DB 제약 조건에 맞지 않습니다. 카테고리 허용값 또는 설명 길이를 확인해주세요.",
        );
        return;
      }
      if (isRlsError(insertError?.code)) {
        setSiteFormErrorMessage(
          "사이트 등록 권한이 없습니다. Supabase RLS에서 관리자 insert/update 정책을 확인해주세요.",
        );
        return;
      }
      setSiteFormErrorMessage("사이트 등록 중 문제가 발생했습니다.");
      return;
    }

    setIsCreatingSite(false);
    setSiteFormValues(initialAdminSiteFormValues);
    setMetadata(null);
    setMetadataMessage("");
    setMetadataErrorMessage("");
    setWhoisInfos([]);
    setWhoisMessage("");
    setWhoisErrorMessage("");
    setDnsInfo(null);
    setDnsMessage("");
    setDnsErrorMessage("");
    setPageCaptureUrl("");
    setPageCaptureThumbUrl("");
    setPendingPageCaptureUrl("");
    setPendingPageCaptureThumbUrl("");
    setPageCaptureMessage("");
    setPageCaptureErrorMessage("");
    setSiteFormMessage("사이트가 등록되었습니다.");
    await loadAdminData();
  }

  const isUpdating = (
    table: "sites" | "reviews" | "scam_reports" | "site_domain_submissions",
    id: string,
    status: ModerationStatus,
  ) =>
    updatingItem?.table === table &&
    updatingItem.id === id &&
    updatingItem.status === status;
  const isDeleting = (table: "sites" | "reviews" | "scam_reports", id: string) =>
    deletingItem?.table === table && deletingItem.id === id;
  const isGeneratingBlogDraft = (siteId: string, mode: "create" | "update") =>
    generatingBlogDraft?.siteId === siteId && generatingBlogDraft.mode === mode;
  const showHome = section === "home";
  const showSites = section === "sites";
  const showRejectedSites = section === "rejected-sites";
  const showSiteRegistration = section === "site-registration";
  const showBlog = section === "blog";
  const showUsers = section === "users";
  const showReviews = section === "reviews" || section === "surveys";
  const showScamReports = section === "scam-reports";
  const showRejectedReviews = section === "rejected-reviews";
  const showModerationTables =
    showSites ||
    showRejectedSites ||
    showReviews ||
    showScamReports ||
    showRejectedReviews;
  return (
    <div className="grid w-full gap-5">
      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {slugErrorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {slugErrorMessage}
        </div>
      ) : null}

      {blogDraftMessage ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {blogDraftMessage}
        </div>
      ) : null}

      {showHome ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="승인 대기 사이트"
            value={pendingSites.length}
            href="/admin/sites"
          />
          <SummaryCard
            label="도메인 추가 요청"
            value={pendingSiteDomainSubmissions.length}
            href="/admin/sites#site-domain-submissions"
          />
          <SummaryCard
            label="승인 대기 리뷰"
            value={pendingReviews.length}
            href="/admin/reviews"
          />
          <SummaryCard
            label="승인 대기 먹튀 제보"
            value={pendingScamReports.length}
            href="/admin/scam-reports"
          />
          <SummaryCard
            label="승인된 사이트"
            value={approvedSites.length}
            href="/admin/sites#approved-sites"
          />
          <SummaryCard
            label="승인된 리뷰"
            value={approvedReviews.length}
            href="/admin/reviews#approved-reviews"
          />
          <SummaryCard
            label="승인된 먹튀 제보"
            value={approvedScamReports.length}
            href="/admin/scam-reports#approved-scam-reports"
          />
          <SummaryCard
            label="거절된 사이트"
            value={rejectedSites.length}
            href="/admin/rejected-sites"
          />
          <SummaryCard
            label="거절된 리뷰"
            value={rejectedReviews.length}
            href="/admin/rejected-reviews"
          />
          <SummaryCard
            label="거절된 먹튀 제보"
            value={rejectedScamReports.length}
            href="/admin/scam-reports#rejected-scam-reports"
          />
          <SummaryCard
            label="전체 회원"
            value={adminUsers.length}
            href="/admin/users"
          />
        </section>
      ) : null}

      {showUsers ? (
        <UserTable
          users={adminUsers}
          isLoading={isLoadingUsers}
          errorMessage={usersErrorMessage}
          deletingUserId={deletingUserId}
          onDeleteUser={deleteUser}
          onRefresh={loadAdminUsers}
        />
      ) : null}

      {showBlog ? <AdminBlogManager /> : null}

      {showSiteRegistration ? (
      <section
        id="site-registration"
        className="rounded-lg border border-line bg-surface p-5 shadow-sm"
      >
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase text-accent">사이트 등록</p>
          <h2 className="mt-1 text-xl font-bold">관리자 사이트 등록</h2>
          <p className="mt-2 text-sm text-muted">
            관리자가 직접 사이트 정보를 등록합니다. 지역 필드는 받지 않고 내부 기본값으로만 저장합니다.
          </p>
        </div>

        {siteFormMessage ? (
          <div className="mb-4 rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
            {siteFormMessage}
          </div>
        ) : null}

        {siteFormErrorMessage ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {siteFormErrorMessage}
          </div>
        ) : null}

        <form onSubmit={createSite} className="grid gap-4" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              사이트 한글 이름
              <input
                value={siteFormValues.nameKo}
                onChange={(event) => updateSiteForm("nameKo", event.target.value)}
                className="h-11 rounded-md border border-line px-3 text-sm"
                placeholder="예: 코리아"
              />
              {siteFormErrors.nameKo ? (
                <span className="text-xs text-red-700">{siteFormErrors.nameKo}</span>
              ) : null}
            </label>

            <label className="grid gap-1 text-sm font-medium">
              사이트 영어 이름
              <input
                value={siteFormValues.nameEn}
                onChange={(event) => updateSiteForm("nameEn", event.target.value)}
                className="h-11 rounded-md border border-line px-3 text-sm"
                placeholder="예: korea"
              />
            </label>

            <div className="grid gap-1 text-sm font-medium">
              <label htmlFor="admin-site-url">사이트 URL</label>
              <div className="grid gap-2 xl:grid-cols-[1fr_auto_auto_auto_auto]">
                <input
                  id="admin-site-url"
                  value={siteFormValues.url}
                  onChange={(event) => updateSiteForm("url", event.target.value)}
                  className="h-11 rounded-md border border-line px-3 text-sm"
                  placeholder="https://example.com"
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
                  onClick={previewPageCapture}
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
              {siteFormErrors.url ? (
                <span className="text-xs text-red-700">{siteFormErrors.url}</span>
              ) : null}
            </div>
          </div>

          {metadataMessage ? (
            <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              {metadataMessage}
            </div>
          ) : null}

          {metadataErrorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {metadataErrorMessage}
            </div>
          ) : null}

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

          <div className="grid gap-2 text-sm font-medium">
            파비콘 이미지
            <ScreenshotUploadControl
              value={siteFormValues.faviconUrl}
              onChange={(url) => updateSiteForm("faviconUrl", url)}
              onMessage={setMetadataMessage}
              onError={setMetadataErrorMessage}
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
                disabled={isStoringFavicon || !siteFormValues.faviconUrl.trim()}
                className="h-10 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
              >
                {isStoringFavicon ? "저장 중..." : "파비콘 저장"}
              </button>
              <span className="text-xs text-muted">
                URL로 보이는 파비콘을 내 저장소 URL로 바꿉니다.
              </span>
            </div>
            {siteFormErrors.faviconUrl ? (
              <span className="text-xs text-red-700">
                {siteFormErrors.faviconUrl}
              </span>
            ) : null}
          </div>

          {siteFormValues.faviconUrl ? (
            <div className="flex items-center gap-3 rounded-md border border-line bg-background p-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteFormValues.faviconUrl}
                alt="파비콘 미리보기"
                className="h-10 w-10 rounded-md border border-line bg-white object-contain"
              />
              <span className="break-all text-muted">
                {siteFormValues.faviconUrl}
              </span>
            </div>
          ) : null}

          <div className="grid gap-2 text-sm font-medium">
            수동 캡처 이미지
            <ScreenshotUploadControl
              value={pageCaptureUrl}
              onChange={(url, thumbUrl) => {
                setPageCaptureUrl(url);
                setPageCaptureThumbUrl(thumbUrl ?? "");
                setPendingPageCaptureUrl("");
                setPendingPageCaptureThumbUrl("");
                setPageCaptureErrorMessage("");
              }}
              onMessage={setPageCaptureMessage}
              onError={setPageCaptureErrorMessage}
            />
          </div>

          {pendingPageCaptureUrl ? (
            <div className="grid gap-3 rounded-md border border-line bg-background p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">
                  페이지 캡처 미리보기
                </p>
                <p className="mt-1 text-xs text-muted">
                  이 이미지를 사이트 목록에 사용할지 확인해주세요.
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingPageCaptureThumbUrl || pendingPageCaptureUrl}
                alt="입력한 사이트의 페이지 캡처 미리보기"
                className="aspect-video w-full rounded-md border border-line bg-white object-cover"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={savePageCapturePreview}
                  className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white"
                >
                  캡처 이미지 저장
                </button>
                <button
                  type="button"
                  onClick={cancelPageCapturePreview}
                  className="h-10 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-surface"
                >
                  취소
                </button>
              </div>
            </div>
          ) : null}

          {pageCaptureUrl ? (
            <div className="grid gap-3 rounded-md border border-accent bg-accent-soft p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">
                  저장할 캡처 이미지
                </p>
                <p className="mt-1 text-xs text-accent">
                  사이트 등록 완료 시 이 이미지가 사이트 목록과 상세 화면에 표시됩니다.
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageCaptureThumbUrl || pageCaptureUrl}
                alt="저장할 사이트 캡처 이미지"
                className="aspect-video w-full rounded-md border border-line bg-white object-cover"
              />
              <button
                type="button"
                onClick={cancelPageCapturePreview}
                className="h-10 w-fit rounded-md border border-line bg-white px-4 text-sm font-semibold transition hover:bg-background"
              >
                이미지 선택 취소
              </button>
            </div>
          ) : null}

          {pageCaptureMessage ? (
            <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              {pageCaptureMessage}
            </div>
          ) : null}

          {pageCaptureErrorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {pageCaptureErrorMessage}
            </div>
          ) : null}

          <label className="grid gap-1 text-sm font-medium">
            추가 도메인
            <textarea
              value={siteFormValues.domainsText}
              onChange={(event) =>
                updateSiteForm("domainsText", event.target.value)
              }
              className="min-h-24 rounded-md border border-line px-3 py-3 text-sm"
              placeholder={"대표 URL 외 추가 도메인을 한 줄에 하나씩 입력해주세요.\nhttps://example2.com\nhttps://example3.com"}
            />
            <span className="text-xs text-muted">
              대표 URL은 자동으로 도메인 목록에 포함됩니다.
            </span>
            {siteFormErrors.domainsText ? (
              <span className="text-xs text-red-700">
                {siteFormErrors.domainsText}
              </span>
            ) : null}
          </label>

          {whoisMessage ? (
            <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              {whoisMessage}
            </div>
          ) : null}

          {whoisErrorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {whoisErrorMessage}
            </div>
          ) : null}

          {whoisInfos.length > 0 ? (
            <div className="grid gap-3">
              {whoisInfos.map((whoisInfo) => (
                <WhoisInfoCard key={whoisInfo.lookupUrl} whoisInfo={whoisInfo} />
              ))}
            </div>
          ) : null}

          {dnsMessage ? (
            <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              {dnsMessage}
            </div>
          ) : null}

          {dnsErrorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {dnsErrorMessage}
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
            사이트 설명
            <textarea
              value={siteFormValues.description}
              onChange={(event) =>
                updateSiteForm("description", event.target.value)
              }
              className="min-h-28 rounded-md border border-line px-3 py-3 text-sm"
              placeholder="사이트의 서비스 범위와 확인이 필요한 정보를 작성해주세요."
            />
            {siteFormErrors.description ? (
              <span className="text-xs text-red-700">
                {siteFormErrors.description}
              </span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={isCreatingSite}
            className="h-11 w-fit rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isCreatingSite ? "등록 중..." : "사이트 등록"}
          </button>
        </form>
      </section>
      ) : null}

      {showModerationTables && isLoading ? (
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          관리자 데이터를 불러오는 중입니다.
        </section>
      ) : showModerationTables ? (
        <div className="grid gap-6">
          {showSites ? (
          <SiteDomainSubmissionTable
            submissions={pendingSiteDomainSubmissions}
            isUpdating={isUpdating}
            onReview={reviewSiteDomainSubmission}
            onFetchWhois={(domainUrl) => fetchWhoisInfo([domainUrl])}
            isFetchingWhois={isFetchingWhois}
          />
          ) : null}
          {showSites ? (
          <SiteTable
            anchorId="sites"
            title="승인 대기 사이트"
            sites={pendingSites}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
            editingSlug={editingSlug}
            setEditingSlug={setEditingSlug}
            onUpdateSlug={updateSlug}
            isGeneratingBlogDraft={isGeneratingBlogDraft}
            onGenerateBlogDraft={generateSiteBlogDraft}
          />
          ) : null}
          {showReviews ? (
          <ReviewTable
            anchorId="reviews"
            title="승인 대기 리뷰"
            reviews={pendingReviews}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
          {showScamReports ? (
          <ScamReportTable
            anchorId="scam-reports"
            title="승인 대기 먹튀 제보"
            reports={pendingScamReports}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
          {showSites ? (
          <SiteTable
            anchorId="approved-sites"
            title="승인된 사이트"
            sites={approvedSites}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
            editingSlug={editingSlug}
            setEditingSlug={setEditingSlug}
            onUpdateSlug={updateSlug}
            isGeneratingBlogDraft={isGeneratingBlogDraft}
            onGenerateBlogDraft={generateSiteBlogDraft}
          />
          ) : null}
          {showReviews ? (
          <ReviewTable
            anchorId="approved-reviews"
            title="승인된 리뷰"
            reviews={approvedReviews}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
          {showScamReports ? (
          <ScamReportTable
            anchorId="approved-scam-reports"
            title="승인된 먹튀 제보"
            reports={approvedScamReports}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
          {showRejectedSites ? (
          <SiteTable
            anchorId="rejected-sites"
            title="거절된 사이트"
            sites={rejectedSites}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
            editingSlug={editingSlug}
            setEditingSlug={setEditingSlug}
            onUpdateSlug={updateSlug}
            isGeneratingBlogDraft={isGeneratingBlogDraft}
            onGenerateBlogDraft={generateSiteBlogDraft}
          />
          ) : null}
          {showRejectedReviews ? (
          <ReviewTable
            anchorId="rejected-reviews"
            title="거절된 리뷰"
            reviews={rejectedReviews}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
          {showScamReports ? (
          <ScamReportTable
            anchorId="rejected-scam-reports"
            title="거절된 먹튀 제보"
            reports={rejectedScamReports}
            isUpdating={isUpdating}
            isDeleting={isDeleting}
            onUpdateStatus={updateStatus}
            onDelete={deleteItem}
          />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UserTable({
  users,
  isLoading,
  errorMessage,
  deletingUserId,
  onDeleteUser,
  onRefresh,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  errorMessage: string;
  deletingUserId: string;
  onDeleteUser: (user: AdminUserRow) => void;
  onRefresh: () => void;
}) {
  return (
    <section
      id="users"
      className="mb-6 overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">회원 관리</h2>
          <p className="mt-1 text-xs text-muted">
            회원 삭제는 Supabase Auth 계정과 프로필, 텔레그램 연결을 삭제합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 w-fit rounded-md border border-line px-3 text-xs font-semibold disabled:opacity-50"
        >
          {isLoading ? "새로고침 중..." : "회원 새로고침"}
        </button>
      </div>

      {errorMessage ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">회원</th>
              <th className="px-4 py-3 font-semibold">아이디</th>
              <th className="px-4 py-3 font-semibold">닉네임</th>
              <th className="px-4 py-3 font-semibold">이메일 인증</th>
              <th className="px-4 py-3 font-semibold">텔레그램</th>
              <th className="px-4 py-3 font-semibold">가입일</th>
              <th className="px-4 py-3 font-semibold">최근 로그인</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="border-t border-line">
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted">
                  회원 목록을 불러오는 중입니다.
                </td>
              </tr>
            ) : users.length > 0 ? (
              users.map((adminUser) => {
                const deleting = deletingUserId === adminUser.id;
                const canDelete = !adminUser.is_current_user;

                return (
                  <tr key={adminUser.id} className="border-t border-line">
                    <td className="px-4 py-4">
                      <p className="break-all font-semibold">
                        {adminUser.email || "이메일 없음"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted">
                        {adminUser.id}
                      </p>
                      {adminUser.is_admin ? (
                        <p className="mt-1 text-xs font-semibold text-accent">
                          관리자
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {adminUser.username || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {adminUser.nickname || "-"}
                    </td>
                    <td className="px-4 py-4">
                      {adminUser.email_confirmed_at ? "완료" : "미완료"}
                    </td>
                    <td className="px-4 py-4">
                      {adminUser.telegram_is_active ? (
                        <span>
                          연결됨
                          {adminUser.telegram_username
                            ? ` · @${adminUser.telegram_username}`
                            : ""}
                        </span>
                      ) : adminUser.telegram_verified_at ? (
                        "인증됨"
                      ) : (
                        "미연결"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(adminUser.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {adminUser.last_sign_in_at
                        ? formatDate(adminUser.last_sign_in_at)
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={!canDelete || deleting}
                        onClick={() => onDeleteUser(adminUser)}
                        className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        {adminUser.is_current_user
                          ? "현재 계정"
                          : deleting
                            ? "삭제 중..."
                            : "회원 삭제"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={8} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border border-line bg-surface p-4 shadow-sm transition hover:border-accent hover:bg-background"
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </a>
  );
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
          {formatDisplayDomain(whoisInfo.domain)}
        </h3>
        <p className="mt-1 break-all text-xs text-muted">
          조회 URL: {formatDisplayUrl(whoisInfo.lookupUrl)}
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

function SiteDomainSubmissionTable({
  submissions,
  isUpdating,
  onReview,
  onFetchWhois,
  isFetchingWhois,
}: {
  submissions: SiteDomainSubmissionRow[];
  isUpdating: (
    table: "sites" | "reviews" | "scam_reports" | "site_domain_submissions",
    id: string,
    status: ModerationStatus,
  ) => boolean;
  onReview: (submissionId: string, status: "approved" | "rejected") => void;
  onFetchWhois: (domainUrl: string) => void;
  isFetchingWhois: boolean;
}) {
  return (
    <section
      id="site-domain-submissions"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">도메인 추가 요청</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">사이트</th>
              <th className="px-4 py-3 font-semibold">추가 도메인</th>
              <th className="px-4 py-3 font-semibold">요청일</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length > 0 ? (
              submissions.map((submission) => {
                const approving = isUpdating(
                  "site_domain_submissions",
                  submission.id,
                  "approved",
                );
                const rejecting = isUpdating(
                  "site_domain_submissions",
                  submission.id,
                  "rejected",
                );
                const site = Array.isArray(submission.sites)
                  ? submission.sites[0]
                  : submission.sites;

                return (
                  <tr key={submission.id} className="border-t border-line">
                    <td className="px-4 py-4">
                      <p className="font-semibold">
                        {site?.name ?? submission.site_id}
                      </p>
                      <p className="break-all text-xs text-muted">
                        {site?.url ? formatDisplayUrl(site.url) : "-"}
                      </p>
                    </td>
                    <td className="break-all px-4 py-4">
                      {formatDisplayUrl(submission.domain_url)}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(submission.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={approving || rejecting}
                          onClick={() => onReview(submission.id, "approved")}
                          className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {approving ? "처리 중..." : "승인"}
                        </button>
                        <button
                          type="button"
                          disabled={approving || rejecting}
                          onClick={() => onReview(submission.id, "rejected")}
                          className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          {rejecting ? "처리 중..." : "거절"}
                        </button>
                        <button
                          type="button"
                          disabled={approving || rejecting || isFetchingWhois}
                          onClick={() => onFetchWhois(submission.domain_url)}
                          className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          {isFetchingWhois ? "조회 중..." : "WHOIS 조회"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={4} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SiteTable({
  anchorId,
  title,
  sites,
  isUpdating,
  isDeleting,
  onUpdateStatus,
  onDelete,
  editingSlug,
  setEditingSlug,
  onUpdateSlug,
  isGeneratingBlogDraft,
  onGenerateBlogDraft,
}: {
  anchorId: string;
  title: string;
  sites: SiteRow[];
  isUpdating: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => boolean;
  isDeleting: (table: "sites" | "reviews" | "scam_reports", id: string) => boolean;
  onUpdateStatus: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => void;
  onDelete: (table: "sites" | "reviews" | "scam_reports", id: string) => void;
  editingSlug: EditingSlug;
  setEditingSlug: (editingSlug: EditingSlug) => void;
  onUpdateSlug: (siteId: string, nextSlug: string) => void;
  isGeneratingBlogDraft: (siteId: string, mode: "create" | "update") => boolean;
  onGenerateBlogDraft: (site: SiteRow, mode: "create" | "update") => void;
}) {
  return (
    <section id={anchorId} className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">사이트</th>
              <th className="px-4 py-3 font-semibold">slug</th>
              <th className="px-4 py-3 font-semibold">카테고리</th>
              <th className="px-4 py-3 font-semibold">라이선스 정보</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {sites.length > 0 ? (
              sites.map((site) => (
                <tr key={site.id} className="border-t border-line">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{site.name}</p>
                    <p className="break-all text-xs text-muted">
                      {formatDisplayUrl(site.url)}
                    </p>
                    {site.domains && site.domains.length > 1 ? (
                      <p className="mt-1 text-xs text-muted">
                        추가 도메인 {site.domains.length - 1}개
                      </p>
                    ) : null}
                    {site.contact_telegram ? (
                      <p className="mt-1 text-xs font-semibold text-accent">
                        텔레그램 {site.contact_telegram}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {editingSlug?.siteId === site.id ? (
                      <div className="grid min-w-64 gap-2">
                        <input
                          value={editingSlug.value}
                          onChange={(event) =>
                            setEditingSlug({
                              siteId: site.id,
                              value: event.target.value,
                            })
                          }
                          className="h-9 rounded-md border border-line px-3 text-xs"
                        />
                        <p className="text-xs leading-5 text-muted">
                          slug는 공개 URL에 사용되므로 신중하게 수정하세요.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSlug(site.id, editingSlug.value)
                            }
                            className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSlug(null)}
                            className="rounded-md border border-line px-3 py-2 text-xs font-semibold"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <p className="font-mono text-xs">{site.slug}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSlug({
                              siteId: site.id,
                              value: site.slug,
                            })
                          }
                          className="w-fit rounded-md border border-line px-3 py-2 text-xs font-semibold"
                        >
                          slug 수정
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">{site.category}</td>
                  <td className="px-4 py-4">
                    <p className="line-clamp-2 text-xs leading-5 text-muted">
                      {site.license_info}
                    </p>
                  </td>
                  <td className="px-4 py-4">{adminStatusLabels[site.status]}</td>
                  <td className="px-4 py-4">
                    <ActionButtons
                      table="sites"
                      id={site.id}
                      editHref={`/admin/sites/${site.id}/edit`}
                      isUpdating={isUpdating}
                      isDeleting={isDeleting}
                      onUpdateStatus={onUpdateStatus}
                      onDelete={onDelete}
                      site={site}
                      isGeneratingBlogDraft={isGeneratingBlogDraft}
                      onGenerateBlogDraft={onGenerateBlogDraft}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={6} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewTable({
  anchorId,
  title,
  reviews,
  isUpdating,
  isDeleting,
  onUpdateStatus,
  onDelete,
}: {
  anchorId: string;
  title: string;
  reviews: ReviewRow[];
  isUpdating: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => boolean;
  isDeleting: (table: "sites" | "reviews" | "scam_reports", id: string) => boolean;
  onUpdateStatus: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => void;
  onDelete: (table: "sites" | "reviews" | "scam_reports", id: string) => void;
}) {
  return (
    <section id={anchorId} className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">리뷰</th>
              <th className="px-4 py-3 font-semibold">사이트</th>
              <th className="px-4 py-3 font-semibold">문제 유형</th>
              <th className="px-4 py-3 font-semibold">평점</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">작성일</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <tr key={review.id} className="border-t border-line">
                  <td className="px-4 py-4">
                    <p className="font-semibold">{review.title}</p>
                    <ReviewSummary
                      siteName={getReviewSiteName(review)}
                      experience={review.experience}
                      compact
                    />
                  </td>
                  <td className="px-4 py-4">
                    {getReviewSiteName(review)}
                  </td>
                  <td className="px-4 py-4">
                    {issueTypeLabels[review.issue_type]}
                  </td>
                  <td className="px-4 py-4">
                    {formatRatingScore(review.rating)}
                  </td>
                  <td className="px-4 py-4">
                    {adminStatusLabels[review.status]}
                  </td>
                  <td className="px-4 py-4">{formatDate(review.created_at)}</td>
                  <td className="px-4 py-4">
                    <ActionButtons
                      table="reviews"
                      id={review.id}
                      isUpdating={isUpdating}
                      isDeleting={isDeleting}
                      onUpdateStatus={onUpdateStatus}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={8} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScamReportTable({
  anchorId,
  title,
  reports,
  isUpdating,
  isDeleting,
  onUpdateStatus,
  onDelete,
}: {
  anchorId: string;
  title: string;
  reports: ScamReportRow[];
  isUpdating: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => boolean;
  isDeleting: (table: "sites" | "reviews" | "scam_reports", id: string) => boolean;
  onUpdateStatus: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => void;
  onDelete: (table: "sites" | "reviews" | "scam_reports", id: string) => void;
}) {
  return (
    <section id={anchorId} className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-background text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">연결된 사이트</th>
              <th className="px-4 py-3 font-semibold">피해 금액</th>
              <th className="px-4 py-3 font-semibold">피해 유형</th>
              <th className="px-4 py-3 font-semibold">상세 제보 내용</th>
              <th className="px-4 py-3 font-semibold">발생 일자</th>
              <th className="px-4 py-3 font-semibold">검토 상태</th>
              <th className="px-4 py-3 font-semibold">공개 여부</th>
              <th className="px-4 py-3 font-semibold">생성일</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {reports.length > 0 ? (
              reports.map((report) => {
                const site = Array.isArray(report.sites)
                  ? report.sites[0]
                  : report.sites;

                return (
                  <tr key={report.id} className="border-t border-line">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{site?.name ?? "연결 사이트 없음"}</p>
                      <p className="break-all text-xs text-muted">{site?.url ?? report.site_id}</p>
                    </td>
                    <td className="px-4 py-4">
                      {report.damage_amount_unknown || report.damage_amount === null
                        ? "미확인"
                        : `${report.damage_amount.toLocaleString("ko-KR")}원`}
                    </td>
                    <td className="px-4 py-4">
                      {(report.damage_types ?? []).join(", ") || "확인 필요"}
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <p className="line-clamp-4 whitespace-pre-line leading-6 text-muted">
                        {report.situation_description || "상세 내용 없음"}
                      </p>
                    </td>
                    <td className="px-4 py-4">{report.incident_date}</td>
                    <td className="px-4 py-4">{adminStatusLabels[report.review_status]}</td>
                    <td className="px-4 py-4">{report.is_published ? "공개" : "비공개"}</td>
                    <td className="px-4 py-4">{formatDate(report.created_at)}</td>
                    <td className="px-4 py-4">
                      <ActionButtons
                        table="scam_reports"
                        id={report.id}
                        isUpdating={isUpdating}
                        isDeleting={isDeleting}
                        onUpdateStatus={onUpdateStatus}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={9} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionButtons({
  table,
  id,
  editHref,
  isUpdating,
  isDeleting,
  onUpdateStatus,
  onDelete,
  site,
  isGeneratingBlogDraft,
  onGenerateBlogDraft,
}: {
  table: "sites" | "reviews" | "scam_reports";
  id: string;
  editHref?: string;
  isUpdating: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => boolean;
  isDeleting: (table: "sites" | "reviews" | "scam_reports", id: string) => boolean;
  onUpdateStatus: (
    table: "sites" | "reviews" | "scam_reports",
    id: string,
    status: ModerationStatus,
  ) => void;
  onDelete: (table: "sites" | "reviews" | "scam_reports", id: string) => void;
  site?: SiteRow;
  isGeneratingBlogDraft?: (siteId: string, mode: "create" | "update") => boolean;
  onGenerateBlogDraft?: (site: SiteRow, mode: "create" | "update") => void;
}) {
  const approving = isUpdating(table, id, "approved");
  const rejecting = isUpdating(table, id, "rejected");
  const deleting = isDeleting(table, id);
  const creatingBlogDraft = site
    ? Boolean(isGeneratingBlogDraft?.(site.id, "create"))
    : false;
  const updatingBlogDraft = site
    ? Boolean(isGeneratingBlogDraft?.(site.id, "update"))
    : false;
  const disabled = approving || rejecting || deleting || creatingBlogDraft || updatingBlogDraft;

  return (
    <div className="flex flex-wrap gap-2">
      {editHref ? (
        <a
          href={editHref}
          className="rounded-md border border-line px-3 py-2 text-xs font-semibold"
        >
          수정
        </a>
      ) : null}
      {site && onGenerateBlogDraft ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onGenerateBlogDraft(site, "create")}
            className="rounded-md border border-accent/30 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-50"
          >
            {creatingBlogDraft ? "생성 중..." : "AI 블로그 초안 생성"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onGenerateBlogDraft(site, "update")}
            className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {updatingBlogDraft ? "업데이트 중..." : "AI 블로그 업데이트 초안 생성"}
          </button>
        </>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUpdateStatus(table, id, "approved")}
        className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {approving ? "변경 중..." : "승인"}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUpdateStatus(table, id, "rejected")}
        className="rounded-md border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
      >
        {rejecting ? "변경 중..." : "거절"}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(table, id)}
        className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
      >
        {deleting ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr className="border-t border-line">
      <td colSpan={colSpan} className="px-4 py-6 text-center text-sm text-muted">
        표시할 항목이 없습니다.
      </td>
    </tr>
  );
}
