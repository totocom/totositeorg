import assert from "node:assert/strict";
import test from "node:test";
import {
  createManualHtmlSnapshot,
  manualHtmlSnapshotMaxHtmlLength,
  type ManualHtmlSnapshotInsert,
  type ManualHtmlSnapshotSite,
} from "./manual-html-snapshot";
import { toBlogSourceCrawlSnapshot } from "./blog-source-crawl-snapshot";
import {
  buildSiteObservationSnapshotViewModel,
  type PublicSiteObservationSnapshot,
} from "./public-site-observation-snapshot";
import {
  approveObservationDescription,
  generateObservationDescription,
  type ApproveObservationDescriptionSiteUpdate,
  type ApproveObservationDescriptionSnapshotUpdate,
  type ObservationDescriptionSite,
  type ObservationDescriptionSnapshot,
  type ObservationDescriptionSnapshotUpdate,
} from "./site-observation-description";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

const site: ManualHtmlSnapshotSite = {
  id: "site-1",
  url: "https://example.com",
  domains: ["https://mirror.example.net"],
};

const storageConfig = {
  supabaseUrl: "https://project.supabase.co",
  publicBucket: "site-screenshots",
};

const storedScreenshotUrl =
  "https://project.supabase.co/storage/v1/object/public/site-screenshots/manual/screen.webp";
const storedThumbUrl =
  "https://project.supabase.co/storage/v1/object/public/site-screenshots/manual-thumbs/screen.webp";

const sampleHtml = `
<!doctype html>
<html lang="ko">
  <head>
    <title>수동 관측 테스트</title>
    <meta name="description" content="수동 HTML 관측 설명">
    <meta property="og:image" content="/images/og.png">
    <meta name="twitter:image" content="https://cdn.example.com/twitter.png">
    <link rel="icon" href="/favicon.ico">
  </head>
  <body>
    <nav>
      <a href="/">홈</a>
      <a href="/sports">스포츠</a>
      <button>로그인</button>
    </nav>
    <main>
      <h1>수동 관측 메인</h1>
      <p>가입 입금 이벤트 보너스 문구가 표시됩니다.</p>
      <p>스포츠북 경기 배당과 카지노 게임 메뉴가 표시됩니다.</p>
      <img src="/assets/logo.png" alt="수동 관측 로고">
    </main>
    <footer>Copyright 2026 Manual Test. All rights reserved.</footer>
  </body>
</html>
`;

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    source_url: "https://example.com/path",
    final_url: "https://example.com/path?loaded=1",
    html_input_type: "source_html",
    html: sampleHtml,
    collected_at: "2026-05-02T00:00:00.000Z",
    screenshot_url: storedScreenshotUrl,
    screenshot_thumb_url: storedThumbUrl,
    ...overrides,
  };
}

async function runSnapshot(
  body: Record<string, unknown> = baseBody(),
  options: {
    admin?: boolean;
    site?: ManualHtmlSnapshotSite | null;
  } = {},
) {
  const calls: {
    getSiteCalled: boolean;
    insertPayload: ManualHtmlSnapshotInsert | null;
    updateValues: {
      latest_crawl_snapshot_id: string;
      content_crawled_at: string;
    } | null;
  } = {
    getSiteCalled: false,
    insertPayload: null,
    updateValues: null,
  };
  const result = await createManualHtmlSnapshot({
    adminSession:
      options.admin === false
        ? null
        : { userId: "admin-1", email: "admin@example.com" },
    siteId: "site-1",
    body,
    storageConfig,
    getSite: async () => {
      calls.getSiteCalled = true;
      return { site: options.site === undefined ? site : options.site };
    },
    insertSnapshot: async (snapshot) => {
      calls.insertPayload = snapshot;
      return { snapshotId: "snapshot-1" };
    },
    updateSiteSnapshot: async (_siteId, values) => {
      calls.updateValues = values;
      return {};
    },
  });

  return { result, calls };
}

test("createManualHtmlSnapshot rejects non-admin callers", async () => {
  const { result, calls } = await runSnapshot(baseBody(), { admin: false });

  assert.equal(result.status, 403);
  assert.equal(calls.getSiteCalled, false);
  assert.equal(calls.insertPayload, null);
});

test("createManualHtmlSnapshot stores parsed HTML observation fields", async () => {
  const { result, calls } = await runSnapshot();

  assert.equal(result.status, 200);
  assert.equal(result.body.snapshotId, "snapshot-1");
  assert.equal(calls.insertPayload?.page_title, "수동 관측 테스트");
  assert.equal(calls.insertPayload?.meta_description, "수동 HTML 관측 설명");
  assert.equal(calls.insertPayload?.h1, "수동 관측 메인");
  assert.equal(calls.insertPayload?.observed_menu_labels.includes("스포츠"), true);
  assert.match(calls.insertPayload?.html_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.match(calls.insertPayload?.visible_text_sha256 ?? "", /^[a-f0-9]{64}$/);
});

test("createManualHtmlSnapshot stores promotional flags", async () => {
  const { calls } = await runSnapshot();
  const flags = calls.insertPayload?.promotional_flags_json as
    | { has_promotional_terms?: boolean; found_terms?: Array<{ term: string }> }
    | undefined;
  const terms = flags?.found_terms?.map((flag) => flag.term) ?? [];

  assert.equal(flags?.has_promotional_terms, true);
  assert.equal(terms.includes("가입"), true);
  assert.equal(terms.includes("입금"), true);
  assert.equal(terms.includes("이벤트"), true);
  assert.equal(terms.includes("보너스"), true);
});

test("createManualHtmlSnapshot stores image candidates", async () => {
  const { calls } = await runSnapshot();
  const imageCandidates = calls.insertPayload?.image_candidates_json as
    | {
        og_images?: string[];
        twitter_images?: string[];
        favicon_candidates?: string[];
        logo_candidates?: string[];
        image_alts?: string[];
      }
    | undefined;

  assert.deepEqual(imageCandidates?.og_images, [
    "https://example.com/images/og.png",
  ]);
  assert.deepEqual(imageCandidates?.twitter_images, [
    "https://cdn.example.com/twitter.png",
  ]);
  assert.deepEqual(imageCandidates?.favicon_candidates, [
    "https://example.com/favicon.ico",
  ]);
  assert.deepEqual(imageCandidates?.logo_candidates, [
    "https://example.com/assets/logo.png",
  ]);
  assert.equal(imageCandidates?.image_alts?.includes("수동 관측 로고"), true);
});

test("createManualHtmlSnapshot stores source_type as manual_html", async () => {
  const { calls } = await runSnapshot();

  assert.equal(calls.insertPayload?.source_type, "manual_html");
  assert.equal(calls.insertPayload?.snapshot_status, "extracted");
  assert.equal(calls.insertPayload?.html_input_type, "source_html");
});

test("createManualHtmlSnapshot works without automatic crawl output", async () => {
  const { result, calls } = await runSnapshot(
    baseBody({
      screenshot_url: "",
      screenshot_thumb_url: "",
    }),
  );

  assert.equal(result.status, 200);
  assert.equal(calls.insertPayload?.source_type, "manual_html");
  assert.equal(calls.insertPayload?.screenshot_url, null);
  assert.equal(calls.insertPayload?.screenshot_thumb_url, null);
});

test("createManualHtmlSnapshot updates latest crawl snapshot on the site", async () => {
  const { calls } = await runSnapshot();

  assert.deepEqual(calls.updateValues, {
    latest_crawl_snapshot_id: "snapshot-1",
    content_crawled_at: "2026-05-02T00:00:00.000Z",
  });
});

test("createManualHtmlSnapshot does not store external screenshot URLs", async () => {
  const { calls } = await runSnapshot(
    baseBody({
      screenshot_url: "https://external-toto.example/screen.png",
      screenshot_thumb_url:
        "https://external-toto.example/screen-thumb.png",
      favicon_url: "https://external-toto.example/favicon.ico",
      logo_url: "https://external-toto.example/logo.png",
    }),
  );

  assert.equal(calls.insertPayload?.screenshot_url, null);
  assert.equal(calls.insertPayload?.screenshot_thumb_url, null);
  assert.equal(calls.insertPayload?.favicon_url, null);
  assert.equal(calls.insertPayload?.logo_url, null);
});

test("createManualHtmlSnapshot rejects oversized HTML", async () => {
  const { result, calls } = await runSnapshot(
    baseBody({
      html: "x".repeat(manualHtmlSnapshotMaxHtmlLength + 1),
    }),
  );

  assert.equal(result.status, 413);
  assert.equal(calls.getSiteCalled, false);
  assert.equal(calls.insertPayload, null);
});

test("manual HTML fixture smoke covers extraction generation approval public view and blog source snapshot", async () => {
  const { result, calls } = await runSnapshot();
  const inserted = calls.insertPayload;

  assert.equal(result.status, 200);
  assert.ok(inserted);

  const existingDescription =
    "기존 설명입니다. 관리자가 입력한 설명이며 자동 생성 설명과 구분됩니다.";
  let currentDescription = existingDescription;
  const descriptionSite: ObservationDescriptionSite = {
    id: "site-1",
    name: "수동 관측 테스트",
    url: site.url,
    description: currentDescription,
    slug: "manual-observation-test",
  };
  const descriptionSnapshot: ObservationDescriptionSnapshot = {
    id: "snapshot-1",
    site_id: inserted.site_id,
    source_url: inserted.source_url,
    final_url: inserted.final_url,
    collected_at: inserted.collected_at,
    page_title: inserted.page_title,
    meta_description: inserted.meta_description,
    h1: inserted.h1,
    observed_menu_labels: inserted.observed_menu_labels,
    observed_account_features: inserted.observed_account_features,
    observed_betting_features: inserted.observed_betting_features,
    observed_payment_flags: inserted.observed_payment_flags,
    observed_notice_items: inserted.observed_notice_items,
    observed_event_items: inserted.observed_event_items,
    observed_footer_text: inserted.observed_footer_text,
    observed_badges: inserted.observed_badges,
    image_candidates_json: inserted.image_candidates_json,
    promotional_flags_json: inserted.promotional_flags_json,
    excluded_terms_json: inserted.excluded_terms_json,
    html_sha256: inserted.html_sha256,
    visible_text_sha256: inserted.visible_text_sha256,
    snapshot_status: inserted.snapshot_status,
    ai_observation_summary_json: inserted.ai_observation_summary_json,
  };
  const generatedDescription = [
    "수동 관측 테스트 사이트는 공개 화면에서 \"수동 관측 메인\"이라는 이름을 사용하는 사이트입니다. 주요 화면은 스포츠, 카지노, 슬롯 등 게임 카테고리를 중심으로 구성되어 있으며, 로그인과 고객센터처럼 계정·문의 관련 메뉴도 함께 배치되어 있습니다.",
    "본문에는 여러 영역으로 이동하는 카드형 안내와 화면 전환 요소가 함께 배치되어 있습니다. 일부 화면에는 결제나 이용 내역 관련 요소가 포함되어 있지만, 제공된 HTML과 스크린샷만으로 실제 결제 방식이나 이용 조건까지 확인할 수는 없습니다.",
    "하단에는 고객지원, 공지, 외부 연락 채널, 책임 있는 이용 관련 안내가 포함되어 있습니다. 자세한 메뉴와 화면 구성은 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있습니다.",
  ].join("\n\n");
  const generatedUpdates: ObservationDescriptionSnapshotUpdate[] = [];

  const generated = await generateObservationDescription({
    adminSession: { userId: "admin-1", email: "admin@example.com" },
    siteId: "site-1",
    body: { snapshot_id: "snapshot-1" },
    getSite: async () => ({ site: descriptionSite }),
    getSnapshot: async () => ({ snapshot: descriptionSnapshot }),
    generateDescription: async ({ fallback }) => ({
      output: {
        detail_description_md: generatedDescription,
        observation_summary: fallback.observation_summary,
        admin_warnings: [],
        prohibited_phrase_check: {
          contains_signup_cta: false,
          contains_bonus_or_event_promo: false,
          contains_recommendation: false,
          contains_absolute_safety_claim: false,
          contains_access_facilitation: false,
        },
      },
      provider: "openai",
      model: "mock-model",
      promptVersion: "mock-prompt",
    }),
    updateSnapshot: async (_snapshotId, values) => {
      generatedUpdates.push(values);
      return {};
    },
  });
  const generatedUpdate = generatedUpdates[0];

  assert.equal(generated.status, 200);
  assert.ok(generatedUpdate);
  assert.equal(currentDescription, existingDescription);
  assert.equal(generatedUpdate.snapshot_status, "ai_generated");

  const siteUpdates: ApproveObservationDescriptionSiteUpdate[] = [];
  const snapshotUpdates: ApproveObservationDescriptionSnapshotUpdate[] = [];
  const approved = await approveObservationDescription({
    adminSession: { userId: "admin-1", email: "admin@example.com" },
    siteId: "site-1",
    body: {
      snapshot_id: "snapshot-1",
      final_description_md: generatedDescription,
    },
    getSite: async () => ({
      site: {
        ...descriptionSite,
        description: currentDescription,
      },
    }),
    getSnapshot: async () => ({
      snapshot: {
        ...descriptionSnapshot,
        ai_observation_summary_json:
          generatedUpdate.ai_observation_summary_json,
        snapshot_status: generatedUpdate.snapshot_status,
      },
    }),
    updateSiteDescription: async (_siteId, values) => {
      siteUpdates.push(values);
      currentDescription = values.description;
      return {};
    },
    approveSnapshot: async (_snapshotId, values) => {
      snapshotUpdates.push(values);
      return {};
    },
  });
  const siteUpdate = siteUpdates[0];
  const snapshotUpdate = snapshotUpdates[0];

  assert.equal(approved.status, 200);
  assert.ok(siteUpdate);
  assert.ok(snapshotUpdate);
  assert.equal(siteUpdate.description, generatedDescription);
  assert.equal(currentDescription, generatedDescription);
  assert.equal(siteUpdate.description_source_snapshot_id, "snapshot-1");
  assert.equal(snapshotUpdate.snapshot_status, "approved");

  const publicSnapshot: PublicSiteObservationSnapshot = {
    id: "snapshot-1",
    site_id: inserted.site_id,
    source_type: inserted.source_type,
    html_input_type: inserted.html_input_type,
    source_url: inserted.source_url,
    final_url: inserted.final_url,
    domain: inserted.domain,
    page_title: inserted.page_title,
    meta_description: inserted.meta_description,
    h1: inserted.h1,
    observed_menu_labels: inserted.observed_menu_labels,
    observed_account_features: inserted.observed_account_features,
    observed_betting_features: inserted.observed_betting_features,
    observed_payment_flags: inserted.observed_payment_flags,
    observed_notice_items: inserted.observed_notice_items,
    observed_event_items: inserted.observed_event_items,
    observed_footer_text: inserted.observed_footer_text,
    observed_badges: inserted.observed_badges,
    screenshot_url: inserted.screenshot_url,
    screenshot_thumb_url: inserted.screenshot_thumb_url,
    favicon_url: inserted.favicon_url,
    logo_url: inserted.logo_url,
    ai_detail_description_md: generatedDescription,
    ai_observation_summary_json: snapshotUpdate.ai_observation_summary_json,
    collected_at: inserted.collected_at,
    created_at: inserted.collected_at,
    updated_at: inserted.collected_at,
  };
  const publicModel = buildSiteObservationSnapshotViewModel({
    snapshot: publicSnapshot,
    assets: {
      siteName: "수동 관측 테스트",
      screenshotUrl: inserted.screenshot_url,
      screenshotThumbUrl: inserted.screenshot_thumb_url,
      faviconUrl: inserted.favicon_url,
      logoUrl: inserted.logo_url,
    },
  });

  assert.equal(publicModel.hasSnapshot, true);
  if (!publicModel.hasSnapshot) throw new Error("expected public model");
  assert.equal(publicModel.screenshotSource, "site");
  assert.equal(publicModel.screenshotUrl, storedThumbUrl);

  const blogSourceSnapshot = toBlogSourceCrawlSnapshot({
    id: "snapshot-1",
    site_id: inserted.site_id,
    source_type: inserted.source_type,
    collected_at: inserted.collected_at,
    page_title: inserted.page_title,
    meta_description: inserted.meta_description,
    h1: inserted.h1,
    observed_menu_labels: inserted.observed_menu_labels,
    observed_account_features: inserted.observed_account_features,
    observed_betting_features: inserted.observed_betting_features,
    observed_payment_flags: inserted.observed_payment_flags,
    observed_notice_items: inserted.observed_notice_items,
    observed_event_items: inserted.observed_event_items,
    observed_footer_text: inserted.observed_footer_text,
    observed_badges: inserted.observed_badges,
    promotional_flags_json: inserted.promotional_flags_json,
    excluded_terms_json: inserted.excluded_terms_json,
    screenshot_url: inserted.screenshot_url,
    screenshot_thumb_url: inserted.screenshot_thumb_url,
  });
  const serializedBlogSource = JSON.stringify(blogSourceSnapshot);

  assert.ok(blogSourceSnapshot);
  assert.equal(blogSourceSnapshot.snapshot_kind, "manual_html_snapshot");
  assert.equal(blogSourceSnapshot.screenshot_url, storedScreenshotUrl);
  assert.equal(blogSourceSnapshot.screenshot_thumb_url, storedThumbUrl);
  assert.equal(serializedBlogSource.includes("raw_html"), false);
  assert.equal(serializedBlogSource.includes("<html"), false);
});
