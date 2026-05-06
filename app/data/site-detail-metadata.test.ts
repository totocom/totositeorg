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
import {
  buildDomainsSiteTitle,
  buildDomainsTitleSuffix,
  buildReviewsTitleSuffix,
} from "./site-detail-subpage-metadata";
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

test("reviews title suffix omits negative rating signals for empty reviews", () => {
  assert.equal(buildReviewsTitleSuffix(0, 0), "이용자 후기");
  assert.equal(buildReviewsTitleSuffix(0, 5), "이용자 후기");
});

test("reviews title suffix omits zero rating when reviews exist", () => {
  assert.equal(buildReviewsTitleSuffix(5, 0), "후기 5건");
});

test("reviews title suffix includes rating only when reviews and positive rating exist", () => {
  assert.equal(buildReviewsTitleSuffix(5, 4.2), "후기 5건·평점 4.2점");
});

test("domains title suffix uses operating history when present", () => {
  assert.equal(
    buildDomainsTitleSuffix(3, "1년 11개월"),
    "도메인 3개·운영 이력 1년 11개월",
  );
});

test("domains site title keeps parenthesized site name within hard limit", () => {
  assert.equal(
    buildDomainsSiteTitle(
      "유튜벳 (YOUTOOBET)",
      "도메인 3개·운영 이력 1년 11개월",
    ),
    "유튜벳 (YOUTOOBET) 도메인 3개·운영 이력 1년 11개월",
  );
});

test("domains title suffix falls back to address domain wording without history", () => {
  assert.equal(buildDomainsTitleSuffix(3, null), "주소·도메인 3개");
});

test("site detail meta description does not use full markdown description", () => {
  const description = buildSiteDetailMetaDescription(createSite());

  assertShortPlainMetaDescription(description);
  assert.equal(description.includes("- 홈"), false);
  assert.equal(description.includes("카지노"), false);
  assert.equal(description.includes("<script"), false);
  assert.equal(description.length >= 80, true);
  assert.match(description, /^벳톡의 대표 도메인 bettok\.example/);
  assert.match(description, /승인 후기와 피해 제보가 부족/);
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
  assert.match(twitter.description ?? "", /^벳톡의 대표 도메인 bettok\.example/);
  assert.equal(twitter.card, "summary_large_image");
});

test("site detail title avoids duplicated 토토사이트 정보 suffix", () => {
  const title = buildSiteDetailTitle(
    createSite({ siteName: "벳톡 토토사이트 정보 토토사이트 정보" }),
  );

  assert.equal(
    title,
    "벳톡 주소·기본 정보",
  );
  assert.equal(countOccurrences(title, "토토사이트 정보"), 0);
});

test("site detail H1 uses descriptive site report wording", () => {
  const site = createSite();
  const heading = buildSiteDetailHeading(site);

  assert.equal(heading.endsWith(site.siteName), false);
  assert.equal(heading.includes(site.siteName), true);
  assert.equal(heading.includes(`${site.siteName} 토토사이트`), true);
  assert.match(heading, /기본 정보|주소·도메인|후기·제보/);
  assert.equal(heading.length >= 15, true);
});

test("site detail H1 includes 토토사이트 before report wording", () => {
  const heading = buildSiteDetailHeading(
    createSite({
      siteName: "유튜벳 (YOUTOOBET)",
      reviewCount: 3,
      scamReportCount: 1,
    }),
  );

  assert.equal(
    heading,
    "유튜벳 (YOUTOOBET) 토토사이트 후기·제보 현황 리포트",
  );
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
  assert.equal(heading.includes("기본 정보"), true);
});

test("twitter title is generated from the site detail title", () => {
  const metadata = buildSiteDetailMetadata(createSite(), "bettok");
  const twitter = metadata.twitter as { title?: string };

  assert.equal(
    twitter.title,
    "벳톡 주소·기본 정보",
  );
});

test("site detail title reflects approved reports reviews and domains", () => {
  assert.equal(
    buildSiteDetailTitle(createSite({ scamReportCount: 2, reviewCount: 1 })),
    "벳톡 피해 제보 2건·도메인 현황",
  );
  assert.equal(
    buildSiteDetailTitle(createSite({ reviewCount: 3 })),
    "벳톡 후기 3건·관측 정보",
  );
  assert.equal(
    buildSiteDetailTitle(
      createSite({
        siteUrl: "https://bettok.example",
        domains: ["https://bettok.example", "https://bettok.kr"],
      }),
    ),
    "벳톡 도메인 2개·확인 항목",
  );
  assert.equal(
    buildSiteDetailTitle(createSite(), {
      observationSnapshot: {
        observed_betting_features: Array.from({ length: 55 }, (_, index) =>
          `관측 항목 ${index}`,
        ),
      },
    }),
    "벳톡 화면 관측 55개·도메인 정보",
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
  assert.equal(description.includes("벳톡"), true);
  assert.equal(description.includes("bettok.example"), true);
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
