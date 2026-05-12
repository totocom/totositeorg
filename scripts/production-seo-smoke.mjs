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

function getMetaContent(html, attribute, value) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const metaTag = metaTags.find((tag) =>
    new RegExp(`${attribute}=["']${value}["']`, "i").test(tag),
  );

  return metaTag?.match(/content=["']([^"']+)["']/i)?.[1] ?? "";
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
const defaultOgImageUrl = `${normalizedBaseUrl}/og-default.webp`;

for (const term of [
  "계정 상태를 불러오는 중입니다.",
  "1. 1",
  "★토토사이트 정보",
]) {
  addCheck(`home does not contain "${term}"`, !homeText.includes(term));
}

addCheck(
  "home og:title is present",
  Boolean(getMetaContent(home.text, "property", "og:title")),
);

addCheck(
  "home og:description is present",
  Boolean(getMetaContent(home.text, "property", "og:description")),
);

addCheck(
  "home og:image uses absolute default image",
  getMetaContent(home.text, "property", "og:image") === defaultOgImageUrl,
  getMetaContent(home.text, "property", "og:image"),
);

addCheck(
  "home twitter:card is summary_large_image",
  getMetaContent(home.text, "name", "twitter:card") === "summary_large_image",
  getMetaContent(home.text, "name", "twitter:card"),
);

addCheck(
  "home twitter:image uses absolute default image",
  getMetaContent(home.text, "name", "twitter:image") === defaultOgImageUrl,
  getMetaContent(home.text, "name", "twitter:image"),
);

addCheck(
  "/sites visible text does not expose direct http URLs",
  !/https?:\/\//i.test(sitesText),
);

addCheck(
  "/sites og:image falls back to absolute default image",
  getMetaContent(sites.text, "property", "og:image") === defaultOgImageUrl,
  getMetaContent(sites.text, "property", "og:image"),
);

addCheck(
  "/sites twitter:image falls back to absolute default image",
  getMetaContent(sites.text, "name", "twitter:image") === defaultOgImageUrl,
  getMetaContent(sites.text, "name", "twitter:image"),
);

for (const term of ["안전한 서비스", "빠른 서비스", "바로가기"]) {
  addCheck(`/sites HTML does not contain "${term}"`, !sites.text.includes(term));
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
    !sitemapUrls.some((url) => url === `${normalizedBaseUrl}${excludedPath}`),
  );
}

addCheck(
  "sitemap excludes query parameter URLs",
  !sitemapUrls.some((url) => /[?#]/.test(url)),
);

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
