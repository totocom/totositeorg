import {
  getApprovedReviewsBySiteId,
  getApprovedSites,
  type IssueType,
  type ScamReport,
  type ReviewTarget,
  type SiteReview,
} from "@/app/data/sites";
import { supabase } from "@/lib/supabase/client";

type PublicSiteRow = {
  id: string;
  slug: string | null;
  name: string;
  name_ko?: string | null;
  name_en?: string | null;
  url: string;
  domains?: string[] | null;
  screenshot_url?: string | null;
  category: string;
  available_states: string[];
  license_info: string;
  description: string;
};

type PublicReviewRow = {
  id: string;
  site_id: string;
  rating: number;
  title: string;
  experience: string;
  issue_type: IssueType;
  state_used: string;
  created_at: string;
};

type PublicSitesResult = {
  sites: ReviewTarget[];
  categories: string[];
  states: string[];
  errorMessage: string;
  source: "supabase" | "fallback";
};

type PublicSiteDetailResult = {
  site: ReviewTarget | null;
  reviews: SiteReview[];
  scamReports: ScamReport[];
  errorMessage: string;
  source: "supabase" | "fallback" | "none";
};

type PublicScamReportRow = {
  id: string;
  site_id: string;
  incident_date: string;
  usage_period: string;
  main_category: string;
  category_items: string[] | null;
  damage_types: string[] | null;
  damage_amount: number | null;
  damage_amount_unknown: boolean;
  situation_description: string;
  evidence_image_urls: string[] | null;
  evidence_note: string | null;
  review_status: "pending" | "approved" | "rejected";
  is_published: boolean;
  created_at: string;
};

function calculateAverageRating(reviews: PublicReviewRow[]) {
  if (reviews.length === 0) {
    return 0;
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

function getDisplayName(site: PublicSiteRow) {
  const ko = site.name_ko?.trim() ?? "";
  const en = site.name_en?.trim() ?? "";

  if (ko && en) return `${ko} (${en})`;
  return ko || en || site.name;
}

function mapSiteRow(
  site: PublicSiteRow,
  reviews: PublicReviewRow[],
  scamReports: PublicScamReportRow[] = [],
) {
  const domains =
    Array.isArray(site.domains) && site.domains.length > 0
      ? site.domains
      : [site.url];
  const scamDamageAmount = scamReports.reduce(
    (total, report) => total + Number(report.damage_amount ?? 0),
    0,
  );
  const scamDamageAmountUnknownCount = scamReports.filter(
    (report) => report.damage_amount_unknown,
  ).length;

  return {
    id: site.id,
    slug: site.slug ?? site.id,
    siteName: getDisplayName(site),
    siteNameKo: site.name_ko ?? null,
    siteNameEn: site.name_en ?? null,
    siteUrl: site.url,
    domains,
    screenshotUrl: site.screenshot_url ?? null,
    category: site.category,
    availableStates: site.available_states,
    licenseInfo: site.license_info,
    status: "운영 중",
    moderationStatus: "approved",
    shortDescription: site.description,
    averageRating: calculateAverageRating(reviews),
    reviewCount: reviews.length,
    scamReportCount: scamReports.length,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
  } satisfies ReviewTarget;
}

function mapReviewRow(review: PublicReviewRow) {
  return {
    id: review.id,
    siteId: review.site_id,
    rating: review.rating,
    title: review.title,
    experience: review.experience,
    issueType: review.issue_type,
    stateUsed: review.state_used,
    createdAt: review.created_at,
    status: "approved",
  } satisfies SiteReview;
}

function mapScamReportRow(report: PublicScamReportRow): ScamReport {
  return {
    id: report.id,
    siteId: report.site_id,
    incidentDate: report.incident_date,
    usagePeriod: report.usage_period,
    mainCategory: report.main_category,
    categoryItems: report.category_items ?? [],
    damageTypes: report.damage_types ?? [],
    damageAmount: report.damage_amount,
    damageAmountUnknown: report.damage_amount_unknown,
    situationDescription: report.situation_description,
    evidenceImageUrls: report.evidence_image_urls ?? [],
    evidenceNote: report.evidence_note,
    reviewStatus: report.review_status,
    isPublished: report.is_published,
    createdAt: report.created_at,
  };
}

function getDerivedFilters(sites: ReviewTarget[]) {
  return {
    categories: Array.from(new Set(sites.map((site) => site.category))).sort(),
    states: Array.from(
      new Set(sites.flatMap((site) => site.availableStates)),
    ).sort(),
  };
}

function getFallbackSitesResult(errorMessage: string): PublicSitesResult {
  const sites = getApprovedSites();
  const { categories, states } = getDerivedFilters(sites);

  return {
    sites,
    categories,
    states,
    errorMessage,
    source: "fallback",
  };
}

export async function getPublicSites(): Promise<PublicSitesResult> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, category, available_states, license_info, description",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, site_id, rating, title, experience, issue_type, state_used, created_at")
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
      )
      .eq("review_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ]);

  if (sitesResult.error || reviewsResult.error) {
    return getFallbackSitesResult(
      "Supabase 공개 데이터를 불러오지 못해 개발용 더미 데이터를 표시하고 있습니다.",
    );
  }

  const siteRows = (sitesResult.data ?? []) as PublicSiteRow[];
  const reviewRows = (reviewsResult.data ?? []) as PublicReviewRow[];
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as PublicScamReportRow[]);

  const sites = siteRows.map((site) =>
    mapSiteRow(
      site,
      reviewRows.filter((review) => review.site_id === site.id),
      scamReportRows.filter((report) => report.site_id === site.id),
    ),
  );
  const { categories, states } = getDerivedFilters(sites);

  return {
    sites,
    categories,
    states,
    errorMessage: "",
    source: "supabase",
  };
}

export async function getPublicSiteDetail(
  slug: string,
): Promise<PublicSiteDetailResult> {
  const siteResult = await supabase
    .from("sites")
    .select("*")
    .eq("slug", slug)
    .eq("status", "approved")
    .single();

  if (siteResult.error) {
    console.log("[site-detail] Supabase site lookup failed", {
      slug,
      error: siteResult.error,
    });

    const fallbackSite = getApprovedSites().find((site) => site.slug === slug);

    return {
      site: fallbackSite ?? null,
      reviews: fallbackSite ? getApprovedReviewsBySiteId(fallbackSite.id) : [],
      scamReports: [],
      errorMessage: fallbackSite
        ? "Supabase 사이트 상세 정보를 불러오지 못해 개발용 더미 데이터를 표시하고 있습니다."
        : "사이트 정보를 불러오지 못했습니다.",
      source: fallbackSite ? "fallback" : "none",
    };
  }

  const [reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, site_id, rating, title, experience, issue_type, state_used, created_at")
      .eq("site_id", siteResult.data.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
      )
      .eq("site_id", siteResult.data.id)
      .eq("review_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ]);

  if (reviewsResult.error) {
    console.log("[site-detail] Supabase approved reviews lookup failed", {
      slug,
      siteId: siteResult.data.id,
      error: reviewsResult.error,
    });

    return {
      site: mapSiteRow(siteResult.data as PublicSiteRow, []),
      reviews: [],
      scamReports: [],
      errorMessage: "승인된 리뷰 목록을 불러오지 못했습니다.",
      source: "supabase",
    };
  }

  const reviewRows = (reviewsResult.data ?? []) as PublicReviewRow[];
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as PublicScamReportRow[]);

  return {
    site: mapSiteRow(siteResult.data as PublicSiteRow, reviewRows),
    reviews: reviewRows.map(mapReviewRow),
    scamReports: scamReportRows.map(mapScamReportRow),
    errorMessage: "",
    source: "supabase",
  };
}
