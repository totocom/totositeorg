import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getPublicSitesForSitemapUncached } from "./public-sites-sitemap";
import type { ReviewTarget } from "./sites";

const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
const publicSitesSource = readFileSync("app/data/public-sites.ts", "utf8");
const layoutSource = readFileSync("app/layout.tsx", "utf8");

type SitemapLoaderOptions = NonNullable<
  Parameters<typeof getPublicSitesForSitemapUncached>[0]
>;
type SitemapPublicSitesResult = NonNullable<
  SitemapLoaderOptions["publicSitesResult"]
>;
type RecordedQueryResult = {
  data: unknown[];
  error: null;
};

class RecordedSupabaseQuery implements PromiseLike<RecordedQueryResult> {
  constructor(private readonly rows: unknown[]) {}

  select() {
    return this;
  }

  in() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  then<TResult1 = RecordedQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: RecordedQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.rows, error: null }).then(
      onfulfilled,
      onrejected,
    );
  }
}

function createSupabaseCallRecorder() {
  const calls: string[] = [];
  const rowsByTable = new Map<string, unknown[]>([
    ["site_crawl_snapshot_public", []],
    ["blog_posts", []],
    ["reviews", []],
    ["scam_reports", []],
    ["site_dns_records", []],
  ]);

  return {
    client: {
      from(table: string) {
        calls.push(table);

        return new RecordedSupabaseQuery(rowsByTable.get(table) ?? []);
      },
    },
    countByTable(table: string) {
      return calls.filter((calledTable) => calledTable === table).length;
    },
  };
}

function createSitemapSite(overrides: Partial<ReviewTarget>): ReviewTarget {
  return {
    id: "site-1",
    slug: "test-site-1",
    siteName: "테스트 사이트",
    siteNameKo: "테스트 사이트",
    siteNameEn: "Test Site",
    siteUrl: "https://example.com",
    domains: ["example.com"],
    screenshotUrl: null,
    category: "토토사이트",
    availableStates: ["전국"],
    licenseInfo: "확인 필요",
    status: "운영 중",
    moderationStatus: "approved",
    shortDescription: "테스트 사이트 설명",
    averageRating: 0,
    reviewCount: 0,
    scamReportCount: 0,
    ...overrides,
  };
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}

test("site detail page uses one cached public loader for metadata and page", () => {
  assert.match(siteDetailPageSource, /import\s+\{\s*cache\s*\}\s+from\s+"react"/);
  assert.match(siteDetailPageSource, /export\s+const\s+revalidate\s*=\s*300/);
  assert.match(siteDetailPageSource, /const\s+getCachedPublicSiteDetail\s*=\s*cache\(/);
  assert.equal(countOccurrences(siteDetailPageSource, "await getCachedPublicSiteDetail("), 2);
});

test("site detail page does not run a separate domain creation date query", () => {
  assert.equal(siteDetailPageSource.includes("getBatchDomainCreationDates"), false);
  assert.match(siteDetailPageSource, /domainCreationDates\.map/);
  assert.match(siteDetailPageSource, /site\.oldestDomainCreationDate\s*\?\?\s*null/);
});

test("public site detail loader only selects public site columns and public rows", () => {
  assert.match(publicSitesSource, /const\s+PUBLIC_SITE_SELECT\s*=/);
  assert.equal(publicSitesSource.includes('.select("*")'), false);
  assert.match(publicSitesSource, /\.select\(PUBLIC_SITE_SELECT\)[\s\S]*?\.eq\("slug",\s*slug\)[\s\S]*?\.eq\("status",\s*"approved"\)/);
  assert.match(publicSitesSource, /\.from\("scam_reports"\)[\s\S]*?\.eq\("review_status",\s*"approved"\)[\s\S]*?\.eq\("is_published",\s*true\)/);
  assert.match(publicSitesSource, /\.from\("blog_posts"\)[\s\S]*?\.eq\("status",\s*"published"\)[\s\S]*?\.eq\("legal_review_status",\s*"approved"\)/);
});

test("favicon is not preloaded and screenshot image is rendered only when present", () => {
  const combinedSource = `${siteDetailPageSource}\n${layoutSource}`;

  assert.equal(/rel=\{?["']preload["']?[\s\S]{0,120}favicon/i.test(combinedSource), false);
  assert.equal(/favicon[\s\S]{0,120}rel=\{?["']preload["']?/i.test(combinedSource), false);
  assert.match(siteDetailPageSource, /const\s+screenshotPreviewUrl\s*=\s*site\.screenshotUrl\s*\?/);
  assert.match(siteDetailPageSource, /site\.screenshotUrl\s*&&\s*screenshotPreviewUrl\s*\?/);
});

test("sitemap loader does not query per site", async () => {
  const calls = createSupabaseCallRecorder();
  const publicSitesResult: SitemapPublicSitesResult = {
    sites: [
      createSitemapSite({ id: "site-1", slug: "test-site-1" }),
      createSitemapSite({ id: "site-2", slug: "test-site-2" }),
    ],
    categories: ["토토사이트"],
    states: ["전국"],
    errorMessage: "",
    source: "supabase",
  };

  const result = await getPublicSitesForSitemapUncached({
    publicSitesResult,
    supabaseClient: calls.client as unknown as SitemapLoaderOptions["supabaseClient"],
  });

  assert.equal(calls.countByTable("reviews") <= 1, true);
  assert.equal(calls.countByTable("scam_reports") <= 1, true);
  assert.equal(calls.countByTable("site_dns_records") <= 1, true);
  assert.deepEqual(
    result.entries.map((entry) => entry.approvedReviewCount),
    [0, 0],
  );
  assert.deepEqual(
    result.entries.map((entry) => entry.approvedScamReportCount),
    [0, 0],
  );
});
