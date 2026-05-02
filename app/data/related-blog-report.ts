import { getSiteDetailAllowedAnchorText } from "./site-detail-internal-links";

export type PublicSiteRelatedBlogReport = {
  slug: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type PublicSiteRelatedBlogReportRow = {
  site_id?: string | null;
  slug: string | null;
  title: string | null;
  status?: string | null;
  legal_review_status?: string | null;
  published_at: string | null;
  updated_at: string | null;
};

export type RelatedBlogReportCardModel = {
  heading: string;
  anchor: string;
  description: string;
  href: string;
  sourceTitle: string;
};

export const relatedBlogReportForbiddenAnchorPhrases = [
  "바로가기",
  "접속하기",
  "최신 주소",
  "추천",
  "먹튀 없음",
  "먹튀 없는",
  "안전한",
];

export function isPublishedApprovedSiteBlogReport(
  row: PublicSiteRelatedBlogReportRow,
  siteId: string,
) {
  return (
    Boolean(siteId) &&
    row.site_id === siteId &&
    row.status === "published" &&
    row.legal_review_status === "approved" &&
    Boolean(row.slug?.trim())
  );
}

export function mapPublicSiteRelatedBlogReportRow(
  row: PublicSiteRelatedBlogReportRow | null | undefined,
): PublicSiteRelatedBlogReport | null {
  const slug = row?.slug?.trim() ?? "";

  if (!slug) return null;

  return {
    slug,
    title: row?.title?.trim() || slug,
    publishedAt: row?.published_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export function mapEligiblePublicSiteRelatedBlogReportRow(
  row: PublicSiteRelatedBlogReportRow | null | undefined,
  siteId: string,
) {
  if (!row || !isPublishedApprovedSiteBlogReport(row, siteId)) {
    return null;
  }

  return mapPublicSiteRelatedBlogReportRow(row);
}

export function findLatestRelatedBlogReport(
  rows: PublicSiteRelatedBlogReportRow[],
  siteId: string,
) {
  const latestRow = rows
    .filter((row) => isPublishedApprovedSiteBlogReport(row, siteId))
    .sort((a, b) => getLatestReportTime(b) - getLatestReportTime(a))[0];

  return mapPublicSiteRelatedBlogReportRow(latestRow);
}

export function buildRelatedBlogReportCardModel(params: {
  siteName: string;
  report: PublicSiteRelatedBlogReport | null;
}): RelatedBlogReportCardModel | null {
  if (!params.report) return null;

  const siteName = params.siteName.trim() || "해당 사이트";
  const anchor = getSiteDetailAllowedAnchorText(siteName, "blogReport");

  return {
    heading: "관련 정보 리포트",
    anchor,
    description: `이 리포트는 ${siteName} 상세 페이지의 주소, 도메인, DNS·WHOIS, 원본 사이트 관측 정보, 먹튀 제보와 후기 데이터를 바탕으로 작성된 정보 글입니다.`,
    href: `/blog/${params.report.slug}`,
    sourceTitle: params.report.title,
  };
}

export function hasForbiddenRelatedBlogReportAnchor(value: string) {
  return relatedBlogReportForbiddenAnchorPhrases.some((phrase) =>
    value.includes(phrase),
  );
}

function getLatestReportTime(row: PublicSiteRelatedBlogReportRow) {
  return Math.max(getTime(row.updated_at), getTime(row.published_at));
}

function getTime(value: string | null | undefined) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}
