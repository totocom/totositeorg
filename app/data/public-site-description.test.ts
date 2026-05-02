import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSiteObservationSnapshotViewModel,
  type PublicSiteObservationSnapshot,
} from "./public-site-observation-snapshot";
import {
  formatObservationDescriptionForPublic,
  getSafeMarkdownBlocks,
  getSiteOverviewMarkdownBlocks,
  normalizePublicSiteDescription,
  normalizePublicSiteDomains,
} from "./public-site-description";
import { siteDescriptionNoticeText } from "./site-description-notice";
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
    "본 초안은 사이트 화면 구성을 자연스럽게 설명합니다.",
  );

  assert.equal(description.includes("본 초안은"), false);
  assert.equal(description.includes("초안"), false);
  assert.equal(description.startsWith("이 설명은"), true);
});

test("formatObservationDescriptionForPublic separates long notice from description", () => {
  const formatted = formatObservationDescriptionForPublic(
    [
      siteDescriptionNoticeText,
      "",
      "테스트 사이트는 공개 화면에서 테스트라는 이름을 사용하는 사이트입니다. 주요 화면은 게임 카테고리와 계정 관련 메뉴를 중심으로 구성되어 있습니다.",
      "",
      "본문에는 카드형 안내와 화면 전환 요소가 함께 배치되어 있습니다. 자세한 메뉴와 화면 구성은 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있습니다.",
    ].join("\n"),
  );

  assert.equal(formatted.description.includes(siteDescriptionNoticeText), false);
  assert.equal(formatted.description.includes("가입이나 이용을 권유"), false);
  assert.match(formatted.description, /테스트 사이트는/);
});

test("formatObservationDescriptionForPublic removes internal extraction sentences", () => {
  const formatted = formatObservationDescriptionForPublic(
    [
      "문서 제목은 \"최고의 무료 온라인 게임\"으로 표시되었습니다.",
      "메타 설명에는 내부 추출 문장이 있습니다.",
      "대표 제목 영역에는 H1 값이 있습니다.",
      "",
      "테스트 사이트는 공개 화면에서 테스트라는 이름을 사용하는 사이트입니다. 주요 화면은 계정 관련 메뉴와 고객지원 요소를 중심으로 구성되어 있습니다.",
    ].join("\n"),
  );

  assert.equal(formatted.description.includes("문서 제목은"), false);
  assert.equal(formatted.description.includes("메타 설명에는"), false);
  assert.equal(formatted.description.includes("대표 제목 영역에는"), false);
  assert.match(formatted.description, /테스트 사이트는/);
  assert.equal(
    formatted.warnings.some((warning) => warning.includes("내부 추출")),
    true,
  );
});

test("formatObservationDescriptionForPublic warns on report-like repetition URLs and lists", () => {
  const formatted = formatObservationDescriptionForPublic(
    [
      "공개 화면에서는 항목이 관측되었습니다. 공개 화면에서는 추가 항목이 관측되었습니다. 공개 화면에서는 다시 관측되었습니다.",
      "",
      "- https://example.com/path",
    ].join("\n"),
  );

  assert.equal(
    formatted.warnings.some((warning) => warning.includes("관측되었습니다")),
    true,
  );
  assert.equal(
    formatted.warnings.some((warning) => warning.includes("공개 화면")),
    true,
  );
  assert.equal(
    formatted.warnings.some((warning) => warning.includes("URL")),
    true,
  );
  assert.equal(
    formatted.warnings.some((warning) => warning.includes("bullet")),
    true,
  );
});

test("site description notice component is rendered above the overview description", () => {
  const pageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
  const noticeSource = readFileSync(
    "app/components/site-description-notice.tsx",
    "utf8",
  );

  assert.match(pageSource, /import\s+\{\s*SiteDescriptionNotice\s*\}/);
  assert.match(pageSource, /<SiteDescriptionNotice\s*\/>[\s\S]*<SafeMarkdown/);
  assert.match(noticeSource, /siteDescriptionNoticeText/);
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

test("site overview is limited to natural paragraphs and omits detail-only observation rows", () => {
  const description = [
    "첫 번째 문단입니다. 화면에 표시된 정보만 요약합니다.",
    "",
    "두 번째 문단입니다. 주소와 도메인은 별도 섹션에서 확인합니다.",
    "",
    "푸터/저작권: Copyright 2026 Example",
    "",
    "이미지 alt: 대표 화면",
    "",
    "세 번째 문단입니다. 이용 권유 없이 필요한 맥락만 남겼습니다.",
    "",
    "네 번째 문단입니다. 승인 제보와 후기 자료를 함께 확인하도록 구성되어 있습니다.",
    "",
    "다섯 번째 문단입니다. 개요에는 표시되지 않아야 합니다.",
  ].join("\n");
  const overviewBlocks = getSiteOverviewMarkdownBlocks(description);
  const overviewText = JSON.stringify(overviewBlocks);

  assert.equal(overviewBlocks.length, 3);
  assert.equal(overviewText.includes("푸터/저작권"), false);
  assert.equal(overviewText.includes("이미지 alt"), false);
  assert.equal(overviewText.includes("네 번째 문단"), false);
});
