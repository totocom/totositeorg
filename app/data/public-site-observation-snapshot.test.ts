import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSiteObservationSnapshotViewModel,
  getSiteObservationPublicTextSegments,
  type PublicSiteObservationSnapshot,
} from "./public-site-observation-snapshot";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

const baseSnapshot: PublicSiteObservationSnapshot = {
  id: "snapshot-1",
  site_id: "site-1",
  source_type: "manual_html",
  html_input_type: "source_html",
  source_url: "https://example.com",
  final_url: "https://example.com",
  domain: "example.com",
  page_title: "테스트 사이트 공개 화면",
  meta_description: "공개 화면 관측 설명",
  h1: "테스트 사이트 메인",
  observed_menu_labels: ["홈", "스포츠", "보너스 이벤트"],
  observed_account_features: ["로그인", "회원센터", "가입하기"],
  observed_betting_features: ["스포츠북", "카지노", "추천 경기"],
  observed_payment_flags: ["입금 안내", "환전"],
  observed_notice_items: ["공지사항"],
  observed_event_items: ["첫충 이벤트"],
  observed_footer_text: ["Copyright 2026 Test Site. All rights reserved."],
  observed_badges: ["SSL", "LIVE"],
  screenshot_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot.webp",
  screenshot_thumb_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot-thumb.webp",
  favicon_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot-favicon.webp",
  logo_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot-logo.webp",
  ai_detail_description_md: null,
  ai_observation_summary_json: {},
  collected_at: "2026-05-02T03:00:00.000Z",
  created_at: "2026-05-02T03:00:00.000Z",
  updated_at: "2026-05-02T03:00:00.000Z",
};

const baseAssets = {
  siteName: "테스트 사이트",
  screenshotUrl:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/site.webp",
  screenshotThumbUrl:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/site-thumb.webp",
  faviconUrl:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/site-favicon.webp",
  logoUrl:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/site-logo.webp",
};

test("buildSiteObservationSnapshotViewModel returns visible model for a snapshot", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: baseSnapshot,
    assets: baseAssets,
  });

  assert.equal(model.hasSnapshot, true);
  if (!model.hasSnapshot) throw new Error("expected snapshot model");

  assert.equal(model.sourceTypeLabel, "관리자 제공 HTML 기준");
  assert.equal(model.pageTitle, "테스트 사이트 공개 화면");
  assert.equal(model.h1, "테스트 사이트 메인");
  assert.equal(model.menuLabels.includes("스포츠"), true);
  assert.equal(model.accountFeatures.includes("회원센터"), true);
  assert.equal(model.bettingFeatures.includes("스포츠북"), true);
  assert.equal(model.paymentPhraseObserved, true);
  assert.equal(model.noticeOrEventObserved, true);
});

test("buildSiteObservationSnapshotViewModel returns empty state without snapshot", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: null,
    assets: baseAssets,
  });

  assert.equal(model.hasSnapshot, false);
  assert.equal(
    model.emptyMessage,
    "아직 원본 사이트 관측 정보가 등록되지 않았습니다.",
  );
});

test("public observation text does not expose direct promotional phrases", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: baseSnapshot,
    assets: baseAssets,
  });
  const publicText = getSiteObservationPublicTextSegments(model).join(" ");

  assert.equal(publicText.includes("보너스 이벤트"), false);
  assert.equal(publicText.includes("가입하기"), false);
  assert.equal(publicText.includes("추천 경기"), false);
  assert.equal(publicText.includes("첫충 이벤트"), false);
  assert.equal(publicText.includes("입금 안내"), false);
});

test("site screenshot takes priority over snapshot screenshot", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: baseSnapshot,
    assets: baseAssets,
  });

  assert.equal(model.hasSnapshot, true);
  if (!model.hasSnapshot) throw new Error("expected snapshot model");

  assert.equal(model.screenshotSource, "site");
  assert.equal(model.screenshotUrl, baseAssets.screenshotThumbUrl);
  assert.equal(model.screenshotFullUrl, baseAssets.screenshotUrl);
});

test("HTML image candidates are ignored for public screenshot rendering", () => {
  const snapshotWithCandidates = {
    ...baseSnapshot,
    screenshot_url: null,
    screenshot_thumb_url: null,
    image_candidates_json: {
      og_images: ["https://external.example/og.png"],
      twitter_images: ["https://external.example/twitter.png"],
      favicon_candidates: ["https://external.example/favicon.ico"],
      logo_candidates: ["https://external.example/logo.png"],
      image_alts: ["외부 이미지"],
    },
  } as PublicSiteObservationSnapshot & {
    image_candidates_json: unknown;
  };

  const model = buildSiteObservationSnapshotViewModel({
    snapshot: snapshotWithCandidates,
    assets: {
      siteName: "테스트 사이트",
      screenshotUrl: null,
      screenshotThumbUrl: null,
      faviconUrl: null,
      logoUrl: null,
    },
  });

  assert.equal(model.hasSnapshot, true);
  if (!model.hasSnapshot) throw new Error("expected snapshot model");

  assert.equal(model.screenshotUrl, null);
  assert.equal(model.screenshotFullUrl, null);
  assert.equal(model.iconUrl, null);
});

test("external stored image fields are ignored for public rendering", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: {
      ...baseSnapshot,
      screenshot_url: "https://external.example/snapshot.webp",
      screenshot_thumb_url: "https://external.example/snapshot-thumb.webp",
      favicon_url: "https://external.example/favicon.webp",
      logo_url: "https://external.example/logo.webp",
    },
    assets: {
      siteName: "테스트 사이트",
      screenshotUrl: "https://external.example/site.webp",
      screenshotThumbUrl: "https://external.example/site-thumb.webp",
      faviconUrl: "https://external.example/site-favicon.webp",
      logoUrl: "https://external.example/site-logo.webp",
    },
  });

  assert.equal(model.hasSnapshot, true);
  if (!model.hasSnapshot) throw new Error("expected snapshot model");

  assert.equal(model.screenshotUrl, null);
  assert.equal(model.screenshotFullUrl, null);
  assert.equal(model.iconUrl, null);
});

test("raw HTML snippets are normalized instead of rendered", () => {
  const model = buildSiteObservationSnapshotViewModel({
    snapshot: {
      ...baseSnapshot,
      observed_footer_text: [
        "<footer><strong>Copyright 2026</strong><script>alert(1)</script></footer>",
      ],
    },
    assets: baseAssets,
  });

  assert.equal(model.hasSnapshot, true);
  if (!model.hasSnapshot) throw new Error("expected snapshot model");

  assert.deepEqual(model.footerText, ["Copyright 2026"]);
  assert.equal(getSiteObservationPublicTextSegments(model).join(" ").includes("<"), false);
});
