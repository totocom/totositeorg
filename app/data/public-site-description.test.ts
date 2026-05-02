import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSiteObservationSnapshotViewModel,
  type PublicSiteObservationSnapshot,
} from "./public-site-observation-snapshot";
import {
  getSafeMarkdownBlocks,
  getSiteOverviewMarkdownBlocks,
  normalizePublicSiteDescription,
  normalizePublicSiteDomains,
} from "./public-site-description";
import {
  calculateSiteTrustScore,
  getApprovedScamReportStatusCopy,
  scamReportScoreLabel,
} from "./sites";
import { siteDescription, siteName } from "../../lib/config";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

test("site detail copy does not render 먹튀 없음 for empty approved reports", () => {
  const copy = getApprovedScamReportStatusCopy(0);
  const score = calculateSiteTrustScore({
    averageRating: 0,
    reviewCount: 0,
    scamReportCount: 0,
  });
  const publicText = [
    copy.primary,
    copy.secondary,
    score.summary,
    scamReportScoreLabel,
  ].join(" ");

  assert.equal(publicText.includes("먹튀 없음"), false);
  assert.equal(publicText.includes("승인된 먹튀 피해 제보 0건"), true);
  assert.equal(publicText.includes("피해 제보 현황 점수"), true);
});

test("site title header footer copy does not expose 토토사이트 추천", () => {
  const headerSource = readFileSync("app/components/header.tsx", "utf8");
  const footerSource = readFileSync("app/components/footer.tsx", "utf8");
  const layoutSource = readFileSync("app/layout.tsx", "utf8");

  assert.equal(siteName.includes("토토사이트 추천"), false);
  assert.equal(siteDescription.includes("토토사이트 추천"), false);
  assert.equal(headerSource.includes("토토사이트 추천"), false);
  assert.equal(footerSource.includes("토토사이트 추천"), false);
  assert.equal(layoutSource.includes("토토사이트 추천"), false);
});

test("normalizePublicSiteDescription replaces 본 초안은 with 이 설명은", () => {
  const description = normalizePublicSiteDescription(
    "본 초안은 조회 시점 기준 공개 HTML에서 관측된 정보를 요약합니다.",
  );

  assert.equal(description.includes("본 초안은"), false);
  assert.equal(description.includes("초안"), false);
  assert.equal(description.startsWith("이 설명은"), true);
});

test("safe markdown parser renders markdown without raw markers", () => {
  const blocks = getSafeMarkdownBlocks(
    "이 설명은 **중요 관측값**과 `해시`를 요약합니다.\n\n- 첫 번째 항목",
  );

  assert.equal(blocks[0]?.type, "paragraph");
  if (blocks[0]?.type !== "paragraph") throw new Error("expected paragraph");
  assert.equal(
    blocks[0].inlines.some((inline) => inline.type === "strong"),
    true,
  );
  assert.equal(blocks[1]?.type, "list");
  const plainText = blocks
    .flatMap((block) =>
      block.type === "list" ? block.items.map((item) => item.text) : [block.text],
    )
    .join(" ");

  assert.equal(plainText.includes("**"), false);
});

test("safe markdown parser strips raw HTML script and iframe", () => {
  const blocks = getSafeMarkdownBlocks(
    "이 설명은 공개 관측값입니다.<script>alert(1)</script><iframe src='x'></iframe><b>태그</b>",
  );
  const renderedText = JSON.stringify(blocks);

  assert.equal(renderedText.includes("<script"), false);
  assert.equal(renderedText.includes("iframe"), false);
  assert.equal(renderedText.includes("alert(1)"), false);
  assert.equal(renderedText.includes("태그"), true);
});

test("normalizePublicSiteDomains splits concatenated domain URLs", () => {
  const domains = normalizePublicSiteDomains([
    "https://www.벳톡주소.com/https://www.bet-tok.kr/",
  ]);

  assert.deepEqual(domains, [
    "https://www.벳톡주소.com/",
    "https://www.bet-tok.kr/",
  ]);
});

test("site overview omits menu list while observation section keeps menus", () => {
  const description = [
    "이 설명은 조회 시점 기준 공개 HTML에서 관측된 정보를 요약합니다.",
    "",
    "- 주요 메뉴: 홈, 스포츠, 카지노, 고객센터",
    "- 계정 관련 요소: 로그인, 회원센터",
    "",
    "화면 상단에는 서비스 식별에 필요한 제목과 계정 영역이 있고, 하단에는 저작권 안내가 관측됩니다.",
  ].join("\n");
  const overviewBlocks = getSiteOverviewMarkdownBlocks(description);
  const overviewText = JSON.stringify(overviewBlocks);
  const snapshot: PublicSiteObservationSnapshot = {
    id: "snapshot-1",
    site_id: "site-1",
    source_type: "manual_html",
    html_input_type: "source_html",
    source_url: "https://example.com",
    final_url: "https://example.com",
    domain: "example.com",
    page_title: "테스트 페이지",
    meta_description: null,
    h1: "테스트 메인",
    observed_menu_labels: ["홈", "스포츠", "카지노", "고객센터"],
    observed_account_features: ["로그인"],
    observed_betting_features: ["스포츠"],
    observed_payment_flags: [],
    observed_notice_items: [],
    observed_event_items: [],
    observed_footer_text: ["Copyright 2026"],
    observed_badges: [],
    screenshot_url: null,
    screenshot_thumb_url: null,
    favicon_url: null,
    logo_url: null,
    ai_detail_description_md: null,
    ai_observation_summary_json: {},
    collected_at: "2026-05-02T00:00:00.000Z",
    created_at: "2026-05-02T00:00:00.000Z",
    updated_at: "2026-05-02T00:00:00.000Z",
  };
  const observationModel = buildSiteObservationSnapshotViewModel({
    snapshot,
    assets: {
      siteName: "테스트 사이트",
      screenshotUrl: null,
      screenshotThumbUrl: null,
      faviconUrl: null,
      logoUrl: null,
    },
  });

  assert.equal(overviewText.includes("주요 메뉴"), false);
  assert.equal(overviewText.includes("스포츠, 카지노, 고객센터"), false);
  assert.equal(observationModel.hasSnapshot, true);
  if (!observationModel.hasSnapshot) throw new Error("expected observation");
  assert.deepEqual(observationModel.menuLabels, ["홈", "스포츠", "카지노", "고객센터"]);
});
