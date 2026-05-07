const baseUrl = (process.env.PRODUCTION_URL ?? "https://totosite.org").replace(
  /\/+$/,
  "",
);

const checks = [];

function addCheck(name, passed, detail = "") {
  checks.push({ name, passed, detail });
}

async function fetchText(path) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "totosite-production-seo-smoke/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return {
    url,
    text: await response.text(),
    headers: response.headers,
  };
}

function getVisibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function getRobotsContent(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const robotsTag = metaTags.find((tag) => /name=["']robots["']/i.test(tag));

  if (!robotsTag) return "";

  return robotsTag.match(/content=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
}

function getSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) =>
    normalizeUrl(match[1]),
  );
}

function normalizeUrl(url) {
  const trimmed = url.trim().replace(/\/+$/, "");
  return trimmed || url.trim();
}

const home = await fetchText("/");
const homeText = getVisibleText(home.text);
const sites = await fetchText("/sites");
const sitesText = getVisibleText(sites.text);
const blog = await fetchText("/blog");
const sitemap = await fetchText("/sitemap.xml");
const sitemapUrls = getSitemapUrls(sitemap.text);
const normalizedBaseUrl = normalizeUrl(baseUrl);

for (const term of [
  "계정 상태를 불러오는 중입니다.",
  "1. 1",
  "★토토사이트 정보",
]) {
  addCheck(`home does not contain "${term}"`, !homeText.includes(term));
}

addCheck(
  "/sites visible text does not expose direct http URLs",
  !/https?:\/\//i.test(sitesText),
);

for (const term of ["안전한 서비스", "빠른 서비스", "바로가기"]) {
  addCheck(`/sites does not contain "${term}"`, !sitesText.includes(term));
}

addCheck(
  "/blog meta robots is noindex",
  getRobotsContent(blog.text).includes("noindex"),
  getRobotsContent(blog.text),
);

addCheck(
  "sitemap includes /sites",
  sitemapUrls.includes(`${normalizedBaseUrl}/sites`),
);

for (const excludedPath of ["/blog", "/submit-review", "/submit-scam-report"]) {
  addCheck(
    `sitemap excludes ${excludedPath}`,
    !sitemapUrls.some((url) => url === `${normalizedBaseUrl}${excludedPath}` ||
      url.startsWith(`${normalizedBaseUrl}${excludedPath}/`)),
  );
}

const failed = checks.filter((check) => !check.passed);

for (const check of checks) {
  const status = check.passed ? "PASS" : "FAIL";
  const detail = check.detail ? ` (${check.detail})` : "";
  console.log(`${status} ${check.name}${detail}`);
}

console.log(`INFO sitemap URL count: ${sitemapUrls.length}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
