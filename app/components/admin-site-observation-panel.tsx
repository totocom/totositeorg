"use client";

import { useMemo, useState } from "react";
import type {
  SiteCrawlSnapshotHtmlInputType,
  SiteCrawlSnapshotStatus,
} from "@/app/data/site-crawl-snapshots";
import { automaticCrawlSupportGuideText } from "@/app/data/automatic-crawl-support";
import type { SiteHtmlObservation } from "@/app/data/site-html-observation";
import { getAllowedStoredImageUrl } from "@/app/data/storage-image-url";
import { supabase } from "@/lib/supabase/client";

export type AdminSiteObservationDraft = {
  sourceUrl: string;
  finalUrl: string;
  domain: string;
  collectedAt: string;
  htmlInputType: SiteCrawlSnapshotHtmlInputType;
  observation: SiteHtmlObservation;
  aiDetailDescriptionMd: string;
  aiObservationSummaryJson: Record<string, unknown>;
  adminWarnings: string[];
  snapshotStatus: SiteCrawlSnapshotStatus;
  snapshotId?: string | null;
  descriptionApplied: boolean;
};

type AdminSiteObservationPanelProps = {
  siteId?: string;
  siteSlug?: string;
  siteName: string;
  siteUrl: string;
  description: string;
  onDescriptionChange: (description: string) => void;
  onDescriptionErrorClear?: () => void;
  onManualDescriptionSave?: () => void;
  isManualDescriptionSaving?: boolean;
  manualDescriptionSaveLabel?: string;
  onPendingSnapshotChange?: (draft: AdminSiteObservationDraft | null) => void;
  onSnapshotApplied?: (payload: {
    snapshotId: string;
    description: string;
    previewPath?: string | null;
  }) => void;
  onSnapshotChanged?: () => void;
  screenshotUrl?: string;
  screenshotThumbUrl?: string;
  faviconUrl?: string;
  logoUrl?: string;
  descriptionError?: string;
};

type ObservationResponse = {
  observation?: SiteHtmlObservation;
  sourceUrl?: string;
  finalUrl?: string;
  domain?: string;
  collectedAt?: string;
  htmlInputType?: SiteCrawlSnapshotHtmlInputType;
  error?: string;
};

type DescriptionResponse = {
  aiDetailDescriptionMd?: string;
  aiObservationSummaryJson?: Record<string, unknown>;
  adminWarnings?: string[];
  provider?: "openai" | "local";
  error?: string;
};

type SnapshotResponse = {
  snapshotId?: string;
  error?: string;
};

type ApproveDescriptionResponse = {
  ok?: boolean;
  description?: string;
  snapshotId?: string;
  preview_path?: string | null;
  validation_status?: string;
  admin_warnings?: string[];
  error?: string;
};

type ApproveSnapshotResponse = {
  ok?: boolean;
  snapshotId?: string;
  preview_path?: string | null;
  error?: string;
};

const htmlInputTypeOptions: Array<{
  value: SiteCrawlSnapshotHtmlInputType;
  label: string;
}> = [
  { value: "source_html", label: "원본 HTML 소스" },
  { value: "rendered_html", label: "브라우저 렌더링 HTML" },
];

function toDateTimeLocalValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getIsoDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

async function getAdminToken() {
  const { data: sessionResult } = await supabase.auth.getSession();
  return sessionResult.session?.access_token ?? "";
}

function CandidateList({ title, values }: { title: string; values: unknown }) {
  const list = getArray(values)
    .map((value) => (typeof value === "string" ? value : formatJson(value)))
    .filter(Boolean)
    .slice(0, 12);

  return (
    <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
      <p className="text-xs font-semibold text-muted">{title}</p>
      {list.length > 0 ? (
        <ul className="grid gap-1 text-xs text-foreground">
          {list.map((item, index) => (
            <li key={`${title}-${index}`} className="break-all">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">후보 없음</p>
      )}
    </div>
  );
}

export function AdminSiteObservationPanel({
  siteId,
  siteSlug,
  siteName,
  siteUrl,
  description,
  onDescriptionChange,
  onDescriptionErrorClear,
  onManualDescriptionSave,
  isManualDescriptionSaving = false,
  manualDescriptionSaveLabel = "사이트 설명만 저장",
  onPendingSnapshotChange,
  onSnapshotApplied,
  onSnapshotChanged,
  screenshotUrl,
  screenshotThumbUrl,
  faviconUrl,
  logoUrl,
  descriptionError,
}: AdminSiteObservationPanelProps) {
  const [sourceUrl, setSourceUrl] = useState(siteUrl);
  const [isSourceUrlTouched, setIsSourceUrlTouched] = useState(false);
  const [collectedAt, setCollectedAt] = useState(toDateTimeLocalValue());
  const [htmlInputType, setHtmlInputType] =
    useState<SiteCrawlSnapshotHtmlInputType>("source_html");
  const [html, setHtml] = useState("");
  const [observation, setObservation] = useState<SiteHtmlObservation | null>(
    null,
  );
  const [finalUrl, setFinalUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [adminWarnings, setAdminWarnings] = useState<string[]>([]);
  const [aiObservationSummaryJson, setAiObservationSummaryJson] = useState<
    Record<string, unknown>
  >({});
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [isSnapshotPublicApplied, setIsSnapshotPublicApplied] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isApprovingSnapshot, setIsApprovingSnapshot] = useState(false);
  const [isApplyingDescription, setIsApplyingDescription] = useState(false);
  const [isRejectingSnapshot, setIsRejectingSnapshot] = useState(false);
  const [descriptionPreviewPath, setDescriptionPreviewPath] = useState<
    string | null
  >(null);

  const normalizedSiteName = siteName.trim() || "대상 사이트";
  const effectiveSourceUrl = isSourceUrlTouched ? sourceUrl : siteUrl;
  const effectiveFinalUrl = finalUrl || effectiveSourceUrl;
  const currentDraft = useMemo(() => {
    if (!observation) return null;

    return {
      sourceUrl: effectiveSourceUrl,
      finalUrl: effectiveFinalUrl,
      domain,
      collectedAt: getIsoDate(collectedAt),
      htmlInputType,
      observation,
      aiDetailDescriptionMd: aiDraft,
      aiObservationSummaryJson,
      adminWarnings,
      snapshotStatus: isSnapshotPublicApplied
        ? "approved"
        : aiDraft
          ? "ai_generated"
          : "extracted",
      snapshotId,
      descriptionApplied: description.trim() === aiDraft.trim() && Boolean(aiDraft),
    } satisfies AdminSiteObservationDraft;
  }, [
    adminWarnings,
    aiDraft,
    aiObservationSummaryJson,
    collectedAt,
    description,
    domain,
    effectiveFinalUrl,
    effectiveSourceUrl,
    htmlInputType,
    isSnapshotPublicApplied,
    observation,
    snapshotId,
  ]);

  function setPendingDraft(draft: AdminSiteObservationDraft | null) {
    onPendingSnapshotChange?.(draft);
  }

  async function extractObservation() {
    setMessage("");
    setErrorMessage("");
    onPendingSnapshotChange?.(null);

    const token = await getAdminToken();

    if (!token) {
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    setIsExtracting(true);

    const response = await fetch("/api/admin/sites/html-observation", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl: effectiveSourceUrl,
        collectedAt: getIsoDate(collectedAt),
        htmlInputType,
        html,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | ObservationResponse
      | null;

    setIsExtracting(false);

    if (!response.ok || !result?.observation) {
      setErrorMessage(result?.error ?? "HTML 관측 정보를 추출하지 못했습니다.");
      return;
    }

    setObservation(result.observation);
    setIsSourceUrlTouched(true);
    setSourceUrl(result.sourceUrl || effectiveSourceUrl);
    setFinalUrl(result.finalUrl || result.sourceUrl || effectiveSourceUrl);
    setDomain(result.domain || "");
    setAiDraft("");
    setAdminWarnings([]);
    setAiObservationSummaryJson({});
    setSnapshotId(null);
    setIsSnapshotPublicApplied(false);
    setMessage("HTML 관측 정보를 추출했습니다. 공개 화면에 원본 HTML은 렌더링하지 않습니다.");
    setDescriptionPreviewPath(null);
  }

  async function generateDescription() {
    if (!observation) {
      setErrorMessage("먼저 HTML 관측 정보를 추출해주세요.");
      return;
    }

    setMessage("");
    setErrorMessage("");

    const token = await getAdminToken();

    if (!token) {
      setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
      return;
    }

    setIsGenerating(true);

    const response = await fetch("/api/admin/sites/html-description", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        siteName: normalizedSiteName,
        sourceUrl: effectiveSourceUrl,
        observation,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | DescriptionResponse
      | null;

    setIsGenerating(false);

    if (!response.ok || !result?.aiDetailDescriptionMd) {
      setErrorMessage(result?.error ?? "AI 상세 설명 초안을 생성하지 못했습니다.");
      return;
    }

    setAiDraft(result.aiDetailDescriptionMd);
    setAiObservationSummaryJson(result.aiObservationSummaryJson ?? {});
    setAdminWarnings(result.adminWarnings ?? []);
    setSnapshotId(null);
    setIsSnapshotPublicApplied(false);
    setMessage(
      result.provider === "openai"
        ? "AI 상세 설명 초안을 생성했습니다."
        : "로컬 규칙 기반 상세 설명 초안을 생성했습니다.",
    );

    const nextDraft = {
      sourceUrl: effectiveSourceUrl,
      finalUrl: effectiveFinalUrl,
      domain,
      collectedAt: getIsoDate(collectedAt),
      htmlInputType,
      observation,
      aiDetailDescriptionMd: result.aiDetailDescriptionMd,
      aiObservationSummaryJson: result.aiObservationSummaryJson ?? {},
      adminWarnings: result.adminWarnings ?? [],
      snapshotStatus: "ai_generated",
      snapshotId: null,
      descriptionApplied: false,
    } satisfies AdminSiteObservationDraft;
    setPendingDraft(siteId ? null : nextDraft);
  }

  async function saveSnapshotRequest(
    draft: AdminSiteObservationDraft,
    statusOverride?: SiteCrawlSnapshotStatus,
  ) {
    const token = await getAdminToken();

    if (!token) {
      throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
    }

    if (!siteId) {
      throw new Error("사이트 등록 전에는 snapshot을 즉시 저장할 수 없습니다.");
    }

    const response = await fetch("/api/admin/sites/crawl-snapshots", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        siteId,
        sourceType: "manual_html",
        htmlInputType: draft.htmlInputType,
        sourceUrl: draft.sourceUrl,
        finalUrl: draft.finalUrl,
        domain: draft.domain,
        collectedAt: draft.collectedAt,
        observation: draft.observation,
        aiDetailDescriptionMd: draft.aiDetailDescriptionMd,
        aiObservationSummaryJson: draft.aiObservationSummaryJson,
        screenshotUrl,
        screenshotThumbUrl,
        faviconUrl,
        logoUrl,
        snapshotStatus: statusOverride ?? draft.snapshotStatus,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | SnapshotResponse
      | null;

    if (!response.ok || !result?.snapshotId) {
      throw new Error(result?.error ?? "관측 snapshot을 저장하지 못했습니다.");
    }

    return result.snapshotId;
  }

  async function approveSnapshotRequest(targetSnapshotId: string) {
    const token = await getAdminToken();

    if (!token) {
      throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
    }

    if (!siteId) {
      throw new Error("사이트 등록 전에는 snapshot을 즉시 공개 반영할 수 없습니다.");
    }

    const response = await fetch("/api/admin/sites/crawl-snapshots/review", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "approve_snapshot",
        siteId,
        snapshotId: targetSnapshotId,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | ApproveSnapshotResponse
      | null;

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error ?? "관측 snapshot을 공개 반영하지 못했습니다.");
    }

    return result;
  }

  async function saveSnapshot() {
    if (!currentDraft) {
      setErrorMessage("저장할 관측 정보가 없습니다.");
      return null;
    }

    setMessage("");
    setErrorMessage("");
    setIsSavingSnapshot(true);

    try {
      if (!siteId) {
        setPendingDraft(currentDraft);
        setMessage("관측 snapshot은 사이트 등록 시 함께 저장됩니다.");
        return null;
      }

      const savedSnapshotId = await saveSnapshotRequest(currentDraft);
      setSnapshotId(savedSnapshotId);
      setIsSnapshotPublicApplied(currentDraft.snapshotStatus === "approved");
      setMessage("관측 snapshot을 저장했습니다.");
      onSnapshotChanged?.();
      return savedSnapshotId;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "관측 snapshot을 저장하지 못했습니다.",
      );
      return null;
    } finally {
      setIsSavingSnapshot(false);
    }
  }

  async function approveSnapshotForPublicDetail() {
    if (!currentDraft) {
      setErrorMessage("공개 반영할 관측 정보가 없습니다.");
      return;
    }

    setMessage("");
    setErrorMessage("");
    setIsApprovingSnapshot(true);

    try {
      if (!siteId) {
        setPendingDraft({
          ...currentDraft,
          snapshotStatus: "approved",
        });
        setIsSnapshotPublicApplied(true);
        setMessage(
          "사이트 등록 시 관측 snapshot이 공개 반영 상태로 함께 저장됩니다. 공개 상세 페이지에는 사이트 승인 후 표시됩니다.",
        );
        return;
      }

      const activeSnapshotId =
        snapshotId ?? (await saveSnapshotRequest(currentDraft, "approved"));
      const result = snapshotId
        ? await approveSnapshotRequest(activeSnapshotId)
        : {
            preview_path: siteSlug ? `/sites/${siteSlug}` : null,
          };

      setSnapshotId(activeSnapshotId);
      setIsSnapshotPublicApplied(true);
      setDescriptionPreviewPath(
        result.preview_path ?? (siteSlug ? `/sites/${siteSlug}` : null),
      );
      setMessage(
        "관측 snapshot을 공개 상세 페이지에 반영했습니다. 사이트가 승인된 상태라면 /sites 상세에서 표시됩니다.",
      );
      onSnapshotChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "관측 snapshot을 공개 반영하지 못했습니다.",
      );
    } finally {
      setIsApprovingSnapshot(false);
    }
  }

  async function applyDescription() {
    if (!currentDraft || !observation) {
      setErrorMessage("먼저 HTML 관측 정보와 상세 설명 초안을 생성해주세요.");
      return;
    }

    const trimmedDraft = aiDraft.trim();

    if (trimmedDraft.length < 30) {
      setErrorMessage("AI 상세 설명 초안은 최소 30자 이상이어야 합니다.");
      return;
    }

    setMessage("");
    setErrorMessage("");
    setIsApplyingDescription(true);

    try {
      if (!siteId) {
        const pendingDraft = {
          ...currentDraft,
          aiDetailDescriptionMd: trimmedDraft,
          snapshotStatus: "ai_generated" as const,
          descriptionApplied: true,
        };
        onDescriptionChange(trimmedDraft);
        onDescriptionErrorClear?.();
        setPendingDraft(pendingDraft);
        setMessage("사이트 등록 시 설명과 관측 snapshot 참조가 함께 반영됩니다.");
        return;
      }

      const activeSnapshotId =
        snapshotId ?? (await saveSnapshotRequest(currentDraft, "ai_generated"));
      setSnapshotId(activeSnapshotId);

      const token = await getAdminToken();

      if (!token) {
        throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
      }

      const response = await fetch(
        `/api/admin/sites/${encodeURIComponent(siteId)}/approve-observation-description`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            snapshot_id: activeSnapshotId,
            final_description_md: trimmedDraft,
          }),
        },
      );
      const result = (await response.json().catch(() => null)) as
        | ApproveDescriptionResponse
        | null;

      if (!response.ok || !result?.ok) {
        const warnings =
          result?.admin_warnings && result.admin_warnings.length > 0
            ? ` ${result.admin_warnings.join(" ")}`
            : "";
        throw new Error(
          `${result?.error ?? "사이트 설명에 반영하지 못했습니다."}${warnings}`,
        );
      }

      onDescriptionChange(result.description ?? trimmedDraft);
      onDescriptionErrorClear?.();
      setIsSnapshotPublicApplied(true);
      setDescriptionPreviewPath(
        result.preview_path ?? (siteSlug ? `/sites/${siteSlug}` : null),
      );
      onSnapshotApplied?.({
        snapshotId: activeSnapshotId,
        description: result.description ?? trimmedDraft,
        previewPath:
          result.preview_path ?? (siteSlug ? `/sites/${siteSlug}` : null),
      });
      onSnapshotChanged?.();
      setMessage("관리자 승인 후 AI 설명을 사이트 설명에 반영했습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "사이트 설명에 반영하지 못했습니다.",
      );
    } finally {
      setIsApplyingDescription(false);
    }
  }

  async function rejectSnapshot() {
    setMessage("");
    setErrorMessage("");

    if (!siteId || !snapshotId) {
      setAiDraft("");
      setAdminWarnings([]);
      setPendingDraft(null);
      setMessage("생성 초안을 반려했습니다.");
      onSnapshotChanged?.();
      return;
    }

    setIsRejectingSnapshot(true);

    try {
      const token = await getAdminToken();

      if (!token) {
        throw new Error("관리자 로그인 세션을 확인하지 못했습니다.");
      }

      const response = await fetch("/api/admin/sites/crawl-snapshots/review", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          siteId,
          snapshotId,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error ?? "관측 snapshot을 반려하지 못했습니다.");
      }

      setMessage("관측 snapshot을 반려했습니다.");
      setIsSnapshotPublicApplied(false);
      onSnapshotChanged?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "관측 snapshot을 반려하지 못했습니다.",
      );
    } finally {
      setIsRejectingSnapshot(false);
    }
  }

  const storedScreenshotPreviewUrl =
    getAllowedStoredImageUrl(screenshotThumbUrl) ??
    getAllowedStoredImageUrl(screenshotUrl);
  const storedFaviconPreviewUrl = getAllowedStoredImageUrl(faviconUrl);
  const storedLogoPreviewUrl = getAllowedStoredImageUrl(logoUrl);

  return (
    <section className="grid gap-4 rounded-md border border-line bg-background p-4">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">
          원본 HTML 관측 정보 입력
        </p>
        <h3 className="mt-1 text-base font-bold text-foreground">
          HTML 소스 기반 설명 생성
        </h3>
        <p className="mt-1 text-xs text-muted">
          원본 HTML은 분석에만 사용하며 공개 페이지에 직접 렌더링하지 않습니다.
        </p>
        <p className="mt-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-muted">
          {automaticCrawlSupportGuideText}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          원본 URL
          <input
            value={effectiveSourceUrl}
            onChange={(event) => {
              setIsSourceUrlTouched(true);
              setSourceUrl(event.target.value);
            }}
            className="h-11 rounded-md border border-line px-3 text-sm"
            placeholder="https://example.com"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          조회 시각
          <input
            type="datetime-local"
            value={collectedAt}
            onChange={(event) => setCollectedAt(event.target.value)}
            className="h-11 rounded-md border border-line px-3 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-2 text-sm font-medium">
        HTML 입력 타입
        <div className="flex flex-wrap gap-2">
          {htmlInputTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setHtmlInputType(option.value)}
              aria-pressed={htmlInputType === option.value}
              className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                htmlInputType === option.value
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-foreground hover:bg-background"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-1 text-sm font-medium">
        HTML 소스 붙여넣기
        <textarea
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          className="min-h-48 rounded-md border border-line px-3 py-3 font-mono text-xs"
          placeholder="<html>...</html>"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={extractObservation}
          disabled={isExtracting}
          className="h-10 rounded-md border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
        >
          {isExtracting ? "추출 중..." : "HTML 관측 정보 추출"}
        </button>
        <button
          type="button"
          onClick={generateDescription}
          disabled={isGenerating || !observation}
          className="h-10 rounded-md border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
        >
          {isGenerating ? "생성 중..." : "AI 상세 설명 생성"}
        </button>
        <button
          type="button"
          onClick={() => void saveSnapshot()}
          disabled={isSavingSnapshot || !observation}
          className="h-10 rounded-md border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
        >
          {isSavingSnapshot ? "저장 중..." : "관측 snapshot 저장"}
        </button>
        <button
          type="button"
          onClick={approveSnapshotForPublicDetail}
          disabled={isApprovingSnapshot || !observation}
          className="h-10 rounded-md border border-accent px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
        >
          {isApprovingSnapshot
            ? "반영 중..."
            : "관측 snapshot 저장·공개 반영"}
        </button>
        <button
          type="button"
          onClick={applyDescription}
          disabled={isApplyingDescription || !aiDraft}
          className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isApplyingDescription ? "반영 중..." : "AI 설명을 사이트 설명에 반영"}
        </button>
        <button
          type="button"
          onClick={rejectSnapshot}
          disabled={isRejectingSnapshot || (!aiDraft && !snapshotId)}
          className="h-10 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-surface disabled:opacity-50"
        >
          {isRejectingSnapshot ? "반려 중..." : "반려"}
        </button>
        <button
          type="button"
          onClick={generateDescription}
          disabled={isGenerating || !observation}
          className="h-10 rounded-md border border-line px-4 text-sm font-semibold transition hover:bg-surface disabled:opacity-50"
        >
          다시 생성
        </button>
      </div>

      {message ? (
        <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {observation ? (
        <div className="grid gap-4 rounded-md border border-line bg-surface p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-accent">
              AI 생성 설명 검수 영역
            </p>
            <h4 className="mt-1 text-sm font-bold text-foreground">
              관측 정보 요약
            </h4>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-background p-3 text-sm">
              <p className="text-xs font-semibold text-muted">페이지 제목</p>
              <p className="mt-1 break-words text-foreground">
                {observation.page_title || "없음"}
              </p>
            </div>
            <div className="rounded-md bg-background p-3 text-sm">
              <p className="text-xs font-semibold text-muted">meta description</p>
              <p className="mt-1 line-clamp-3 break-words text-foreground">
                {observation.meta_description || "없음"}
              </p>
            </div>
            <div className="rounded-md bg-background p-3 text-sm">
              <p className="text-xs font-semibold text-muted">h1</p>
              <p className="mt-1 break-words text-foreground">
                {observation.h1 || "없음"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CandidateList
              title="주요 메뉴"
              values={observation.observed_menu_labels}
            />
            <CandidateList
              title="계정 관련 요소"
              values={observation.observed_account_features}
            />
            <CandidateList
              title="베팅 관련 요소"
              values={observation.observed_betting_features}
            />
            <CandidateList
              title="결제/입출금 관련 관측 요소"
              values={observation.observed_payment_flags}
            />
            <CandidateList
              title="공지 영역"
              values={observation.observed_notice_items}
            />
            <CandidateList
              title="이벤트 영역"
              values={observation.observed_event_items}
            />
            <CandidateList
              title="footer/copyright"
              values={observation.observed_footer_text}
            />
            <CandidateList
              title="공개 관측 요약"
              values={observation.public_observation_summary}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2 rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold uppercase text-accent">
                promotional flags
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
                {formatJson(observation.promotional_flags_json)}
              </pre>
            </div>
            <div className="grid gap-2 rounded-md border border-line bg-background p-3">
              <p className="text-xs font-semibold uppercase text-accent">
                excluded terms
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
                {formatJson(observation.excluded_terms_json)}
              </pre>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CandidateList
              title="og:image 후보"
              values={observation.image_candidates_json.og_images}
            />
            <CandidateList
              title="twitter:image 후보"
              values={observation.image_candidates_json.twitter_images}
            />
            <CandidateList
              title="favicon 후보"
              values={observation.image_candidates_json.favicon_candidates}
            />
            <CandidateList
              title="logo 후보"
              values={observation.image_candidates_json.logo_candidates}
            />
            <CandidateList
              title="이미지 alt"
              values={observation.image_candidates_json.image_alts}
            />
            <div className="rounded-md border border-line bg-surface p-3 text-xs text-muted">
              외부 이미지 URL은 후보로만 표시합니다. 상세페이지에는 기존 이미지
              저장 API를 통해 확정된 Storage URL만 사용합니다.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {storedScreenshotPreviewUrl ? (
              <div className="grid gap-2 rounded-md border border-line bg-background p-3">
                <p className="text-xs font-semibold text-muted">스크린샷 미리보기</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storedScreenshotPreviewUrl}
                  alt="저장 예정 스크린샷 미리보기"
                  className="aspect-video w-full rounded-md border border-line bg-surface object-cover"
                />
              </div>
            ) : null}
            {storedFaviconPreviewUrl || storedLogoPreviewUrl ? (
              <div className="grid gap-2 rounded-md border border-line bg-background p-3">
                <p className="text-xs font-semibold text-muted">
                  favicon/logo 미리보기
                </p>
                <div className="flex flex-wrap gap-3">
                  {storedFaviconPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={storedFaviconPreviewUrl}
                      alt="파비콘 미리보기"
                      className="h-12 w-12 rounded-md border border-line bg-surface object-contain"
                    />
                  ) : null}
                  {storedLogoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={storedLogoPreviewUrl}
                      alt="로고 미리보기"
                      className="h-12 max-w-40 rounded-md border border-line bg-surface object-contain"
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold uppercase text-accent">
              관리자 경고
            </p>
            {adminWarnings.length > 0 ? (
              <ul className="grid gap-1 text-xs text-foreground">
                {adminWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">현재 경고 없음</p>
            )}
          </div>

          <label className="grid gap-1 text-sm font-medium">
            AI가 생성한 상세 설명 초안
            <textarea
              value={aiDraft}
              onChange={(event) => {
                setAiDraft(event.target.value);
                setSnapshotId(null);
                setPendingDraft(null);
                setIsSnapshotPublicApplied(false);
              }}
              className="min-h-48 rounded-md border border-line px-3 py-3 text-sm"
              placeholder="AI 상세 설명 생성 버튼을 누르면 초안이 표시됩니다."
            />
          </label>

          {aiDraft ? (
            <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">
                  반영 전 미리보기
                </p>
                <p className="mt-1 text-xs text-muted">
                  아래 내용이 승인 API를 통과하면 사이트 설명으로 저장됩니다.
                </p>
              </div>
              {description.trim() &&
              description.trim() !== aiDraft.trim() ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  기존 설명을 교체합니다. 반영 전 문구와 금지 표현을 다시
                  확인해주세요.
                </div>
              ) : null}
              <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-background p-3 text-sm text-foreground">
                {aiDraft}
              </div>
            </div>
          ) : null}

          {descriptionPreviewPath ? (
            <div className="rounded-md border border-accent bg-accent-soft px-4 py-3 text-sm">
              <span className="font-semibold text-accent">
                반영 후 상세 페이지 미리보기:
              </span>{" "}
              <a
                href={descriptionPreviewPath}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline"
              >
                {descriptionPreviewPath}
              </a>
            </div>
          ) : null}

          <div className="grid gap-2 rounded-md border border-line bg-background p-3">
            <p className="text-xs font-semibold uppercase text-accent">
              observation summary json
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
              {formatJson(aiObservationSummaryJson)}
            </pre>
          </div>
        </div>
      ) : null}

      <details className="rounded-md border border-line bg-surface p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          수동 사이트 설명 보조 필드
        </summary>
        <label className="mt-3 grid gap-1 text-sm font-medium">
          사이트 설명
          <textarea
            value={description}
            onChange={(event) => {
              onDescriptionChange(event.target.value);
              onDescriptionErrorClear?.();
            }}
            className="min-h-28 rounded-md border border-line px-3 py-3 text-sm"
            placeholder="AI 초안 반영이 어려운 경우에만 직접 보정합니다."
          />
          {descriptionError ? (
            <span className="text-xs text-red-700">{descriptionError}</span>
          ) : null}
        </label>
        {onManualDescriptionSave ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onManualDescriptionSave}
              disabled={
                isManualDescriptionSaving || description.trim().length < 30
              }
              className="h-9 rounded-md bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isManualDescriptionSaving
                ? "저장 중..."
                : manualDescriptionSaveLabel}
            </button>
            <span className="text-xs text-muted">
              현재 사이트 설명만 저장하고 공개 상세 캐시를 갱신합니다.
            </span>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">
            수정 후 등록 버튼을 눌러야 사이트 레코드에 반영됩니다.
          </p>
        )}
      </details>
    </section>
  );
}
