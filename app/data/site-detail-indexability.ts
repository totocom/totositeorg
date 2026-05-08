export type SiteDetailIndexabilityInput = {
  site: {
    slug?: string | null;
    siteName: string;
    siteUrl: string;
    domains: string[];
    moderationStatus?: string | null;
    shortDescription?: string | null;
    reviewCount: number;
    scamReportCount?: number;
    scamDamageAmount?: number;
    screenshotUrl?: string | null;
    screenshotThumbUrl?: string | null;
    dnsCheckedAt?: string | null;
    resolvedIps?: string[] | null;
    oldestDomainCreationDate?: string | null;
    trustScore?: unknown;
  } | null;
  reviewsCount?: number;
  scamReportsCount?: number;
  dnsRecordCount?: number;
  observationSnapshot?: {
    observed_menu_labels?: unknown;
    observed_account_features?: unknown;
    observed_betting_features?: unknown;
    observed_payment_flags?: unknown;
    observed_notice_items?: unknown;
    observed_event_items?: unknown;
    observed_badges?: unknown;
    observedMenuLabels?: unknown;
    observedAccountFeatures?: unknown;
    observedBettingFeatures?: unknown;
    observedPaymentFlags?: unknown;
    observedNoticeItems?: unknown;
    observedEventItems?: unknown;
    observedBadges?: unknown;
    screenshot_url?: string | null;
    screenshot_thumb_url?: string | null;
    screenshotUrl?: string | null;
    screenshotThumbUrl?: string | null;
    collected_at?: string | null;
    collectedAt?: string | null;
  } | null;
  domainCreationDates?: Array<{
    domain: string;
    creationDate: string;
  }>;
  relatedBlogReport?: unknown | null;
  source?: "supabase" | "fallback" | "none";
};

export type SiteDetailIndexabilityResult = {
  shouldIndex: boolean;
  uniqueFactScore: number;
  reasons: string[];
  missing: string[];
  robots: "index,follow" | "noindex,follow";
};

const minimumMainPageDataAxes = 2;
const sparseDescriptionLength = 80;

export function calculateSiteDetailIndexability({
  site,
  reviewsCount,
  scamReportsCount,
  dnsRecordCount = 0,
  observationSnapshot,
  domainCreationDates = [],
  relatedBlogReport,
  source = "supabase",
}: SiteDetailIndexabilityInput): SiteDetailIndexabilityResult {
  if (!site) {
    return buildNoindexResult(0, ["site_missing"], ["site"]);
  }

  const approvedReviewCount = Math.max(0, reviewsCount ?? site.reviewCount ?? 0);
  const approvedScamReportCount = Math.max(
    0,
    scamReportsCount ?? site.scamReportCount ?? 0,
  );
  const normalizedSlug = (site.slug ?? "").trim();
  const uniqueDomains = getUniqueDomains(site);
  const representativeDomain = normalizeDomain(site.siteUrl);
  const descriptionLength = getPlainTextLength(site.shortDescription ?? "");
  const observationFactCount = countObservationFacts(observationSnapshot);
  const hasObservationSnapshot = Boolean(observationSnapshot);
  const hasAdditionalDomains = uniqueDomains.length >= 2;
  const hasDnsInfo = Boolean(
    site.dnsCheckedAt ||
      (Array.isArray(site.resolvedIps) && site.resolvedIps.length > 0) ||
      dnsRecordCount > 0,
  );
  const hasDomainCreationDate =
    domainCreationDates.length > 0 || Boolean(site.oldestDomainCreationDate);
  const hasScreenshot = Boolean(
    site.screenshotUrl ||
      site.screenshotThumbUrl ||
      observationSnapshot?.screenshot_url ||
      observationSnapshot?.screenshot_thumb_url ||
      observationSnapshot?.screenshotUrl ||
      observationSnapshot?.screenshotThumbUrl,
  );
  const trustScoreSourceCount = [
    hasAdditionalDomains,
    hasDnsInfo,
    hasDomainCreationDate,
    hasObservationSnapshot,
    approvedReviewCount > 0,
    approvedScamReportCount > 0,
  ].filter(Boolean).length;
  const hasTrustScoreCompositionData = Boolean(
    site.trustScore && trustScoreSourceCount >= 2,
  );
  const hasOperatingHistory = Boolean(
    relatedBlogReport ||
      (hasDomainCreationDate &&
        (hasAdditionalDomains || hasDnsInfo || hasObservationSnapshot)),
  );
  const reasons: string[] = [];
  const missing: string[] = [];
  const dataAxes: string[] = [];
  let uniqueFactScore = 0;

  if (site.moderationStatus && site.moderationStatus !== "approved") {
    missing.push("approved_public_site");
  } else {
    reasons.push("approved_public_site");
  }

  if (normalizedSlug && isValidSiteSlug(normalizedSlug)) {
    reasons.push("valid_slug");
  } else if (site.slug !== undefined) {
    missing.push("valid_slug");
  }

  if (site.siteName.trim()) {
    reasons.push("site_name");
  } else {
    missing.push("site_name");
  }

  if (representativeDomain) {
    reasons.push("representative_domain");
  } else {
    missing.push("representative_domain");
  }

  if (approvedReviewCount > 0) {
    uniqueFactScore += 3;
    reasons.push(`approved_reviews:${approvedReviewCount}`);
    dataAxes.push("approved_reviews");
  } else {
    missing.push("approved_reviews");
  }

  if (approvedScamReportCount > 0) {
    uniqueFactScore += 4;
    reasons.push(`approved_scam_reports:${approvedScamReportCount}`);
    dataAxes.push("approved_scam_reports");
  } else {
    missing.push("approved_scam_reports");
  }

  if (hasAdditionalDomains) {
    uniqueFactScore += 1;
    reasons.push(`additional_domains:${uniqueDomains.length - 1}`);
    dataAxes.push("additional_domains");
  } else {
    missing.push("additional_domains");
  }

  if (hasDnsInfo) {
    uniqueFactScore += 1;
    reasons.push("dns_info");
    dataAxes.push("dns_info");
  } else {
    missing.push("dns_info");
  }

  if (hasDomainCreationDate) {
    uniqueFactScore += 1;
    reasons.push("whois_info");
    dataAxes.push("whois_info");
  } else {
    missing.push("whois_info");
  }

  if (hasObservationSnapshot) {
    uniqueFactScore += 2;
    reasons.push("observation_snapshot");
    dataAxes.push("observation_snapshot");
  } else {
    missing.push("observation_snapshot");
  }

  if (observationFactCount >= 5) {
    uniqueFactScore += 2;
    reasons.push(`observation_facts:${observationFactCount}`);
  } else {
    missing.push("observation_facts_min_5");
  }

  if (descriptionLength >= 300) {
    uniqueFactScore += 1;
    reasons.push("description_300_chars");
  } else {
    missing.push("description_300_chars");
  }

  if (descriptionLength >= 600) {
    uniqueFactScore += 1;
    reasons.push("description_600_chars");
  }

  if (hasScreenshot) {
    uniqueFactScore += 1;
    reasons.push("screenshot");
    dataAxes.push("screenshot");
  } else {
    missing.push("screenshot");
  }

  if (hasOperatingHistory) {
    uniqueFactScore += 1;
    reasons.push("operating_history");
    dataAxes.push("operating_history");
  } else {
    missing.push("operating_history");
  }

  if (hasTrustScoreCompositionData) {
    uniqueFactScore += 1;
    reasons.push("trust_score_data");
    dataAxes.push("trust_score_data");
  } else {
    missing.push("trust_score_data");
  }

  if (source === "fallback") {
    uniqueFactScore = Math.max(0, uniqueFactScore - 3);
    reasons.push("fallback_source");
  }

  if (source === "none" || source === "fallback") {
    return buildNoindexResult(uniqueFactScore, reasons, [
      ...missing,
      "public_supabase_source",
    ]);
  }

  const dataAxisCount = uniqueStrings(dataAxes).length;
  const blockerReasons: string[] = [];

  if (site.moderationStatus && site.moderationStatus !== "approved") {
    blockerReasons.push("site_not_public");
  }

  if (site.slug !== undefined && !isValidSiteSlug(normalizedSlug)) {
    blockerReasons.push("invalid_slug");
  }

  if (!site.siteName.trim()) {
    blockerReasons.push("site_name_missing");
  }

  if (!representativeDomain) {
    blockerReasons.push("representative_domain_missing");
  }

  if (dataAxisCount < minimumMainPageDataAxes) {
    blockerReasons.push("data_axes_min_2");
  }

  if (isAbsenceHeavyThinPage({
    dataAxisCount,
    descriptionLength,
    approvedReviewCount,
    approvedScamReportCount,
    hasAdditionalDomains,
    hasDnsInfo,
    hasDomainCreationDate,
    hasObservationSnapshot,
    hasScreenshot,
  })) {
    blockerReasons.push("absence_heavy_thin_body");
  }

  const shouldIndex = blockerReasons.length === 0;

  if (!shouldIndex) {
    reasons.push(...blockerReasons);
  }

  return {
    shouldIndex,
    uniqueFactScore,
    reasons: uniqueStrings(reasons),
    missing: uniqueStrings(missing),
    robots: shouldIndex ? "index,follow" : "noindex,follow",
  };
}

export function calculateSiteSummaryIndexability(
  site: SiteDetailIndexabilityInput["site"],
  options: Omit<
    SiteDetailIndexabilityInput,
    "site" | "observationSnapshot" | "domainCreationDates" | "relatedBlogReport"
  > = {},
) {
  return calculateSiteDetailIndexability({
    ...options,
    site,
    reviewsCount: options.reviewsCount ?? site?.reviewCount,
    scamReportsCount: options.scamReportsCount ?? site?.scamReportCount,
    source: options.source ?? "supabase",
  });
}

function buildNoindexResult(
  uniqueFactScore: number,
  reasons: string[],
  missing: string[],
): SiteDetailIndexabilityResult {
  return {
    shouldIndex: false,
    uniqueFactScore,
    reasons: uniqueStrings(reasons),
    missing: uniqueStrings(missing),
    robots: "noindex,follow",
  };
}

function getUniqueDomains(site: NonNullable<SiteDetailIndexabilityInput["site"]>) {
  return Array.from(
    new Set([site.siteUrl, ...(site.domains ?? [])].map(normalizeDomain).filter(Boolean)),
  );
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function isValidSiteSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isAbsenceHeavyThinPage({
  dataAxisCount,
  descriptionLength,
  approvedReviewCount,
  approvedScamReportCount,
  hasAdditionalDomains,
  hasDnsInfo,
  hasDomainCreationDate,
  hasObservationSnapshot,
  hasScreenshot,
}: {
  dataAxisCount: number;
  descriptionLength: number;
  approvedReviewCount: number;
  approvedScamReportCount: number;
  hasAdditionalDomains: boolean;
  hasDnsInfo: boolean;
  hasDomainCreationDate: boolean;
  hasObservationSnapshot: boolean;
  hasScreenshot: boolean;
}) {
  const absenceSignals = [
    approvedReviewCount === 0,
    approvedScamReportCount === 0,
    !hasAdditionalDomains,
    !hasDnsInfo,
    !hasDomainCreationDate,
    !hasObservationSnapshot,
    !hasScreenshot,
  ].filter(Boolean).length;

  return (
    dataAxisCount < minimumMainPageDataAxes &&
    descriptionLength < sparseDescriptionLength &&
    absenceSignals >= 5
  );
}

function countObservationFacts(
  snapshot: SiteDetailIndexabilityInput["observationSnapshot"],
) {
  if (!snapshot) return 0;

  return [
    snapshot.observed_menu_labels ?? snapshot.observedMenuLabels,
    snapshot.observed_account_features ?? snapshot.observedAccountFeatures,
    snapshot.observed_betting_features ?? snapshot.observedBettingFeatures,
    snapshot.observed_payment_flags ?? snapshot.observedPaymentFlags,
    snapshot.observed_notice_items ?? snapshot.observedNoticeItems,
    snapshot.observed_event_items ?? snapshot.observedEventItems,
    snapshot.observed_badges ?? snapshot.observedBadges,
  ].reduce<number>((total, values) => total + countStringValues(values), 0);
}

function countStringValues(values: unknown) {
  return Array.isArray(values)
    ? values.filter((value) => typeof value === "string" && value.trim()).length
    : 0;
}

function getPlainTextLength(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}|[-*+]|\d+\.)\s+/gm, " ")
    .replace(/[#*_`>~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
