export type SiteDetailIndexabilityInput = {
  site: {
    siteName: string;
    siteUrl: string;
    domains: string[];
    shortDescription?: string | null;
    reviewCount: number;
    scamReportCount?: number;
    scamDamageAmount?: number;
    screenshotUrl?: string | null;
    screenshotThumbUrl?: string | null;
    dnsCheckedAt?: string | null;
    oldestDomainCreationDate?: string | null;
  } | null;
  reviewsCount?: number;
  scamReportsCount?: number;
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

const descriptionLengthForIndex = 300;

export function calculateSiteDetailIndexability({
  site,
  reviewsCount,
  scamReportsCount,
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
  const uniqueDomains = getUniqueDomains(site);
  const descriptionLength = getPlainTextLength(site.shortDescription ?? "");
  const observationFactCount = countObservationFacts(observationSnapshot);
  const hasObservationSnapshot = Boolean(observationSnapshot);
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
  const reasons: string[] = [];
  const missing: string[] = [];
  let uniqueFactScore = 0;

  if (approvedReviewCount > 0) {
    uniqueFactScore += 3;
    reasons.push(`approved_reviews:${approvedReviewCount}`);
  } else {
    missing.push("approved_reviews");
  }

  if (approvedScamReportCount > 0) {
    uniqueFactScore += 4;
    reasons.push(`approved_scam_reports:${approvedScamReportCount}`);
  } else {
    missing.push("approved_scam_reports");
  }

  if (uniqueDomains.length >= 2) {
    uniqueFactScore += 1;
    reasons.push(`domains:${uniqueDomains.length}`);
  } else {
    missing.push("additional_domains");
  }

  if (hasDomainCreationDate) {
    uniqueFactScore += 1;
    reasons.push("domain_creation_date");
  } else {
    missing.push("domain_creation_date");
  }

  if (hasObservationSnapshot) {
    uniqueFactScore += 2;
    reasons.push("observation_snapshot");
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
  } else {
    missing.push("screenshot");
  }

  if (relatedBlogReport) {
    uniqueFactScore += 1;
    reasons.push("related_blog_report");
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

  const hasReportOrReview = approvedScamReportCount > 0 || approvedReviewCount > 0;
  const hasEnoughObservedOrDomainData =
    uniqueDomains.length > 0 || hasObservationSnapshot;
  const hasEnoughUniqueData =
    uniqueFactScore >= 5 &&
    descriptionLength >= descriptionLengthForIndex &&
    hasEnoughObservedOrDomainData;
  const shouldIndex = hasReportOrReview || hasEnoughUniqueData;

  if (!shouldIndex) {
    reasons.push("insufficient_unique_public_data");
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
