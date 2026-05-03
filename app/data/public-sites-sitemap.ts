import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase/client";
import { getPublicSites } from "@/app/data/public-sites";
import type { SiteDetailIndexabilityInput } from "@/app/data/site-detail-indexability";
import type { ReviewTarget } from "@/app/data/sites";

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
  lastModified: string | null;
};

type PublicSitesForSitemapResult = {
  entries: PublicSiteSitemapEntry[];
  source: "supabase" | "fallback";
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

async function getPublicSitesForSitemapUncached(): Promise<PublicSitesForSitemapResult> {
  const publicSitesResult = await getPublicSites();

  if (publicSitesResult.source !== "supabase") {
    return {
      entries: publicSitesResult.sites.map((site) => ({
        site,
        observationSnapshot: null,
        relatedBlogReport: null,
        lastModified: site.dnsCheckedAt ?? null,
      })),
      source: publicSitesResult.source,
      errorMessage: publicSitesResult.errorMessage,
    };
  }

  const [snapshotsResult, blogReportsResult] = await Promise.all([
    supabase
      .from("site_crawl_snapshot_public")
      .select(PUBLIC_SITEMAP_SNAPSHOT_SELECT)
      .order("collected_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select(PUBLIC_SITEMAP_BLOG_REPORT_SELECT)
      .eq("status", "published")
      .eq("legal_review_status", "approved")
      .order("updated_at", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false }),
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

      return {
        site,
        observationSnapshot,
        relatedBlogReport,
        lastModified: getSitemapLastModified({
          site,
          observationSnapshot,
          relatedBlogReport,
        }),
      };
    }),
    source: publicSitesResult.source,
    errorMessage:
      publicSitesResult.errorMessage ||
      snapshotsResult.error?.message ||
      blogReportsResult.error?.message ||
      "",
  };
}

function getSitemapLastModified({
  site,
  observationSnapshot,
  relatedBlogReport,
}: {
  site: ReviewTarget;
  observationSnapshot: PublicSitemapSnapshot | null;
  relatedBlogReport: PublicSitemapBlogReport | null;
}) {
  return firstValidDate(
    observationSnapshot?.updated_at,
    observationSnapshot?.collected_at,
    relatedBlogReport?.updated_at,
    relatedBlogReport?.published_at,
    site.dnsCheckedAt,
  );
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
