import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateSiteDetailIndexability,
  calculateSiteSummaryIndexability,
} from "./site-detail-indexability";
import { calculateSiteDetailSubpageIndexability } from "./site-detail-subpage-indexability";
import { isSitePageSplitEnabled } from "./site-page-split-flags";
import type { ReviewTarget } from "./sites";

const baseSite = {
  siteName: "테스트",
  siteUrl: "https://test.example",
  domains: ["https://test.example"],
  shortDescription: "기본 설명입니다.",
  reviewCount: 0,
  scamReportCount: 0,
  scamDamageAmount: 0,
  screenshotUrl: null,
  screenshotThumbUrl: null,
  dnsCheckedAt: null,
  oldestDomainCreationDate: null,
};

const subpageSite: ReviewTarget = {
  id: "site-1",
  slug: "site-1",
  siteName: "테스트",
  siteNameKo: "테스트",
  siteNameEn: null,
  siteUrl: "https://test.example",
  domains: ["https://test.example"],
  screenshotUrl: null,
  screenshotThumbUrl: null,
  faviconUrl: null,
  logoUrl: null,
  category: "기타 베팅",
  availableStates: ["KR"],
  licenseInfo: "관리자 등록 사이트",
  status: "운영 중",
  moderationStatus: "approved",
  shortDescription: "기본 설명입니다.",
  averageRating: 0,
  reviewCount: 0,
  scamReportCount: 0,
};

test("site detail indexability noindexes sparse pages", () => {
  const result = calculateSiteDetailIndexability({
    site: baseSite,
    reviewsCount: 0,
    scamReportsCount: 0,
    observationSnapshot: null,
    domainCreationDates: [],
    source: "supabase",
  });

  assert.equal(result.shouldIndex, false);
  assert.equal(result.robots, "noindex,follow");
  assert.equal(result.missing.includes("approved_reviews"), true);
  assert.equal(result.missing.includes("observation_snapshot"), true);
});

test("site detail indexability indexes approved reviews or reports", () => {
  assert.equal(
    calculateSiteDetailIndexability({
      site: { ...baseSite, reviewCount: 1 },
      reviewsCount: 1,
      source: "supabase",
    }).robots,
    "index,follow",
  );
  assert.equal(
    calculateSiteDetailIndexability({
      site: { ...baseSite, scamReportCount: 1 },
      scamReportsCount: 1,
      source: "supabase",
    }).robots,
    "index,follow",
  );
});

test("site detail indexability allows rich observed pages without reviews", () => {
  const result = calculateSiteDetailIndexability({
    site: {
      ...baseSite,
      domains: ["https://test.example", "https://test.kr"],
      shortDescription:
        "관측 데이터가 충분한 사이트 설명입니다. 화면 구성, 계정 요소, 공지성 영역, 도메인 정보가 구분되어 있으며 확인되지 않은 항목은 별도로 표시합니다. 이 문장은 고유 데이터가 있는 페이지의 설명 길이를 채우기 위한 테스트 문장입니다. 추가 설명은 반복 문구 없이 공개 정보 범위를 정리합니다. 대표 도메인과 추가 도메인, 관측 메뉴, 계정 영역, 공지성 요소를 함께 비교할 수 있어 기본 템플릿만 있는 페이지와 구분됩니다. 데이터가 부족한 항목은 추정하지 않고 확인 필요 상태로 남깁니다. 관측 snapshot에는 메뉴, 계정 기능, 콘텐츠 표시, 공지성 요소, 배지 정보가 나뉘어 저장되어 있으므로 리뷰나 피해 제보가 없는 경우에도 최소한의 고유 사실을 확인할 수 있습니다. 도메인 생성일과 화면 캡처가 함께 있으면 공개 정보의 갱신 흐름도 별도로 판단할 수 있습니다.",
      screenshotUrl: "https://project.supabase.co/storage/v1/object/public/site-screenshots/test.webp",
      oldestDomainCreationDate: "2026-01-01T00:00:00.000Z",
    },
    observationSnapshot: {
      observed_menu_labels: ["홈", "스포츠"],
      observed_account_features: ["로그인"],
      observed_betting_features: ["카지노"],
      observed_notice_items: ["공지"],
      observed_badges: ["LIVE"],
      collected_at: "2026-05-01T00:00:00.000Z",
    },
    domainCreationDates: [
      { domain: "test.example", creationDate: "2026-01-01T00:00:00.000Z" },
    ],
    source: "supabase",
  });

  assert.equal(result.uniqueFactScore >= 5, true);
  assert.equal(result.shouldIndex, true);
});

test("site detail indexability always noindexes fallback and missing sites", () => {
  assert.equal(
    calculateSiteSummaryIndexability(baseSite, { source: "fallback" }).robots,
    "noindex,follow",
  );
  assert.equal(
    calculateSiteDetailIndexability({ site: null, source: "none" }).robots,
    "noindex,follow",
  );
});

test("site detail split subpages index only pages with matching data", () => {
  assert.equal(
    calculateSiteDetailSubpageIndexability({
      site: subpageSite,
      kind: "main",
    }).robots,
    "index,follow",
  );
  assert.equal(
    calculateSiteDetailSubpageIndexability({
      site: subpageSite,
      kind: "domains",
    }).robots,
    "index,follow",
  );
  assert.equal(
    calculateSiteDetailSubpageIndexability({
      site: subpageSite,
      kind: "reviews",
      itemCount: 0,
    }).robots,
    "noindex,follow",
  );
  assert.equal(
    calculateSiteDetailSubpageIndexability({
      site: subpageSite,
      kind: "reviews",
      itemCount: 1,
    }).robots,
    "index,follow",
  );
  assert.equal(
    calculateSiteDetailSubpageIndexability({
      site: subpageSite,
      kind: "scam-reports",
      itemCount: 0,
    }).robots,
    "noindex,follow",
  );
});

test("site page split flag defaults to all sites and supports explicit slugs", () => {
  const originalValue = process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS;

  try {
    delete process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS;
    assert.equal(isSitePageSplitEnabled("youtoobet-morjcswx-p7k7"), true);
    assert.equal(isSitePageSplitEnabled("other-site"), true);

    process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS = "alpha, beta";
    assert.equal(isSitePageSplitEnabled("alpha"), true);
    assert.equal(isSitePageSplitEnabled("beta"), true);
    assert.equal(isSitePageSplitEnabled("youtoobet-morjcswx-p7k7"), false);

    process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS = "*";
    assert.equal(isSitePageSplitEnabled("any-site"), true);
  } finally {
    if (originalValue === undefined) {
      delete process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS;
    } else {
      process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS = originalValue;
    }
  }
});
