import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("site detail meta description does not use full markdown description", () => {
  const description = buildSiteDetailMetaDescription(createSite());

  assert.equal(description.includes("##"), false);
  assert.equal(description.includes("**"), false);
  assert.equal(description.includes("\n"), false);
  assert.equal(description.includes("- 홈"), false);
  assert.equal(description.includes("카지노"), false);
  assert.equal(description.includes("<script"), false);
  assert.equal(description.length <= 200, true);
  assert.match(description, /^벳톡 토토사이트의 주소, 도메인/);
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

  assert.equal(openGraph.description, buildSiteDetailMetaDescription(createSite()));
  assert.equal(twitter.description, buildSiteDetailMetaDescription(createSite()));
  assert.equal(openGraph.description?.includes("##"), false);
  assert.equal(twitter.description?.includes("**"), false);
  assert.equal((openGraph.description?.length ?? 0) <= 200, true);
  assert.equal((twitter.description?.length ?? 0) <= 200, true);
  assert.equal(twitter.card, "summary_large_image");
});

test("site detail title avoids duplicated 토토사이트 정보 suffix", () => {
  const title = buildSiteDetailTitle(
    createSite({ siteName: "벳톡 토토사이트 정보" }),
  );

  assert.equal(
    title,
    "벳톡 토토사이트 정보 | 주소·도메인·먹튀 제보 현황",
  );
  assert.equal(countOccurrences(title, "토토사이트 정보"), 1);
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

  assert.equal(description.length > 0, true);
  assert.equal(description.length <= 200, true);
  assert.equal(description.includes("벳톡 토토사이트"), true);
});
