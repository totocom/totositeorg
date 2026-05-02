import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteDetailHeading,
  buildSiteDetailMetaDescription,
  buildSiteDetailMetadata,
  buildSiteDetailTitle,
  getSiteDetailSocialImage,
  stripMarkdownForMeta,
} from "./site-detail-metadata";
import type { ReviewTarget } from "./sites";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

const markdownDescription = [
  "## 화면 구조",
  "- 홈",
  "- 스포츠",
  "- 카지노",
  "**강조된 설명**과 긴 메뉴 목록이 포함된 관리자 승인 본문입니다.",
  "<script>alert(1)</script>",
].join("\n");

function createSite(overrides: Partial<ReviewTarget> = {}): ReviewTarget {
  return {
    id: "site-1",
    slug: "bettok",
    siteName: "벳톡",
    siteNameKo: "벳톡",
    siteNameEn: "Bettok",
    siteUrl: "https://bettok.example",
    domains: ["https://bettok.example"],
    screenshotUrl: null,
    screenshotThumbUrl: null,
    faviconUrl: null,
    logoUrl: null,
    category: "기타 베팅",
    availableStates: ["KR"],
    licenseInfo: "관리자 등록 사이트",
    status: "운영 중",
    moderationStatus: "approved",
    shortDescription: markdownDescription,
    averageRating: 0,
    reviewCount: 0,
    scamReportCount: 0,
    ...overrides,
  };
}

function countOccurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}

function assertShortPlainMetaDescription(description: string | null | undefined) {
  assert.equal(typeof description, "string");
  assert.equal(description?.includes("##"), false);
  assert.equal(description?.includes("**"), false);
  assert.equal(description?.includes("-"), false);
  assert.equal(description?.includes("\n"), false);
  assert.equal((description?.length ?? 0) <= 160, true);
  assert.equal((description?.length ?? 0) <= 200, true);
}

test("site detail meta description does not use full markdown description", () => {
  const description = buildSiteDetailMetaDescription(createSite());

  assertShortPlainMetaDescription(description);
  assert.equal(description.includes("- 홈"), false);
  assert.equal(description.includes("카지노"), false);
  assert.equal(description.includes("<script"), false);
  assert.equal(description.length >= 80, true);
  assert.match(description, /^벳톡 토토사이트의 주소, 도메인/);
  assert.equal(
    description,
    "벳톡 토토사이트의 주소, 도메인, DNS·WHOIS 정보와 승인된 먹튀 피해 제보 및 후기 현황을 조회 시점 기준으로 정리한 정보 페이지입니다.",
  );
});

test("stripMarkdownForMeta removes markdown html newlines lists and long urls", () => {
  const stripped = stripMarkdownForMeta(
    [
      "## 제목",
      "- 주요 메뉴: 홈, 스포츠, 카지노, 고객센터",
      "**본문** `코드` https://example.com/very/long/path/that/should/not/be/meta",
      "<iframe src='x'></iframe>",
    ].join("\n"),
  );

  assert.equal(stripped.includes("##"), false);
  assert.equal(stripped.includes("**"), false);
  assert.equal(stripped.includes("`"), false);
  assert.equal(stripped.includes("\n"), false);
  assert.equal(stripped.includes("iframe"), false);
  assert.equal(stripped.includes("https://example.com/very/long"), false);
  assert.equal(stripped.includes("주요 메뉴"), false);
});

test("open graph and twitter descriptions use short site specific plain text", () => {
  const metadata = buildSiteDetailMetadata(createSite(), "bettok");
  const openGraph = metadata.openGraph as {
    description?: string;
    title?: string;
  };
  const twitter = metadata.twitter as {
    description?: string | null;
    title?: string;
    card?: string;
  };

  assert.equal(metadata.description, buildSiteDetailMetaDescription(createSite()));
  assert.equal(openGraph.description, buildSiteDetailMetaDescription(createSite()));
  assert.equal(twitter.description, buildSiteDetailMetaDescription(createSite()));
  assertShortPlainMetaDescription(openGraph.description);
  assertShortPlainMetaDescription(twitter.description);
  assert.match(twitter.description ?? "", /^벳톡 토토사이트의 주소, 도메인/);
  assert.equal(twitter.card, "summary_large_image");
});

test("site detail title avoids duplicated 토토사이트 정보 suffix", () => {
  const title = buildSiteDetailTitle(
    createSite({ siteName: "벳톡 토토사이트 정보 토토사이트 정보" }),
  );

  assert.equal(
    title,
    "벳톡 토토사이트 정보 | 주소·도메인·먹튀 제보 현황",
  );
  assert.equal(countOccurrences(title, "토토사이트 정보"), 1);
});

test("site detail H1 uses descriptive site report wording", () => {
  const site = createSite();
  const heading = buildSiteDetailHeading(site);

  assert.equal(heading.endsWith(site.siteName), false);
  assert.equal(heading.includes(`${site.siteName} 토토사이트`), true);
  assert.equal(heading.length >= 20, true);
});

test("site detail H1 removes prohibited promotional terms", () => {
  const heading = buildSiteDetailHeading(
    createSite({ siteName: "벳톡 추천 안전 검증 완료" }),
  );
  const forbiddenTerms = ["추천", "안전", "먹튀 없음", "검증 완료"];

  assert.equal(
    forbiddenTerms.some((term) => heading.includes(term)),
    false,
  );
  assert.equal(heading.includes("토토사이트 정보"), true);
});

test("twitter title is generated from the site detail title", () => {
  const metadata = buildSiteDetailMetadata(createSite(), "bettok");
  const twitter = metadata.twitter as { title?: string };

  assert.equal(
    twitter.title,
    "벳톡 토토사이트 정보 | 주소·도메인·먹튀 제보 현황",
  );
});

test("stored screenshot url is used as open graph and twitter image", () => {
  const screenshotUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/captures/main.webp";
  const metadata = buildSiteDetailMetadata(
    createSite({ screenshotUrl, screenshotThumbUrl: null }),
    "bettok",
  );
  const openGraph = metadata.openGraph as {
    images?: Array<{ url: string }>;
  };
  const twitter = metadata.twitter as {
    images?: Array<{ url: string }>;
  };

  assert.equal(openGraph.images?.[0]?.url, screenshotUrl);
  assert.equal(twitter.images?.[0]?.url, screenshotUrl);
});

test("stored screenshot url takes priority over thumbnail for social image", () => {
  const screenshotUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/captures/main.webp";
  const screenshotThumbUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/captures/thumb.webp";
  const image = getSiteDetailSocialImage(
    createSite({ screenshotUrl, screenshotThumbUrl }),
  );

  assert.equal(image, screenshotUrl);
});

test("favicon only is not used as site detail social image", () => {
  const faviconUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/favicons/favicon.webp";
  const image = getSiteDetailSocialImage(
    createSite({
      faviconUrl,
      screenshotUrl: null,
      screenshotThumbUrl: null,
    }),
  );

  assert.notEqual(image, faviconUrl);
  assert.equal(image.endsWith("/logo.png"), true);
});

test("external site screenshot is not used as social image", () => {
  const externalImageUrl = "https://external-toto.example/og.png";
  const image = getSiteDetailSocialImage(
    createSite({
      screenshotUrl: externalImageUrl,
      screenshotThumbUrl: null,
    }),
  );

  assert.notEqual(image, externalImageUrl);
  assert.equal(image.endsWith("/logo.png"), true);
});

test("empty site description still produces valid meta description", () => {
  const description = buildSiteDetailMetaDescription(
    createSite({ shortDescription: "" }),
  );

  assertShortPlainMetaDescription(description);
  assert.equal(description.length >= 80, true);
  assert.equal(description.includes("벳톡 토토사이트"), true);
});

test("long site description is never copied into metadata description", () => {
  const sensitiveDescription = [
    "## 관리자 입력 설명",
    "- 보너스",
    "- 가입 유도 문구",
    "**전체 본문**이 매우 길게 들어갑니다.",
    "이 문장은 사이트 설명 원문에만 있어야 합니다.",
  ].join("\n");
  const description = buildSiteDetailMetaDescription(
    createSite({ shortDescription: sensitiveDescription }),
  );

  assertShortPlainMetaDescription(description);
  assert.equal(description.includes("관리자 입력 설명"), false);
  assert.equal(description.includes("가입 유도 문구"), false);
  assert.equal(description.includes("전체 본문"), false);
  assert.equal(description.includes("사이트 설명 원문"), false);
});
