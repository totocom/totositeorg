import { unstable_cache } from "next/cache";
import { supabase } from "../../lib/supabase/client";
import { getPublicSites } from "./public-sites";
import type { SiteDetailIndexabilityInput } from "./site-detail-indexability";
import type { ReviewTarget } from "./sites";

type PublicSitemapSnapshot = NonNullable<
  SiteDetailIndexabilityInput["observationSnapshot"]
> & {
  id?: string;
  site_id?: string;
  screenshot_url?: string | null;
  screenshot_thumb_url?: string | null;
  updated_at?: string | null;
};

type PublicSitemapBlogReport = {
  site_id: string;
  slug: string;
  title: string;
  updated_at: string | null;
  published_at: string | null;
};

export type PublicSiteSitemapEntry = {
  site: ReviewTarget;
  observationSnapshot: PublicSitemapSnapshot | null;
  relatedBlogReport: PublicSitemapBlogReport | null;
  approvedReviewCount: number;
  approvedScamReportCount: number;
  latestReviewAt: string | null;
  latestScamReportAt: string | null;
  latestDomainSignalAt: string | null;
  lastModified: string | null;
};

export type PublicSitesForSitemapResult = {
  entries: PublicSiteSitemapEntry[];
  source: "supabase" | "fallback";
  errorMessage: string;
};

type PublicSitesResult = Awaited<ReturnType<typeof getPublicSites>>;

type SitemapSupabaseClient = Pick<typeof supabase, "from">;

type PublicSitesForSitemapOptions = {
  publicSitesResult?: PublicSitesResult;
  supabaseClient?: SitemapSupabaseClient;
};

type SitemapReviewStatRow = {
  site_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type SitemapScamReportStatRow = {
  site_id: string;
  created_at?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
};

type SitemapDnsStatRow = {
  site_id: string;
  checked_at?: string | null;
  updated_at?: string | null;
};

type SitemapStats = {
  approvedReviewCountBySiteId: Map<string, number>;
  approvedScamReportCountBySiteId: Map<string, number>;
  latestReviewAtBySiteId: Map<string, string>;
  latestScamReportAtBySiteId: Map<string, string>;
  latestDomainSignalAtBySiteId: Map<string, string>;
  errorMessage: string;
};

const PUBLIC_SITEMAP_SNAPSHOT_SELECT = [
  "id",
  "site_id",
  "observed_menu_labels",
  "observed_account_features",
  "observed_betting_features",
  "observed_payment_flags",
  "observed_notice_items",
  "observed_event_items",
  "observed_badges",
  "screenshot_url",
  "screenshot_thumb_url",
  "collected_at",
  "updated_at",
].join(", ");

const PUBLIC_SITEMAP_BLOG_REPORT_SELECT = [
  "site_id",
  "slug",
  "title",
  "updated_at",
  "published_at",
].join(", ");

export async function getPublicSitesForSitemapUncached(
  options: PublicSitesForSitemapOptions = {},
): Promise<PublicSitesForSitemapResult> {
  const sitemapSupabase = options.supabaseClient ?? supabase;
  const publicSitesResult = options.publicSitesResult ?? (await getPublicSites());

  if (publicSitesResult.source !== "supabase") {
    return {
      entries: publicSitesResult.sites.map((site) => ({
        site,
        observationSnapshot: null,
        relatedBlogReport: null,
        approvedReviewCount: site.reviewCount,
        approvedScamReportCount: site.scamReportCount ?? 0,
        latestReviewAt: null,
        latestScamReportAt: null,
        latestDomainSignalAt: site.dnsCheckedAt ?? null,
        lastModified: site.dnsCheckedAt ?? null,
      })),
      source: publicSitesResult.source,
      errorMessage: publicSitesResult.errorMessage,
    };
  }

  const siteIds = publicSitesResult.sites.map((site) => site.id);
  const [snapshotsResult, blogReportsResult, statsResult] = await Promise.all([
    sitemapSupabase
      .from("site_crawl_snapshot_public")
      .select(PUBLIC_SITEMAP_SNAPSHOT_SELECT)
      .order("collected_at", { ascending: false }),
    sitemapSupabase
      .from("blog_posts")
      .select(PUBLIC_SITEMAP_BLOG_REPORT_SELECT)
      .eq("status", "published")
      .eq("legal_review_status", "approved")
      .order("updated_at", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false }),
    getSitemapBatchStats(siteIds, sitemapSupabase),
  ]);

  const snapshotBySiteId = new Map<string, PublicSitemapSnapshot>();
  const blogReportBySiteId = new Map<string, PublicSitemapBlogReport>();

  if (!snapshotsResult.error) {
    for (const snapshot of (snapshotsResult.data ?? []) as PublicSitemapSnapshot[]) {
      const siteId = typeof snapshot.site_id === "string" ? snapshot.site_id : "";

      if (siteId && !snapshotBySiteId.has(siteId)) {
        snapshotBySiteId.set(siteId, snapshot);
      }
    }
  }

  if (!blogReportsResult.error) {
    for (const blogReport of (blogReportsResult.data ?? []) as unknown as PublicSitemapBlogReport[]) {
      if (blogReport.site_id && !blogReportBySiteId.has(blogReport.site_id)) {
        blogReportBySiteId.set(blogReport.site_id, blogReport);
      }
    }
  }

  return {
    entries: publicSitesResult.sites.map((site) => {
      const observationSnapshot = snapshotBySiteId.get(site.id) ?? null;
      const relatedBlogReport = blogReportBySiteId.get(site.id) ?? null;
      const approvedReviewCount =
        statsResult.approvedReviewCountBySiteId.get(site.id) ?? 0;
      const approvedScamReportCount =
        statsResult.approvedScamReportCountBySiteId.get(site.id) ?? 0;
      const latestReviewAt = statsResult.latestReviewAtBySiteId.get(site.id) ?? null;
      const latestScamReportAt =
        statsResult.latestScamReportAtBySiteId.get(site.id) ?? null;
      const latestDomainSignalAt =
        statsResult.latestDomainSignalAtBySiteId.get(site.id) ??
        site.dnsCheckedAt ??
        null;

      return {
        site,
        observationSnapshot,
        relatedBlogReport,
        approvedReviewCount,
        approvedScamReportCount,
        latestReviewAt,
        latestScamReportAt,
        latestDomainSignalAt,
        lastModified: getSitemapLastModified({
          site,
          observationSnapshot,
          relatedBlogReport,
          latestReviewAt,
          latestScamReportAt,
          latestDomainSignalAt,
        }),
      };
    }),
    source: publicSitesResult.source,
    errorMessage:
      publicSitesResult.errorMessage ||
      snapshotsResult.error?.message ||
      blogReportsResult.error?.message ||
      statsResult.errorMessage ||
      "",
  };
}

async function getSitemapBatchStats(
  siteIds: string[],
  sitemapSupabase: SitemapSupabaseClient,
): Promise<SitemapStats> {
  if (siteIds.length === 0) {
    return {
      approvedReviewCountBySiteId: new Map(),
      approvedScamReportCountBySiteId: new Map(),
      latestReviewAtBySiteId: new Map(),
      latestScamReportAtBySiteId: new Map(),
      latestDomainSignalAtBySiteId: new Map(),
      errorMessage: "",
    };
  }

  const [reviewsResult, scamReportsResult, dnsResult] = await Promise.all([
    sitemapSupabase
      .from("reviews")
      .select("site_id, created_at, updated_at")
      .in("site_id", siteIds)
      .eq("status", "approved"),
    sitemapSupabase
      .from("scam_reports")
      .select("site_id, created_at, approved_at, published_at, updated_at")
      .in("site_id", siteIds)
      .eq("review_status", "approved")
      .eq("is_published", true),
    sitemapSupabase
      .from("site_dns_records")
      .select("site_id, checked_at, updated_at")
      .in("site_id", siteIds),
  ]);

  const reviewRows = reviewsResult.error
    ? []
    : ((reviewsResult.data ?? []) as SitemapReviewStatRow[]);
  const scamReportRows = scamReportsResult.error
    ? []
    : ((scamReportsResult.data ?? []) as SitemapScamReportStatRow[]);
  const dnsRows = dnsResult.error
    ? []
    : ((dnsResult.data ?? []) as SitemapDnsStatRow[]);

  return {
    approvedReviewCountBySiteId: buildCountBySiteId(reviewRows),
    approvedScamReportCountBySiteId: buildCountBySiteId(scamReportRows),
    latestReviewAtBySiteId: buildLatestDateBySiteId(
      reviewRows,
      (row) => firstValidDate(row.updated_at, row.created_at),
    ),
    latestScamReportAtBySiteId: buildLatestDateBySiteId(
      scamReportRows,
      (row) =>
        firstValidDate(
          row.approved_at,
          row.published_at,
          row.updated_at,
          row.created_at,
        ),
    ),
    latestDomainSignalAtBySiteId: buildLatestDateBySiteId(
      dnsRows,
      (row) => firstValidDate(row.checked_at, row.updated_at),
    ),
    errorMessage:
      reviewsResult.error?.message ||
      scamReportsResult.error?.message ||
      dnsResult.error?.message ||
      "",
  };
}

function getSitemapLastModified({
  site,
  observationSnapshot,
  relatedBlogReport,
  latestReviewAt,
  latestScamReportAt,
  latestDomainSignalAt,
}: {
  site: ReviewTarget;
  observationSnapshot: PublicSitemapSnapshot | null;
  relatedBlogReport: PublicSitemapBlogReport | null;
  latestReviewAt: string | null;
  latestScamReportAt: string | null;
  latestDomainSignalAt: string | null;
}) {
  return firstValidDate(
    observationSnapshot?.updated_at,
    observationSnapshot?.collected_at,
    relatedBlogReport?.updated_at,
    relatedBlogReport?.published_at,
    latestReviewAt,
    latestScamReportAt,
    latestDomainSignalAt,
    site.dnsCheckedAt,
  );
}

function buildLatestDateBySiteId<T extends { site_id?: string | null }>(
  rows: T[],
  getDate: (row: T) => string | null,
) {
  const latestBySiteId = new Map<string, string>();

  for (const row of rows) {
    const siteId = row.site_id;
    const date = getDate(row);

    if (!siteId || !date) continue;

    const current = latestBySiteId.get(siteId);
    if (!current || getTime(date) > getTime(current)) {
      latestBySiteId.set(siteId, date);
    }
  }

  return latestBySiteId;
}

function buildCountBySiteId<T extends { site_id?: string | null }>(rows: T[]) {
  const countBySiteId = new Map<string, number>();

  for (const row of rows) {
    if (!row.site_id) continue;

    countBySiteId.set(row.site_id, (countBySiteId.get(row.site_id) ?? 0) + 1);
  }

  return countBySiteId;
}

function getTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function firstValidDate(...values: Array<string | null | undefined>) {
  return (
    values.find((value) => {
      if (!value) return false;

      return Number.isFinite(new Date(value).getTime());
    }) ?? null
  );
}

export const getPublicSitesForSitemap = unstable_cache(
  getPublicSitesForSitemapUncached,
  ["public-sites-for-sitemap"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);
