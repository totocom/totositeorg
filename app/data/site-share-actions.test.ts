import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSiteDetailShareDescription,
  buildSiteDetailShareTitle,
} from "./site-detail-metadata";
import type { ReviewTarget } from "./sites";

const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
const shareActionsSource = readFileSync(
  "app/components/site-share-actions.tsx",
  "utf8",
);

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
    shortDescription: "",
    averageRating: 0,
    reviewCount: 0,
    scamReportCount: 0,
    ...overrides,
  };
}

test("site detail page renders the social share actions", () => {
  assert.match(siteDetailPageSource, /import\s+\{\s*SiteShareActions\s*\}/);
  assert.match(siteDetailPageSource, /<SiteShareActions[\s\S]*siteName=\{site\.siteName\}[\s\S]*title=\{shareTitle\}[\s\S]*description=\{shareDescription\}/);
});

test("site share actions provide copy and social share buttons", () => {
  assert.match(shareActionsSource, /navigator\.clipboard\.writeText\(shareUrl\)/);
  assert.match(shareActionsSource, /링크 복사/);
  assert.match(shareActionsSource, /Kakao/);
  assert.match(shareActionsSource, /twitter\.com\/intent\/tweet/);
  assert.match(shareActionsSource, /facebook\.com\/sharer\/sharer\.php/);
  assert.match(shareActionsSource, /share\.naver\.com\/web\/shareView/);
});

test("site share title and description are site specific", () => {
  const site = createSite();

  assert.equal(
    buildSiteDetailShareTitle(site),
    "벳톡 주소·기본 정보",
  );
  assert.equal(
    buildSiteDetailShareDescription(site),
    "벳톡의 대표 도메인 bettok.example과 현재 공개된 기본 정보를 정리했습니다. 승인 후기와 피해 제보가 부족해 일부 항목은 확인되지 않았습니다.",
  );
});

test("site share copy avoids recommendation signup and benefit prompts", () => {
  const combinedSource = `${shareActionsSource}\n${siteDetailPageSource}`;
  const forbiddenPhrases = [
    "추천하세요",
    "친구에게 가입을 권유하세요",
    "바로 공유하고 혜택을 받으세요",
  ];

  assert.match(
    shareActionsSource,
    /이 정보가 필요하다면 링크를 복사해 공유할 수 있습니다\./,
  );
  assert.equal(
    forbiddenPhrases.some((phrase) => combinedSource.includes(phrase)),
    false,
  );
});
