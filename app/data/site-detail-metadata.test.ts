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
import { buildSiteNameFormats, getSiteTitleName } from "./site-name-format";
import {
  buildDomainsSiteTitle,
  buildDomainsTitleSuffix,
  buildReviewsTitleSuffix,
  buildSiteDomainsDescription,
  buildSiteDomainsTitle,
  buildSiteReviewsDescription,
  buildSiteScamReportsDescription,
  buildSiteScamReportsTitle,
} from "./site-detail-subpage-metadata";
import {
  buildReviewCardTitle,
  buildReviewSelectionSummary,
  buildScamReportCardTitle,
  buildScamReportSelectionSummary,
  parseReviewSurveyPayload,
} from "./public-seo-selection";
import {
  formatScamReportDepositAmount,
  getScamReportDepositCoinUnit,
} from "./scam-report-deposit-display";
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

test("site name formats separate title display and body names", () => {
  assert.deepEqual(buildSiteNameFormats("베베 (BEBE)"), {
    koreanName: "베베",
    englishAlias: "BEBE",
    displayName: "베베 (BEBE)",
    titleName: "베베",
    bodyName: "베베(BEBE)",
    includeEnglishAliasInTitle: false,
  });
});

test("site title name can include English alias by exception option", () => {
  const site = createSite({
    siteName: "베베 (BEBE)",
    includeEnglishAliasInTitle: true,
  });

  assert.equal(getSiteTitleName(site), "베베(BEBE)");
  assert.equal(
    buildSiteDetailTitle(site),
    "베베(BEBE) 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
});

test("reviews title suffix avoids volatile count and rating signals", () => {
  assert.equal(
    buildReviewsTitleSuffix(0, 0),
    "후기와 이용자 만족도 평가",
  );
  assert.equal(
    buildReviewsTitleSuffix(0, 5),
    "후기와 이용자 만족도 평가",
  );
});

test("reviews title suffix stays stable when reviews exist without rating", () => {
  assert.equal(
    buildReviewsTitleSuffix(5, 0),
    "후기와 이용자 만족도 평가",
  );
});

test("reviews title suffix omits positive rating from metadata title", () => {
  assert.equal(
    buildReviewsTitleSuffix(5, 4.2),
    "후기와 이용자 만족도 평가",
  );
});

test("scam reports title avoids volatile counts and confirmation wording", () => {
  const title = buildSiteScamReportsTitle("유튜벳 (YOUTOOBET)");

  assert.equal(
    title,
    "유튜벳 먹튀 제보와 피해 사례 확인 | 토토사이트 정보",
  );
  assert.equal(title.includes("1건"), false);
  assert.equal(title.includes("먹튀 확정"), false);
  assert.equal(title.includes("위험 사이트"), false);
});

test("scam reports description stays short and uses limited selected fields", () => {
  const description = buildSiteScamReportsDescription(
    createSite({ siteName: "유튜벳 (YOUTOOBET)" }),
    [
      {
        damageTypes: ["출금 거부", "계정 차단"],
        mainCategory: "카지노베팅",
        categoryItems: ["바카라"],
      },
    ],
  );

  assert.equal(
    description,
    "유튜벳(YOUTOOBET)의 먹튀 제보 1건과 바카라 출금 거부 사례를 정리했습니다. 제보는 참고 자료이며 사실 확정이 아닙니다.",
  );
  assert.equal(description.length >= 70 && description.length <= 95, true);
  assert.equal(description.includes("계정 차단"), false);
  assert.equal(description.includes("단일 제보"), false);
  assert.equal(description.includes("후기"), false);
  assert.equal(description.includes("먹튀 확정"), false);
  assert.equal(description.includes("피해 금액"), false);
});

test("scam report card and summary use limited selected fields", () => {
  const report = {
    damageTypes: ["출금 지연", "계정 차단", "기타"],
    mainCategory: "카지노베팅",
    categoryItems: ["바카라"],
  };

  assert.equal(
    buildScamReportCardTitle(report),
    "출금 지연·계정 차단 · 카지노베팅 제보",
  );
  assert.equal(
    buildScamReportSelectionSummary(report, "애니카지노(anicasino)"),
    "승인된 공개 제보 기준으로, 작성자는 애니카지노(anicasino) 이용 중 바카라 관련 출금 지연·계정 차단 피해를 주장했습니다.",
  );
});

test("coin scam report deposit amount uses the submitted coin unit", () => {
  const report = {
    depositAmount: 100,
    depositBankName:
      "코인: usdt / 지갑: TPu7sensitiveWalletValue / TX: 123456",
  };

  assert.equal(getScamReportDepositCoinUnit(report), "usdt");
  assert.equal(formatScamReportDepositAmount(report), "100usdt");
});

test("scam report deposit amount keeps bank deposits in won", () => {
  assert.equal(
    formatScamReportDepositAmount({
      depositAmount: 100,
      depositBankName: "국민은행",
    }),
    "100원",
  );
});

test("coin deposit amount does not expose suspicious unit values", () => {
  assert.equal(
    formatScamReportDepositAmount({
      depositAmount: 100,
      depositBankName: "코인: 0x1234567890abcdef1234 / 지갑: 비공개",
    }),
    "100 (코인 단위 미확인)",
  );
});

test("reviews description card and summary keep title stable while reflecting choices", () => {
  const experience = JSON.stringify({
    type: "site_satisfaction_survey",
    answers: {
      betting_category: ["카지노베팅", "기타 베팅"],
      casino_betting: ["바카라"],
      overall_satisfaction: "보통",
      withdraw_speed: "5~10분",
      cs_response_speed: "빠름",
      recommendation: "추천",
    },
  });
  const payload = parseReviewSurveyPayload(experience);

  assert.ok(payload);
  assert.equal(
    buildSiteReviewsDescription(createSite({ siteName: "베베(BEBE)" }), [
      { experience },
    ]),
    "베베(BEBE)의 후기 1건과 카지노베팅·환전·고객센터 평가를 작성자 응답 기준으로 정리했습니다. 후기는 참고 자료이며 단정 근거가 아닙니다.",
  );
  assert.equal(
    buildSiteReviewsDescription(createSite({ siteName: "베베(BEBE)" }), [
      { experience },
    ]).length >= 70,
    true,
  );
  assert.equal(
    buildReviewCardTitle(experience, "기존 제목"),
    "카지노베팅 이용 보통 평가",
  );
  assert.equal(
    buildReviewSelectionSummary("베베(BEBE)", payload),
    "승인된 후기 기준으로, 작성자는 베베(BEBE) 이용 중 카지노베팅과 바카라 경험, 환전 처리와 고객센터 응답에 대한 평가를 남겼습니다.",
  );
  assert.equal(buildReviewCardTitle(experience).includes("추천"), false);
  assert.equal(
    buildSiteReviewsDescription(createSite({ siteName: "베베(BEBE)" }), [
      { experience },
    ]).includes("추천"),
    false,
  );
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

test("domains metadata title avoids count and access wording", () => {
  const title = buildSiteDomainsTitle("유튜벳 (YOUTOOBET)");

  assert.equal(
    title,
    "유튜벳 주소와 도메인 변경 이력 확인 | 토토사이트 정보",
  );
  assert.equal(title.includes("3개"), false);
  assert.equal(title.includes("우회"), false);
  assert.equal(title.includes("접속"), false);
});

test("domains metadata description frames DNS WHOIS as reference data", () => {
  const description = buildSiteDomainsDescription(
    createSite({ siteName: "유튜벳 (YOUTOOBET)" }),
  );

  assert.match(description, /^유튜벳\(YOUTOOBET\)의 대표 도메인/);
  assert.match(description, /DNS·WHOIS 참고 정보/);
  assert.match(description, /보장하지 않습니다/);
  assert.equal(description.includes("우회"), false);
  assert.equal(description.includes("접속"), false);
});

test("site detail meta description does not use full markdown description", () => {
  const description = buildSiteDetailMetaDescription(createSite());

  assertShortPlainMetaDescription(description);
  assert.equal(description.includes("- 홈"), false);
  assert.equal(description.includes("카지노"), false);
  assert.equal(description.includes("<script"), false);
  assert.equal(description.length >= 80, true);
  assert.match(description, /^벳톡\(Bettok\)의 먹튀 제보 현황과 대표 도메인 bettok\.example/);
  assert.match(description, /제보 내용은 참고 자료/);
  assert.match(description, /사이트 전체 상태를 단정하지 않습니다/);
  assert.equal(description.includes("후기"), false);
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
  assert.match(
    twitter.description ?? "",
    /^벳톡\(Bettok\)의 먹튀 제보 현황과 대표 도메인 bettok\.example/,
  );
  assert.equal(twitter.card, "summary_large_image");
});

test("site detail title avoids duplicated 토토사이트 정보 suffix", () => {
  const title = buildSiteDetailTitle(
    createSite({ siteName: "벳톡 토토사이트 정보 토토사이트 정보" }),
  );

  assert.equal(
    title,
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
  assert.equal(countOccurrences(title, "토토사이트 정보"), 1);
  assert.equal(title.includes("도메인 정보 | 토토사이트 정보"), false);
});

test("site detail H1 uses descriptive site report wording", () => {
  const site = createSite();
  const heading = buildSiteDetailHeading(site);

  assert.equal(heading.endsWith(site.siteName), false);
  assert.equal(heading.includes(site.siteName), true);
  assert.equal(heading.includes(`${site.siteName} 토토사이트`), false);
  assert.match(heading, /도메인 현황|먹튀 제보|후기/);
  assert.equal(heading.length >= 8, true);
});

test("site detail H1 and description keep reviews conditional", () => {
  const site = createSite({
    siteName: "애니카지노 (anicasino)",
    siteNameKo: "애니카지노",
    siteUrl: "https://an-g1.com",
    domains: [
      "https://an-g1.com",
      "https://an-g2.com",
      "https://an-g3.com",
      "https://an-g4.com",
    ],
    scamReportCount: 1,
    reviewCount: 0,
  });
  const title = buildSiteDetailTitle(site);
  const heading = buildSiteDetailHeading(site);
  const description = buildSiteDetailMetaDescription(site);

  assert.equal(
    title,
    "애니카지노 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
  assert.equal(
    heading,
    "애니카지노 (anicasino) 먹튀 제보·도메인 현황",
  );
  assert.equal(
    description,
    "애니카지노(anicasino)의 먹튀 제보 1건과 대표 도메인 an-g1.com, 추가 도메인 3개를 정리했습니다. 제보 내용은 참고 자료이며 사이트 전체 상태를 단정하지 않습니다.",
  );
  assert.equal(description.length >= 80 && description.length <= 120, true);
  assert.equal(title.includes("후기"), true);
  assert.equal(heading.includes("후기"), false);
  assert.equal(description.includes("후기"), false);
  assert.equal(description.includes("먹튀 확정"), false);

  assert.equal(
    buildSiteDetailTitle(createSite({ scamReportCount: 1, reviewCount: 1 })),
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
});

test("site detail H1 uses report review and domain data axes", () => {
  const heading = buildSiteDetailHeading(
    createSite({
      siteName: "유튜벳 (YOUTOOBET)",
      reviewCount: 3,
      scamReportCount: 1,
    }),
  );

  assert.equal(
    heading,
    "유튜벳 (YOUTOOBET) 먹튀 제보·후기·도메인 현황",
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
  assert.equal(heading.includes("도메인 현황"), true);
});

test("twitter title is generated from the site detail title", () => {
  const metadata = buildSiteDetailMetadata(createSite(), "bettok");
  const twitter = metadata.twitter as { title?: string };

  assert.equal(
    twitter.title,
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
});

test("site detail title reflects approved reports reviews and domains", () => {
  assert.equal(
    buildSiteDetailTitle(createSite({ scamReportCount: 2, reviewCount: 1 })),
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
  assert.equal(
    buildSiteDetailTitle(createSite({ reviewCount: 3 })),
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
  assert.equal(
    buildSiteDetailTitle(
      createSite({
        siteUrl: "https://bettok.example",
        domains: ["https://bettok.example", "https://bettok.kr"],
      }),
    ),
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
  );
  assert.equal(
    buildSiteDetailTitle(createSite(), {
      observationSnapshot: {
        observed_betting_features: Array.from({ length: 55 }, (_, index) =>
          `관측 항목 ${index}`,
        ),
      },
    }),
    "벳톡 먹튀 제보·후기·도메인 현황 | 토토사이트 정보",
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
    images?: Array<{
      url: string;
      width?: number;
      height?: number;
      type?: string;
    }>;
  };
  const twitter = metadata.twitter as {
    images?: Array<{ url: string }>;
  };

  assert.equal(openGraph.images?.[0]?.url, screenshotUrl);
  assert.equal(openGraph.images?.[0]?.width, undefined);
  assert.equal(openGraph.images?.[0]?.height, undefined);
  assert.equal(openGraph.images?.[0]?.type, undefined);
  assert.equal(twitter.images?.[0]?.url, screenshotUrl);
});

test("site detail social image prefers stored screenshot over thumbnail", () => {
  const screenshotUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/captures/main.webp";
  const screenshotThumbUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/captures/thumb.webp";
  const image = getSiteDetailSocialImage(
    createSite({ screenshotUrl, screenshotThumbUrl }),
  );

  assert.equal(image, screenshotUrl);
});

test("site detail social image falls back to stored screenshot thumbnail", () => {
  const screenshotThumbUrl =
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/capture-thumbs/thumb.webp";
  const image = getSiteDetailSocialImage(
    createSite({ screenshotUrl: null, screenshotThumbUrl }),
  );

  assert.equal(image, screenshotThumbUrl);
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
  assert.equal(image.endsWith("/og/totosite-report-site.webp"), true);
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
  assert.equal(image.endsWith("/og/totosite-report-site.webp"), true);
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
