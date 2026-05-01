import { formatDisplayDomain } from "@/app/data/domain-display";

export type BlogVerificationSummary = {
  representativeDomain: string;
  additionalDomainCount: number;
  dnsLookupResult: string;
  whoisCreatedDate: string | null;
  whoisUpdatedDate: string | null;
  whoisExpirationDate: string | null;
  approvedReviewCount: number;
  approvedPublicScamReportCount: number;
  lastVerifiedAt: string | null;
  lastVerifiedText: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getRecord(value: unknown) {
  return isRecord(value) ? value : null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function getLatestIsoDate(values: Array<unknown>) {
  const dates = values
    .map(getString)
    .filter((value) => Number.isFinite(new Date(value).getTime()))
    .sort();

  return dates.at(-1) ?? null;
}

export function formatKstDateTime(value: string | null) {
  if (!value) return "확인되지 않음";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "확인되지 않음";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} KST`;
}

function buildDnsLookupResult(dnsRecords: unknown[]) {
  if (dnsRecords.length === 0) {
    return "조회 시점 기준 저장된 DNS 레코드 없음";
  }

  const counts = new Map<string, number>();

  for (const record of dnsRecords) {
    if (!isRecord(record)) continue;

    const recordType = getString(record.record_type) || "기타";
    counts.set(recordType, (counts.get(recordType) ?? 0) + 1);
  }

  const summary = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type} ${count}건`)
    .join(", ");

  return summary
    ? `${dnsRecords.length}개 레코드 확인 (${summary})`
    : `${dnsRecords.length}개 레코드 확인`;
}

export function buildBlogVerificationSummary(
  rawSnapshot: unknown,
): BlogVerificationSummary | null {
  const wrappedSnapshot = getRecord(rawSnapshot);
  const snapshot = getRecord(wrappedSnapshot?.snapshot) ?? wrappedSnapshot;

  if (!snapshot) return null;

  const site = getRecord(snapshot.site);
  const derivedFacts = getRecord(snapshot.derived_facts);
  const reviewsSummary = getRecord(snapshot.reviews_summary);
  const scamReportsSummary = getRecord(snapshot.scam_reports_summary);
  const domains = getArray(snapshot.domains);
  const dnsRecords = getArray(snapshot.dns_records);
  const whoisRecords = getArray(snapshot.whois);
  const primaryWhois = getRecord(whoisRecords[0]);
  const representativeDomainValue =
    getString(site?.domain) || getString(derivedFacts?.primary_domain);

  if (!representativeDomainValue) return null;

  const representativeDomain =
    formatDisplayDomain(representativeDomainValue) || representativeDomainValue;

  const additionalDomainCount =
    getArray(derivedFacts?.additional_domains).length ||
    domains.filter((domain) => {
      if (!isRecord(domain)) return false;
      return getString(domain.domain) !== representativeDomainValue;
    }).length;
  const whoisCreatedDate =
    getString(derivedFacts?.domain_created_date) ||
    getString(primaryWhois?.created_date) ||
    null;
  const whoisUpdatedDate =
    getString(derivedFacts?.domain_updated_date) ||
    getString(primaryWhois?.updated_date) ||
    null;
  const whoisExpirationDate =
    getString(derivedFacts?.domain_expiration_date) ||
    getString(primaryWhois?.expiration_date) ||
    null;
  const lastVerifiedAt = getLatestIsoDate([
    snapshot.snapshot_at,
    snapshot.generatedAt,
    derivedFacts?.dns_last_checked_at,
    derivedFacts?.whois_last_checked_at,
  ]);

  return {
    representativeDomain,
    additionalDomainCount,
    dnsLookupResult: buildDnsLookupResult(dnsRecords),
    whoisCreatedDate,
    whoisUpdatedDate,
    whoisExpirationDate,
    approvedReviewCount: getNumber(reviewsSummary?.approved_review_count),
    approvedPublicScamReportCount: getNumber(
      scamReportsSummary?.approved_public_report_count,
    ),
    lastVerifiedAt,
    lastVerifiedText: formatKstDateTime(lastVerifiedAt),
  };
}

export function buildBlogVerificationMarkdown(
  summary: BlogVerificationSummary,
) {
  return [
    "## 사이트별 확인 데이터",
    "",
    `- 대표 도메인: ${summary.representativeDomain}`,
    `- 추가 도메인 수: ${summary.additionalDomainCount}개`,
    `- DNS 조회 결과: ${summary.dnsLookupResult}`,
    `- WHOIS 등록일: ${summary.whoisCreatedDate ?? "확인되지 않음"}`,
    `- WHOIS 갱신일: ${summary.whoisUpdatedDate ?? "확인되지 않음"}`,
    `- WHOIS 만료일: ${summary.whoisExpirationDate ?? "확인되지 않음"}`,
    `- 공개 승인된 리뷰 수: ${summary.approvedReviewCount}개`,
    `- 공개 승인된 피해 제보 수: ${summary.approvedPublicScamReportCount}개`,
    `- 마지막 정보 확인 시각: ${summary.lastVerifiedText}`,
  ].join("\n");
}

export function appendBlogVerificationMarkdown(
  markdown: string,
  summary: BlogVerificationSummary,
) {
  const withoutExistingSummary = markdown
    .replace(/\n*##\s+사이트별 확인 데이터[\s\S]*?(?=\n##\s|$)/g, "")
    .trim();

  return [
    withoutExistingSummary,
    buildBlogVerificationMarkdown(summary),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
