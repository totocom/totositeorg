import {
  calculateSiteTrustScore,
  getApprovedReviewsBySiteId,
  getApprovedSites,
  type IssueType,
  type ScamReport,
  type ReviewTarget,
  type SiteReview,
} from "@/app/data/sites";
import type { PublicDnsInfo } from "@/app/data/domain-dns";
import { extractDomain, getBatchDomainCreationDates } from "@/app/data/domain-whois";
import type { PublicSiteObservationSnapshot } from "@/app/data/public-site-observation-snapshot";
import type { SiteCrawlSnapshotSiteColumns } from "@/app/data/site-crawl-snapshots";
import { getAllowedStoredImageUrl } from "@/app/data/storage-image-url";
import { supabase } from "@/lib/supabase/client";
import { unstable_cache } from "next/cache";

type PublicSiteRow = SiteCrawlSnapshotSiteColumns & {
  id: string;
  slug: string | null;
  name: string;
  name_ko?: string | null;
  name_en?: string | null;
  url: string;
  domains?: string[] | null;
  screenshot_url?: string | null;
  screenshot_thumb_url?: string | null;
  favicon_url?: string | null;
  logo_url?: string | null;
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
  helpful_count?: number | null;
  not_helpful_count?: number | null;
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
  observationSnapshot: PublicSiteObservationSnapshot | null;
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

type PublicScamReportRow = {
  id: string;
  site_id: string;
  user_id: string | null;
  incident_date: string;
  usage_period: string;
  main_category: string;
  category_items: string[] | null;
  category_etc_text: string | null;
  damage_types: string[] | null;
  damage_type_etc_text: string | null;
  damage_amount: number | null;
  damage_amount_unknown: boolean;
  situation_description: string;
  deposit_bank_name: string | null;
  deposit_account_number: string | null;
  deposit_account_holder: string | null;
  deposit_amount: number | null;
  deposit_date: string | null;
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

function getSiteDomains(site: PublicSiteRow): string[] {
  return Array.isArray(site.domains) && site.domains.length > 0
    ? site.domains
    : [site.url];
}

function getOldestCreationDate(
  site: PublicSiteRow,
  creationDates: Map<string, string>,
): string | undefined {
  const dates = getSiteDomains(site)
    .map((d) => extractDomain(d))
    .filter(Boolean)
    .map((d) => creationDates.get(d))
    .filter((d): d is string => typeof d === "string" && Number.isFinite(new Date(d).getTime()));

  if (dates.length === 0) return undefined;
  return dates.reduce((oldest, date) => (date < oldest ? date : oldest));
}

function mapSiteRow(
  site: PublicSiteRow,
  reviews: PublicReviewRow[],
  scamReports: PublicScamReportRow[] = [],
  oldestDomainCreationDate?: string,
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
  const averageRating = calculateAverageRating(reviews);
  const reviewCount = reviews.length;
  const scamReportCount = scamReports.length;
  const trustScore = calculateSiteTrustScore({
    averageRating,
    reviewCount,
    scamReportCount,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
    oldestDomainCreationDate,
  });

  return {
    id: site.id,
    slug: site.slug ?? site.id,
    siteName: getDisplayName(site),
    siteNameKo: site.name_ko ?? null,
    siteNameEn: site.name_en ?? null,
    siteUrl: site.url,
    domains,
    screenshotUrl: getAllowedStoredImageUrl(site.screenshot_url),
    screenshotThumbUrl: getAllowedStoredImageUrl(site.screenshot_thumb_url),
    faviconUrl: getAllowedStoredImageUrl(site.favicon_url),
    logoUrl: getAllowedStoredImageUrl(site.logo_url),
    category: site.category,
    availableStates: site.available_states,
    licenseInfo: site.license_info,
    status: "운영 중",
    moderationStatus: "approved",
    shortDescription: site.description,
    averageRating,
    reviewCount,
    scamReportCount,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
    resolvedIps: site.resolved_ips ?? [],
    dnsCheckedAt: site.dns_checked_at ?? null,
    oldestDomainCreationDate,
    trustScore,
  } satisfies ReviewTarget;
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
    authorUserId: review.user_id,
    authorNickname: getAuthorNickname(
      review.user_id,
      nicknameMap,
      review.reviewer_name,
    ),
    rating: review.rating,
    title: review.title,
    experience: review.experience,
    issueType: review.issue_type,
    helpfulCount: Number(review.helpful_count ?? 0),
    notHelpfulCount: Number(review.not_helpful_count ?? 0),
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
    categoryEtcText: report.category_etc_text,
    damageTypes: report.damage_types ?? [],
    damageTypeEtcText: report.damage_type_etc_text,
    damageAmount: report.damage_amount,
    damageAmountUnknown: report.damage_amount_unknown,
    situationDescription: report.situation_description,
    depositBankName: report.deposit_bank_name,
    depositAccountNumber: report.deposit_account_number,
    depositAccountHolder: report.deposit_account_holder,
    depositAmount: report.deposit_amount,
    depositDate: report.deposit_date,
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

async function getPublicSitesUncached(): Promise<PublicSitesResult> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, screenshot_thumb_url, favicon_url, logo_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, helpful_count, not_helpful_count, created_at")
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, category_etc_text, damage_types, damage_type_etc_text, damage_amount, damage_amount_unknown, situation_description, deposit_bank_name, deposit_account_number, deposit_account_holder, deposit_amount, deposit_date, evidence_image_urls, evidence_note, review_status, is_published, created_at",
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

  const allDomains = Array.from(
    new Set(
      siteRows.flatMap((site) =>
        getSiteDomains(site).map((d) => extractDomain(d)).filter(Boolean),
      ),
    ),
  );
  const creationDates = await getBatchDomainCreationDates(allDomains);

  const sites = siteRows.map((site) =>
    mapSiteRow(
      site,
      reviewRows.filter((review) => review.site_id === site.id),
      scamReportRows.filter((report) => report.site_id === site.id),
      getOldestCreationDate(site, creationDates),
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

async function getPublicSiteDetailUncached(
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
      observationSnapshot: null,
      errorMessage: fallbackSite
        ? "Supabase 사이트 상세 정보를 불러오지 못해 개발용 더미 데이터를 표시하고 있습니다."
        : "사이트 정보를 불러오지 못했습니다.",
      source: fallbackSite ? "fallback" : "none",
    };
  }

  const [reviewsResult, scamReportsResult, observationSnapshotResult] =
    await Promise.all([
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, helpful_count, not_helpful_count, created_at")
      .eq("site_id", siteResult.data.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, category_etc_text, damage_types, damage_type_etc_text, damage_amount, damage_amount_unknown, situation_description, deposit_bank_name, deposit_account_number, deposit_account_holder, deposit_amount, deposit_date, evidence_image_urls, evidence_note, review_status, is_published, created_at",
      )
      .eq("site_id", siteResult.data.id)
      .eq("review_status", "approved")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("site_crawl_snapshot_public")
      .select(
        "id, site_id, source_type, html_input_type, source_url, final_url, domain, page_title, meta_description, h1, observed_menu_labels, observed_account_features, observed_betting_features, observed_payment_flags, observed_notice_items, observed_event_items, observed_footer_text, observed_badges, screenshot_url, screenshot_thumb_url, favicon_url, logo_url, ai_detail_description_md, ai_observation_summary_json, collected_at, created_at, updated_at",
      )
      .eq("site_id", siteResult.data.id)
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
      observationSnapshot: observationSnapshotResult.error
        ? null
        : ((observationSnapshotResult.data ?? null) as PublicSiteObservationSnapshot | null),
      errorMessage: "승인된 리뷰 목록을 불러오지 못했습니다.",
      source: "supabase",
    };
  }

  const reviewRows = (reviewsResult.data ?? []) as PublicReviewRow[];
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as PublicScamReportRow[]);
  const nicknameMap = await getPublicNicknameMap([
    ...reviewRows.map((review) => review.user_id),
    ...scamReportRows.map((report) => report.user_id),
  ]);

  return {
    site: mapSiteRow(siteResult.data as PublicSiteRow, reviewRows, scamReportRows),
    reviews: reviewRows.map((review) => mapReviewRow(review, nicknameMap)),
    scamReports: scamReportRows.map((report) =>
      mapScamReportRow(report, nicknameMap),
    ),
    dnsRecords: [],
    observationSnapshot: observationSnapshotResult.error
      ? null
      : ((observationSnapshotResult.data ?? null) as PublicSiteObservationSnapshot | null),
    errorMessage: "",
    source: "supabase",
  };
}

async function getPublicReviewListUncached(): Promise<
  PublicContentListResult<PublicReviewListItem>
> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, screenshot_thumb_url, favicon_url, logo_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved"),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, helpful_count, not_helpful_count, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, category_etc_text, damage_types, damage_type_etc_text, damage_amount, damage_amount_unknown, situation_description, deposit_bank_name, deposit_account_number, deposit_account_holder, deposit_amount, deposit_date, evidence_image_urls, evidence_note, review_status, is_published, created_at",
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

async function getPublicScamReportListUncached(): Promise<
  PublicContentListResult<PublicScamReportListItem>
> {
  const [sitesResult, reviewsResult, scamReportsResult] = await Promise.all([
    supabase
      .from("sites")
      .select(
        "id, slug, name, name_ko, name_en, url, domains, screenshot_url, screenshot_thumb_url, favicon_url, logo_url, category, available_states, license_info, resolved_ips, dns_checked_at, description",
      )
      .eq("status", "approved"),
    supabase
      .from("reviews")
      .select("id, site_id, user_id, reviewer_name, rating, title, experience, issue_type, helpful_count, not_helpful_count, created_at")
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, user_id, incident_date, usage_period, main_category, category_items, category_etc_text, damage_types, damage_type_etc_text, damage_amount, damage_amount_unknown, situation_description, deposit_bank_name, deposit_account_number, deposit_account_holder, deposit_amount, deposit_date, evidence_image_urls, evidence_note, review_status, is_published, created_at",
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

export const getPublicSites = unstable_cache(
  getPublicSitesUncached,
  ["public-sites"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);

export const getPublicSiteDetail = unstable_cache(
  getPublicSiteDetailUncached,
  ["public-site-detail"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);

export const getPublicReviewList = unstable_cache(
  getPublicReviewListUncached,
  ["public-review-list"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);

export const getPublicScamReportList = unstable_cache(
  getPublicScamReportListUncached,
  ["public-scam-report-list"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);
