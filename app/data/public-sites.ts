import {
  getApprovedReviewsBySiteId,
  getApprovedSites,
  type IssueType,
  type ScamReport,
  type ReviewTarget,
  type SiteReview,
} from "@/app/data/sites";
import type { PublicDnsInfo } from "@/app/data/domain-dns";
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
  favicon_url?: string | null;
  category: string;
  available_states: string[];
  license_info: string;
  resolved_ips?: string[] | null;
  dns_checked_at?: string | null;
  description: string;
};

export type PublicSiteDnsRecord = {
  domainUrl: string;
  checkedAt: string;
  dnsInfo: PublicDnsInfo;
};

type PublicReviewRow = {
  id: string;
  site_id: string;
  user_id: string | null;
  reviewer_name?: string | null;
  rating: number;
  title: string;
  experience: string;
  issue_type: IssueType;
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
  dnsRecords: PublicSiteDnsRecord[];
  errorMessage: string;
  source: "supabase" | "fallback" | "none";
};

export type PublicReviewListItem = SiteReview & {
  site: ReviewTarget;
};

export type PublicScamReportListItem = ScamReport & {
  site: ReviewTarget;
};

type PublicContentListResult<T> = {
  items: T[];
  errorMessage: string;
  source: "supabase" | "fallback";
};

type PublicSiteDnsRecordRow = {
  domain_url: string;
  domain: string;
  a_records: string[] | null;
  aaaa_records: string[] | null;
  cname_records: string[] | null;
  mx_records: string[] | null;
  ns_records: string[] | null;
  txt_records: string[] | null;
  soa_record: string | null;
  error_message: string | null;
  checked_at: string;
};

type PublicScamReportRow = {
  id: string;
  site_id: string;
  user_id: string | null;
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

type PublicProfileNicknameRow = {
  user_id: string;
  nickname: string | null;
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
    faviconUrl: site.favicon_url ?? null,
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
    resolvedIps: site.resolved_ips ?? [],
    dnsCheckedAt: site.dns_checked_at ?? null,
  } satisfies ReviewTarget;
}

function mapDnsRecordRow(row: PublicSiteDnsRecordRow): PublicSiteDnsRecord {
  return {
    domainUrl: row.domain_url,
    checkedAt: row.checked_at,
    dnsInfo: {
      domain: row.domain,
      a: row.a_records ?? [],
      aaaa: row.aaaa_records ?? [],
      cname: row.cname_records ?? [],
      mx: row.mx_records ?? [],
      ns: row.ns_records ?? [],
      txt: row.txt_records ?? [],
      soa: row.soa_record ?? "",
      errorMessage: row.error_message ?? "",
    },
  };
}

async function getPublicNicknameMap(userIds: Array<string | null | undefined>) {
  const uniqueUserIds = Array.from(
    new Set(userIds.filter((userId): userId is string => Boolean(userId))),
  );

  if (uniqueUserIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("public_profile_nicknames")
    .select("user_id, nickname")
    .in("user_id", uniqueUserIds);

  if (error) {
    return new Map<string, string>();
  }

  return new Map(
    ((data ?? []) as PublicProfileNicknameRow[])
      .filter((profile) => profile.nickname?.trim())
      .map((profile) => [profile.user_id, profile.nickname?.trim() ?? ""]),
  );
}

function getAuthorNickname(
  userId: string | null,
  nicknameMap: Map<string, string>,
  fallbackName?: string | null,
) {
  if (userId && nicknameMap.has(userId)) {
    return nicknameMap.get(userId) ?? null;
  }

  return fallbackName?.trim() || null;
}

function mapReviewRow(
  review: PublicReviewRow,
  nicknameMap = new Map<string, string>(),
) {
  return {
    id: review.id,
    siteId: review.site_id,
    authorNickname: getAuthorNickname(
      review.user_id,
      nicknameMap,
      review.reviewer_name,
    ),
    rating: review.rating,
    title: review.title,
    experience: review.experience,
    issueType: review.issue_type,
    createdAt: review.created_at,
    status: "approved",
  } satisfies SiteReview;
}

function mapScamReportRow(
  report: PublicScamReportRow,
  nicknameMap = new Map<string, string>(),
): ScamReport {
  return {
    id: report.id,
    siteId: report.site_id,
    authorNickname: getAuthorNickname(report.user_id, nicknameMap),
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
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, favicon_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, created_at")
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
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
      dnsRecords: [],
      errorMessage: fallbackSite
        ? "Supabase 사이트 상세 정보를 불러오지 못해 개발용 더미 데이터를 표시하고 있습니다."
        : "사이트 정보를 불러오지 못했습니다.",
      source: fallbackSite ? "fallback" : "none",
    };
  }

  const [reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, created_at")
      .eq("site_id", siteResult.data.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
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
      dnsRecords: [],
      errorMessage: "승인된 리뷰 목록을 불러오지 못했습니다.",
      source: "supabase",
    };
  }

  const dnsRecordsResult = await supabase
    .from("site_dns_records")
    .select(
      "domain_url, domain, a_records, aaaa_records, cname_records, mx_records, ns_records, txt_records, soa_record, error_message, checked_at",
    )
    .eq("site_id", siteResult.data.id)
    .order("domain", { ascending: true });

  const reviewRows = (reviewsResult.data ?? []) as PublicReviewRow[];
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as PublicScamReportRow[]);
  const dnsRecordRows = dnsRecordsResult.error
    ? []
    : ((dnsRecordsResult.data ?? []) as PublicSiteDnsRecordRow[]);
  const nicknameMap = await getPublicNicknameMap([
    ...reviewRows.map((review) => review.user_id),
    ...scamReportRows.map((report) => report.user_id),
  ]);

  return {
    site: mapSiteRow(siteResult.data as PublicSiteRow, reviewRows),
    reviews: reviewRows.map((review) => mapReviewRow(review, nicknameMap)),
    scamReports: scamReportRows.map((report) =>
      mapScamReportRow(report, nicknameMap),
    ),
    dnsRecords: dnsRecordRows.map(mapDnsRecordRow),
    errorMessage: "",
    source: "supabase",
  };
}

export async function getPublicReviewList(): Promise<
  PublicContentListResult<PublicReviewListItem>
> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, favicon_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved"),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
      )
      .eq("review_status", "approved")
      .eq("is_published", true),
  ]);

  if (sitesResult.error || reviewsResult.error) {
    const fallbackSites = getApprovedSites();
    const items = fallbackSites.flatMap((site) =>
      getApprovedReviewsBySiteId(site.id).map((review) => ({
        ...review,
        site,
      })),
    );

    return {
      items,
      errorMessage:
        "Supabase 공개 리뷰 목록을 불러오지 못해 개발용 더미 데이터를 표시하고 있습니다.",
      source: "fallback",
    };
  }

  const siteRows = (sitesResult.data ?? []) as PublicSiteRow[];
  const reviewRows = (reviewsResult.data ?? []) as PublicReviewRow[];
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as PublicScamReportRow[]);
  const nicknameMap = await getPublicNicknameMap(
    reviewRows.map((review) => review.user_id),
  );
  const siteMap = new Map(
    siteRows.map((site) => [
      site.id,
      mapSiteRow(
        site,
        reviewRows.filter((review) => review.site_id === site.id),
        scamReportRows.filter((report) => report.site_id === site.id),
      ),
    ]),
  );

  return {
    items: reviewRows.flatMap((review) => {
      const site = siteMap.get(review.site_id);

      return site ? [{ ...mapReviewRow(review, nicknameMap), site }] : [];
    }),
    errorMessage: "",
    source: "supabase",
  };
}

export async function getPublicScamReportList(): Promise<
  PublicContentListResult<PublicScamReportListItem>
> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, favicon_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved"),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, created_at")
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, damage_types, damage_amount, damage_amount_unknown, situation_description, evidence_image_urls, evidence_note, review_status, is_published, created_at",
      )
      .eq("review_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ]);

  if (sitesResult.error || scamReportsResult.error) {
    return {
      items: [],
      errorMessage: "승인된 먹튀 피해 제보 목록을 불러오지 못했습니다.",
      source: "fallback",
    };
  }

  const siteRows = (sitesResult.data ?? []) as PublicSiteRow[];
  const reviewRows = reviewsResult.error
    ? []
    : ((reviewsResult.data ?? []) as PublicReviewRow[]);
  const scamReportRows = (scamReportsResult.data ?? []) as PublicScamReportRow[];
  const nicknameMap = await getPublicNicknameMap(
    scamReportRows.map((report) => report.user_id),
  );
  const siteMap = new Map(
    siteRows.map((site) => [
      site.id,
      mapSiteRow(
        site,
        reviewRows.filter((review) => review.site_id === site.id),
        scamReportRows.filter((report) => report.site_id === site.id),
      ),
    ]),
  );

  return {
    items: scamReportRows.flatMap((report) => {
      const site = siteMap.get(report.site_id);

      return site ? [{ ...mapScamReportRow(report, nicknameMap), site }] : [];
    }),
    errorMessage: "",
    source: "supabase",
  };
}
