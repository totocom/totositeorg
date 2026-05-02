import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
const publicSitesSource = readFileSync("app/data/public-sites.ts", "utf8");
const layoutSource = readFileSync("app/layout.tsx", "utf8");

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
