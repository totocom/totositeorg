"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminSiteObservationPanel } from "@/app/components/admin-site-observation-panel";
import { useAuth } from "@/app/components/auth-provider";
import { ScreenshotUploadControl } from "@/app/components/screenshot-upload-control";
import {
  automaticCrawlManualHtmlFallbackText,
  automaticCrawlSupportGuideText,
} from "@/app/data/automatic-crawl-support";
import { formatDisplayDomain, formatDisplayUrl } from "@/app/data/domain-display";
import type {
  SiteCrawlSnapshotRow,
  SiteCrawlSnapshotSiteColumns,
  SiteCrawlSnapshotStatus,
} from "@/app/data/site-crawl-snapshots";
import { getAllowedStoredImageUrl } from "@/app/data/storage-image-url";
import { supabase } from "@/lib/supabase/client";

type SiteRow = SiteCrawlSnapshotSiteColumns & {
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
  logo_url: string | null;
  status: "pending" | "approved" | "rejected";
  description: string;
};

type EditValues = {
  nameKo: string;
  nameEn: string;
  url: string;
  domainsText: string;
  screenshotUrl: string;
  screenshotThumbUrl: string;
  faviconUrl: string;
  description: string;
};

type EditErrors = Partial<Record<keyof EditValues, string>>;

type AdminSiteEditProps = {
  siteId: string;
};

type SiteCrawlSnapshotImageCandidates = Partial<{
  og_images: unknown[];
  twitter_images: unknown[];
  favicon_candidates: unknown[];
  logo_candidates: unknown[];
  image_alts: unknown[];
}>;

const initialValues: EditValues = {
  nameKo: "",
  nameEn: "",
  url: "",
  domainsText: "",
  screenshotUrl: "",
  screenshotThumbUrl: "",
  faviconUrl: "",
  description: "",
};

const statusLabels = {
  pending: "검토 중",
  approved: "승인됨",
  rejected: "거절됨",
};

const snapshotStatusLabels: Record<SiteCrawlSnapshotStatus, string> = {
  draft: "초안",
  extracted: "추출됨",
  ai_generated: "AI 생성됨",
  approved: "공개 반영",
  rejected: "반려됨",
};

const snapshotSourceTypeLabels: Record<SiteCrawlSnapshotRow["source_type"], string> = {
  manual_html: "수동 HTML",
  crawler: "크롤러",
};

const snapshotHtmlInputTypeLabels: Record<
  SiteCrawlSnapshotRow["html_input_type"],
  string
> = {
  source_html: "원본 HTML",
  rendered_html: "렌더링 HTML",
  unknown: "확인 불가",
};

const siteCrawlSnapshotSelect = [
  "id",
  "site_id",
  "source_type",
  "html_input_type",
  "source_url",
  "final_url",
  "domain",
  "page_title",
  "meta_description",
  "h1",
  "observed_menu_labels",
  "observed_account_features",
  "observed_betting_features",
  "observed_payment_flags",
  "observed_notice_items",
  "observed_event_items",
  "observed_footer_text",
  "observed_badges",
  "image_candidates_json",
  "favicon_candidates_json",
  "logo_candidates_json",
  "promotional_flags_json",
  "excluded_terms_json",
  "screenshot_url",
  "screenshot_thumb_url",
  "favicon_url",
  "logo_url",
  "html_sha256",
  "visible_text_sha256",
  "raw_html_storage_path",
  "snapshot_status",
  "ai_detail_description_md",
  "ai_observation_summary_json",
  "collected_at",
  "created_by",
  "created_at",
  "updated_at",
].join(", ");

const automaticMetadataFailureFallback = `도메인 정보를 가져오지 못했습니다. ${automaticCrawlManualHtmlFallbackText} ${automaticCrawlSupportGuideText}`;
const automaticCaptureFailureFallback = `페이지 캡처 이미지를 생성하지 못했습니다. ${automaticCrawlManualHtmlFallbackText} ${automaticCrawlSupportGuideText}`;

type SiteMetadata = {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  faviconUrl: string;
  finalUrl: string;
  statusCode: number;
  challenge_detected?: boolean;
  guidance?: string;
  fallback_available?: "manual_html";
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
    screenshotThumbUrl: site.screenshot_thumb_url ?? "",
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

function formatOptionalDateTime(value: string | null | undefined) {
  if (!value) return "확인 불가";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "확인 불가";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSnapshotJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function getSnapshotListItems(value: unknown, limit = 12) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (typeof item === "number" || typeof item === "boolean") {
        return String(item);
      }
      return formatSnapshotJson(item);
    })
    .filter(Boolean)
    .slice(0, limit);
}

function SnapshotInfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-md bg-surface p-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value || "없음"}</dd>
    </div>
  );
}

function SnapshotList({
  title,
  values,
}: {
  title: string;
  values: unknown;
}) {
  const items = getSnapshotListItems(values);

  return (
    <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
      <p className="text-xs font-semibold text-muted">{title}</p>
      {items.length > 0 ? (
        <ul className="grid gap-1 text-xs text-foreground">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="break-all">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">관측값 없음</p>
      )}
    </div>
  );
}

function SnapshotJsonDetails({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <details className="rounded-md border border-line bg-surface p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase text-accent">
        {title}
      </summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-foreground">
        {formatSnapshotJson(value)}
      </pre>
    </details>
  );
}

function SnapshotAssetLink({
  label,
  url,
}: {
  label: string;
  url: string | null | undefined;
}) {
  const previewUrl = getAllowedStoredImageUrl(url);

  if (!url) return null;

  return (
    <div className="grid gap-2 rounded-md border border-line bg-surface p-3 text-xs">
      <p className="font-semibold text-muted">{label}</p>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={`${label} 미리보기`}
          className="max-h-32 w-full rounded-md border border-line bg-background object-contain"
        />
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="break-all font-semibold text-accent underline"
      >
        {url}
      </a>
    </div>
  );
}

function DnsRecord({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-surface p-3">
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
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">등록기관</dt>
          <dd className="mt-1 text-foreground">
            {whoisInfo.registrar || "확인 불가"}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">등록일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.creationDate)}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">만료일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.expirationDate)}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">최근 갱신일</dt>
          <dd className="mt-1 text-foreground">
            {formatOptionalDate(whoisInfo.updatedDate)}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">WHOIS 서버</dt>
          <dd className="mt-1 break-all text-foreground">
            {whoisInfo.whoisServer || "확인 불가"}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3">
          <dt className="text-xs font-semibold text-muted">DNSSEC</dt>
          <dd className="mt-1 text-foreground">
            {whoisInfo.dnssec || "확인 불가"}
          </dd>
        </div>
      </dl>
      <div className="rounded-md bg-surface p-3">
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

function AdminSiteCrawlSnapshots({
  snapshots,
  latestSnapshotId,
  descriptionSnapshotId,
  errorMessage,
  deletingSnapshotId,
  approvingSnapshotId,
  onDeleteSnapshot,
  onApproveSnapshot,
}: {
  snapshots: SiteCrawlSnapshotRow[];
  latestSnapshotId: string | null;
  descriptionSnapshotId: string | null;
  errorMessage: string;
  deletingSnapshotId: string | null;
  approvingSnapshotId: string | null;
  onDeleteSnapshot: (snapshotId: string) => void;
  onApproveSnapshot: (snapshotId: string) => void;
}) {
  return (
    <section className="grid gap-4 rounded-md border border-line bg-background p-4">
      <div>
        <p className="text-xs font-semibold uppercase text-accent">
          저장된 관측 snapshot
        </p>
        <h3 className="mt-1 text-base font-bold text-foreground">
          관측 snapshot 내용
        </h3>
        <p className="mt-1 text-xs text-muted">
          최신 5개 snapshot의 추출 필드, AI 설명, 내부 JSON 후보를 관리자용으로
          확인합니다. 원본 HTML 본문은 표시하지 않습니다.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {snapshots.length === 0 ? (
        <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
          저장된 관측 snapshot이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {snapshots.map((snapshot) => {
            const imageCandidates =
              snapshot.image_candidates_json as SiteCrawlSnapshotImageCandidates;
            const isLatestSnapshot = snapshot.id === latestSnapshotId;
            const isDescriptionSnapshot = snapshot.id === descriptionSnapshotId;
            const isPublicVisibleSnapshot = snapshot.snapshot_status === "approved";
            const isAppliedSnapshot =
              isPublicVisibleSnapshot ||
              isLatestSnapshot ||
              isDescriptionSnapshot;

            return (
              <article
                key={snapshot.id}
                className="grid gap-4 rounded-md border border-line bg-background p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-foreground">
                        {snapshotStatusLabels[snapshot.snapshot_status]}
                      </span>
                      {isLatestSnapshot && isPublicVisibleSnapshot ? (
                        <span className="rounded-md border border-accent bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                          공개 상세 노출
                        </span>
                      ) : null}
                      {isLatestSnapshot && !isPublicVisibleSnapshot ? (
                        <span className="rounded-md border border-yellow-300 bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300">
                          공개 상세 참조 · 승인 필요
                        </span>
                      ) : null}
                      {isDescriptionSnapshot ? (
                        <span className="rounded-md border border-accent bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                          설명 출처
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-2 break-all text-base font-bold text-foreground">
                      {snapshot.page_title || snapshot.domain || snapshot.id}
                    </h4>
                    <p className="mt-1 break-all text-xs text-muted">
                      ID: {snapshot.id}
                    </p>
                    {isLatestSnapshot && !isPublicVisibleSnapshot ? (
                      <p className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
                        이 snapshot은 최신 참조로 연결되어 있지만 아직 공개 반영
                        상태가 아니어서 /sites 상세의 관측 기록 섹션에는 표시되지
                        않습니다.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid justify-items-end gap-2 text-right text-xs text-muted">
                    <p>관측: {formatOptionalDateTime(snapshot.collected_at)}</p>
                    <p>수정: {formatOptionalDateTime(snapshot.updated_at)}</p>
                    {!isPublicVisibleSnapshot ? (
                      <button
                        type="button"
                        onClick={() => onApproveSnapshot(snapshot.id)}
                        disabled={
                          deletingSnapshotId !== null ||
                          approvingSnapshotId !== null
                        }
                        className="h-9 rounded-md border border-accent px-3 text-xs font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
                      >
                        {approvingSnapshotId === snapshot.id
                          ? "반영 중..."
                          : "공개 반영"}
                      </button>
                    ) : null}
                    {!isAppliedSnapshot ? (
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snapshot.id)}
                        disabled={
                          deletingSnapshotId !== null ||
                          approvingSnapshotId !== null
                        }
                        className="h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingSnapshotId === snapshot.id
                          ? "삭제 중..."
                          : "삭제"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <dl className="grid gap-3 md:grid-cols-3">
                  <SnapshotInfoField
                    label="source type"
                    value={snapshotSourceTypeLabels[snapshot.source_type]}
                  />
                  <SnapshotInfoField
                    label="HTML 입력 타입"
                    value={snapshotHtmlInputTypeLabels[snapshot.html_input_type]}
                  />
                  <SnapshotInfoField label="도메인" value={snapshot.domain} />
                  <SnapshotInfoField label="원본 URL" value={snapshot.source_url} />
                  <SnapshotInfoField label="최종 URL" value={snapshot.final_url} />
                  <SnapshotInfoField label="h1" value={snapshot.h1} />
                </dl>

                <dl className="grid gap-3 md:grid-cols-2">
                  <SnapshotInfoField
                    label="meta description"
                    value={snapshot.meta_description}
                  />
                  <SnapshotInfoField
                    label="raw HTML 저장 경로"
                    value={snapshot.raw_html_storage_path}
                  />
                  <SnapshotInfoField
                    label="HTML SHA-256"
                    value={snapshot.html_sha256}
                  />
                  <SnapshotInfoField
                    label="visible text SHA-256"
                    value={snapshot.visible_text_sha256}
                  />
                </dl>

                <div className="grid gap-3 md:grid-cols-2">
                  <SnapshotList
                    title="주요 메뉴"
                    values={snapshot.observed_menu_labels}
                  />
                  <SnapshotList
                    title="계정 관련 요소"
                    values={snapshot.observed_account_features}
                  />
                  <SnapshotList
                    title="베팅 관련 요소"
                    values={snapshot.observed_betting_features}
                  />
                  <SnapshotList
                    title="결제/입출금 관련 관측 요소"
                    values={snapshot.observed_payment_flags}
                  />
                  <SnapshotList
                    title="공지 영역"
                    values={snapshot.observed_notice_items}
                  />
                  <SnapshotList
                    title="이벤트 영역"
                    values={snapshot.observed_event_items}
                  />
                  <SnapshotList
                    title="footer/copyright"
                    values={snapshot.observed_footer_text}
                  />
                  <SnapshotList
                    title="관측 badge"
                    values={snapshot.observed_badges}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SnapshotList
                    title="og:image 후보"
                    values={imageCandidates.og_images}
                  />
                  <SnapshotList
                    title="twitter:image 후보"
                    values={imageCandidates.twitter_images}
                  />
                  <SnapshotList
                    title="favicon 후보"
                    values={snapshot.favicon_candidates_json}
                  />
                  <SnapshotList
                    title="logo 후보"
                    values={snapshot.logo_candidates_json}
                  />
                  <SnapshotList
                    title="image alt"
                    values={imageCandidates.image_alts}
                  />
                  <SnapshotList
                    title="image_candidates_json favicon"
                    values={imageCandidates.favicon_candidates}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SnapshotAssetLink
                    label="snapshot screenshot"
                    url={snapshot.screenshot_thumb_url ?? snapshot.screenshot_url}
                  />
                  <SnapshotAssetLink label="snapshot favicon" url={snapshot.favicon_url} />
                  <SnapshotAssetLink label="snapshot logo" url={snapshot.logo_url} />
                </div>

                {snapshot.ai_detail_description_md ? (
                  <div className="grid gap-2 rounded-md border border-line bg-surface p-3">
                    <p className="text-xs font-semibold uppercase text-accent">
                      AI 상세 설명
                    </p>
                    <div className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm text-foreground">
                      {snapshot.ai_detail_description_md}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <SnapshotJsonDetails
                    title="promotional flags json"
                    value={snapshot.promotional_flags_json}
                  />
                  <SnapshotJsonDetails
                    title="excluded terms json"
                    value={snapshot.excluded_terms_json}
                  />
                  <SnapshotJsonDetails
                    title="image candidates json"
                    value={snapshot.image_candidates_json}
                  />
                  <SnapshotJsonDetails
                    title="AI observation summary json"
                    value={snapshot.ai_observation_summary_json}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AdminSiteEdit({ siteId }: AdminSiteEditProps) {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();
  const [values, setValues] = useState<EditValues>(initialValues);
  const [errors, setErrors] = useState<EditErrors>({});
  const [siteSlug, setSiteSlug] = useState("");
  const [siteStatus, setSiteStatus] = useState<SiteRow["status"]>("pending");
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
  const [crawlSnapshots, setCrawlSnapshots] = useState<SiteCrawlSnapshotRow[]>(
    [],
  );
  const [latestCrawlSnapshotId, setLatestCrawlSnapshotId] = useState<
    string | null
  >(null);
  const [descriptionSourceSnapshotId, setDescriptionSourceSnapshotId] =
    useState<string | null>(null);
  const [snapshotErrorMessage, setSnapshotErrorMessage] = useState("");
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(
    null,
  );
  const [approvingSnapshotId, setApprovingSnapshotId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCrawlSnapshots = useCallback(async () => {
    if (!isAdmin) {
      setCrawlSnapshots([]);
      return;
    }

    const { data, error } = await supabase
      .from("site_crawl_snapshots")
      .select(siteCrawlSnapshotSelect)
      .eq("site_id", siteId)
      .order("collected_at", { ascending: false })
      .limit(5);

    if (error) {
      setSnapshotErrorMessage("관측 snapshot을 불러오지 못했습니다.");
      setCrawlSnapshots([]);
      return;
    }

    setSnapshotErrorMessage("");
    setCrawlSnapshots((data ?? []) as unknown as SiteCrawlSnapshotRow[]);
  }, [isAdmin, siteId]);

  const refreshSnapshotContext = useCallback(async () => {
    if (!isAdmin) return;

    const { data } = await supabase
      .from("sites")
      .select("latest_crawl_snapshot_id, description_source_snapshot_id")
      .eq("id", siteId)
      .single();

    if (data) {
      const site = data as SiteCrawlSnapshotSiteColumns;
      setLatestCrawlSnapshotId(site.latest_crawl_snapshot_id ?? null);
      setDescriptionSourceSnapshotId(site.description_source_snapshot_id ?? null);
    }

    await loadCrawlSnapshots();
  }, [isAdmin, loadCrawlSnapshots, siteId]);

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
        .select("id, slug, name, name_ko, name_en, url, domains, screenshot_url, screenshot_thumb_url, favicon_url, logo_url, status, description, latest_crawl_snapshot_id, content_crawled_at, description_source_snapshot_id, description_generated_at")
        .eq("id", siteId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        setErrorMessage("사이트 정보를 불러오지 못했습니다.");
        setIsLoadingSite(false);
        return;
      }

      const site = data as SiteRow;
      setValues(valuesFromSite(site));
      setSiteSlug(site.slug);
      setSiteStatus(site.status);
      setLatestCrawlSnapshotId(site.latest_crawl_snapshot_id ?? null);
      setDescriptionSourceSnapshotId(site.description_source_snapshot_id ?? null);
      await loadCrawlSnapshots();

      if (!isMounted) return;

      setIsLoadingSite(false);
    }

    if (!isLoading) {
      void loadSite();
    }

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isLoading, loadCrawlSnapshots, siteId]);

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

    const storedScreenshotUrl = getAllowedStoredImageUrl(values.screenshotUrl);
    const storedScreenshotThumbUrl = getAllowedStoredImageUrl(
      values.screenshotThumbUrl,
    );

    if (values.screenshotUrl.trim() && !storedScreenshotUrl) {
      nextErrors.screenshotUrl =
        "캡처 이미지는 Supabase Storage 또는 자체 도메인 이미지 URL만 사용할 수 있습니다.";
    }

    if (values.screenshotThumbUrl.trim() && !storedScreenshotThumbUrl) {
      nextErrors.screenshotUrl =
        "캡처 썸네일은 Supabase Storage 또는 자체 도메인 이미지 URL만 사용할 수 있습니다.";
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

  async function deleteCrawlSnapshot(snapshotId: string) {
    const confirmed = window.confirm(
      "반영되지 않은 관측 snapshot을 삭제하시겠습니까?",
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");
    setSnapshotErrorMessage("");
    setDeletingSnapshotId(snapshotId);

    try {
      const token = await getAdminToken();

      if (!token) {
        setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
        return;
      }

      const response = await fetch("/api/admin/sites/crawl-snapshots/review", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          siteId,
          snapshotId,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !result?.ok) {
        setSnapshotErrorMessage(
          result?.error ?? "관측 snapshot을 삭제하지 못했습니다.",
        );
        return;
      }

      await refreshSnapshotContext();
      setMessage("관측 snapshot을 삭제했습니다.");
    } catch {
      setSnapshotErrorMessage("관측 snapshot을 삭제하지 못했습니다.");
    } finally {
      setDeletingSnapshotId(null);
    }
  }

  async function approveCrawlSnapshot(snapshotId: string) {
    const confirmed = window.confirm(
      "이 관측 snapshot을 공개 상세 페이지에 반영하시겠습니까?",
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");
    setSnapshotErrorMessage("");
    setApprovingSnapshotId(snapshotId);

    try {
      const token = await getAdminToken();

      if (!token) {
        setErrorMessage("관리자 로그인 세션을 확인하지 못했습니다.");
        return;
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
          snapshotId,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; preview_path?: string | null }
        | null;

      if (!response.ok || !result?.ok) {
        setSnapshotErrorMessage(
          result?.error ?? "관측 snapshot을 공개 반영하지 못했습니다.",
        );
        return;
      }

      await refreshSnapshotContext();
      setMessage(
        result.preview_path
          ? `관측 snapshot을 공개 반영했습니다. ${result.preview_path}에서 확인할 수 있습니다.`
          : "관측 snapshot을 공개 반영했습니다.",
      );
    } catch {
      setSnapshotErrorMessage("관측 snapshot을 공개 반영하지 못했습니다.");
    } finally {
      setApprovingSnapshotId(null);
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
      setErrorMessage(
        `${result?.challenge_detected ? "challenge_detected: true · " : ""}${
          result?.error ?? automaticMetadataFailureFallback
        }`,
      );
      return;
    }

    setMetadata(result);
    setValues((current) => ({
      ...current,
      nameKo: current.nameKo.trim() || result.siteName || result.title,
      faviconUrl: current.faviconUrl.trim() || result.faviconUrl || "",
    }));
    setMessage("도메인 정보를 가져왔습니다. 사이트명과 파비콘 후보를 자동으로 채웠습니다.");
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
          screenshotThumbUrl?: string;
          source?: "lightsail" | "mshots";
          error?: string;
          challenge_detected?: boolean;
          guidance?: string;
          fallback_available?: "manual_html";
        }
      | null;

    setIsCapturingPage(false);

    if (!response.ok || !result?.ok || !result.screenshotUrl) {
      setErrorMessage(
        `${result?.challenge_detected ? "challenge_detected: true · " : ""}${
          result?.error ?? automaticCaptureFailureFallback
        }`,
      );
      return;
    }

    setValues((current) => ({
      ...current,
      screenshotUrl: result.screenshotUrl ?? "",
      screenshotThumbUrl: result.screenshotThumbUrl ?? "",
    }));
    setMessage(
      result.source === "mshots"
        ? "Lightsail 캡처가 실패해 fallback 이미지가 저장되었습니다."
        : "Lightsail 서울 서버 캡처 이미지가 저장되었습니다.",
    );
  }

  async function sendSiteApprovalNotification() {
    const token = await getAdminToken();

    if (!token) {
      return "사이트는 승인됐지만 텔레그램 알림은 로그인 세션을 확인하지 못해 전송되지 않았습니다.";
    }

    const response = await fetch("/api/admin/telegram/site-approved", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ siteId }),
    });

    if (response.ok) return "";

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    return `사이트는 승인됐지만 텔레그램 알림 전송에 실패했습니다. ${
      body?.error ?? "봇 연결 상태와 환경변수를 확인해주세요."
    }`;
  }

  async function saveSite(nextStatus: SiteRow["status"] = "approved") {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const storedScreenshotUrl = getAllowedStoredImageUrl(values.screenshotUrl);
    const storedScreenshotThumbUrl = getAllowedStoredImageUrl(
      values.screenshotThumbUrl,
    );

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
        screenshot_url: storedScreenshotUrl,
        screenshot_thumb_url: storedScreenshotThumbUrl,
        favicon_url: faviconUrl || null,
        status: nextStatus,
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

    const statusChangedToApproved =
      nextStatus === "approved" && siteStatus !== "approved";

    setSiteStatus(nextStatus);

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

    let notificationError = "";

    if (statusChangedToApproved) {
      notificationError = await sendSiteApprovalNotification();
    }

    if (notificationError) {
      setErrorMessage(notificationError);
      setMessage("사이트 정보가 저장되고 승인되었습니다.");
      return;
    }

    setMessage(
      statusChangedToApproved
        ? "사이트 정보가 저장되고 승인되었습니다."
        : "사이트 정보가 수정되었습니다.",
    );
    router.push(
      nextStatus === "approved"
        ? "/admin/sites#approved-sites"
        : "/admin/sites",
    );
  }

  if (isLoading || isLoadingSite) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          사이트 정보를 불러오는 중입니다.
        </section>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto w-full max-w-5xl">
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
      </div>
    );
  }

  const metadataFaviconPreviewUrl = getAllowedStoredImageUrl(
    metadata?.faviconUrl,
  );
  const faviconPreviewUrl = getAllowedStoredImageUrl(values.faviconUrl);
  const screenshotPreviewUrl =
    getAllowedStoredImageUrl(values.screenshotThumbUrl) ??
    getAllowedStoredImageUrl(values.screenshotUrl);

  return (
    <div className="mx-auto w-full max-w-5xl">
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
          <p className="mt-1 text-sm font-semibold text-muted">
            현재 상태: {statusLabels[siteStatus]}
          </p>
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveSite("approved");
          }}
          className="grid gap-4"
          noValidate
        >
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
                      : "border-line bg-surface text-foreground hover:bg-background"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{automaticCrawlSupportGuideText}</p>
            {errors.url ? (
              <span className="text-xs text-red-700">{errors.url}</span>
            ) : null}
          </div>

          {metadata ? (
            <div className="grid gap-3 rounded-md border border-line bg-background p-4 text-sm">
              <div className="flex items-start gap-3">
                {metadataFaviconPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={metadataFaviconPreviewUrl}
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
                <p className="rounded-md bg-surface p-3 text-muted">
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

          <AdminSiteObservationPanel
            siteId={siteId}
            siteSlug={siteSlug}
            siteName={getDisplayName(values)}
            siteUrl={values.url}
            description={values.description}
            onDescriptionChange={(description) =>
              updateField("description", description)
            }
            onDescriptionErrorClear={() =>
              setErrors((current) => ({
                ...current,
                description: undefined,
              }))
            }
            onSnapshotApplied={({ snapshotId }) => {
              setMessage(`관측 snapshot ${snapshotId}의 설명을 반영했습니다.`);
            }}
            onSnapshotChanged={() => void refreshSnapshotContext()}
            screenshotUrl={values.screenshotUrl}
            screenshotThumbUrl={values.screenshotThumbUrl}
            faviconUrl={values.faviconUrl}
            descriptionError={errors.description}
          />

          <AdminSiteCrawlSnapshots
            snapshots={crawlSnapshots}
            latestSnapshotId={latestCrawlSnapshotId}
            descriptionSnapshotId={descriptionSourceSnapshotId}
            errorMessage={snapshotErrorMessage}
            deletingSnapshotId={deletingSnapshotId}
            approvingSnapshotId={approvingSnapshotId}
            onDeleteSnapshot={(snapshotId) => void deleteCrawlSnapshot(snapshotId)}
            onApproveSnapshot={(snapshotId) => void approveCrawlSnapshot(snapshotId)}
          />

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

          <section className="grid gap-4 rounded-md border border-line bg-background p-4">
            <div>
              <p className="text-xs font-semibold uppercase text-accent">
                스크린샷 영역
              </p>
              <p className="mt-1 text-xs text-muted">
                기존 캡처, 수동 업로드, 파비콘 저장 흐름을 유지합니다. 사이트
                레코드에는 수정 저장 버튼을 누를 때 확정 반영됩니다.
              </p>
            </div>

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
              {faviconPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconPreviewUrl}
                  alt="파비콘 미리보기"
                  className="h-10 w-10 rounded-md border border-line bg-surface object-contain"
                />
              ) : null}
              <span className="break-all text-muted">{values.faviconUrl}</span>
            </div>
          ) : null}

          <div className="grid gap-2 text-sm font-medium">
            캡처 이미지 URL
            <ScreenshotUploadControl
              value={values.screenshotUrl}
              onChange={(url, thumbUrl) => {
                updateField("screenshotUrl", url);
                updateField("screenshotThumbUrl", thumbUrl ?? "");
              }}
              onMessage={setMessage}
              onError={setErrorMessage}
            />
            {errors.screenshotUrl ? (
              <span className="text-xs text-red-700">{errors.screenshotUrl}</span>
            ) : null}
          </div>

          {values.screenshotUrl ? (
            <div className="overflow-hidden rounded-md border border-line bg-background">
              {screenshotPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshotPreviewUrl}
                  alt="사이트 캡처 미리보기"
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <p className="px-3 py-2 text-xs text-muted">
                  저장소 또는 자체 도메인 이미지 URL만 미리보기로 표시합니다.
                </p>
              )}
            </div>
          ) : null}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "저장 중..." : "수정 저장 및 승인"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
