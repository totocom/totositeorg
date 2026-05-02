import assert from "node:assert/strict";
import test from "node:test";
import {
  blogSourceCrawlSnapshotAiInstruction,
  getBlogSourceCrawlSnapshotJson,
  toBlogSourceCrawlSnapshot,
  type BlogSourceCrawlSnapshotRow,
} from "./blog-source-crawl-snapshot";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";

const crawlSnapshotRow: BlogSourceCrawlSnapshotRow = {
  id: "snapshot-1",
  site_id: "site-1",
  source_type: "manual_html",
  collected_at: "2026-05-02T03:00:00.000Z",
  page_title: "관측 페이지",
  meta_description: "관측 메타 설명",
  h1: "관측 H1",
  observed_menu_labels: ["홈", "스포츠"],
  observed_account_features: ["로그인"],
  observed_betting_features: ["스포츠북"],
  observed_payment_flags: ["입금", "환전"],
  observed_notice_items: ["공지"],
  observed_event_items: ["이벤트"],
  observed_footer_text: ["Copyright 2026"],
  observed_badges: ["SSL"],
  promotional_flags_json: {
    has_promotional_terms: true,
    found_terms: [{ term: "보너스", count: 1 }],
  },
  excluded_terms_json: ["가입", "보너스", "이벤트"],
  screenshot_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot.webp",
  screenshot_thumb_url:
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot-thumb.webp",
};

test("toBlogSourceCrawlSnapshot includes latest crawl snapshot fields for source snapshots", () => {
  const snapshot = toBlogSourceCrawlSnapshot(crawlSnapshotRow);

  assert.ok(snapshot);
  assert.equal(snapshot.id, "snapshot-1");
  assert.equal(snapshot.source_type, "manual_html");
  assert.equal(snapshot.snapshot_kind, "manual_html_snapshot");
  assert.equal(snapshot.collected_at, "2026-05-02T03:00:00.000Z");
  assert.deepEqual(snapshot.observed_menu_labels, ["홈", "스포츠"]);
  assert.deepEqual(snapshot.observed_payment_flags, ["입금", "환전"]);
  assert.deepEqual(snapshot.promotional_flags_json, {
    has_promotional_terms: true,
    found_terms: [{ term: "보너스", count: 1 }],
  });
  assert.deepEqual(snapshot.excluded_terms_json, ["가입", "보너스", "이벤트"]);
  assert.equal(
    snapshot.screenshot_thumb_url,
    "https://project.supabase.co/storage/v1/object/public/site-screenshots/snapshot-thumb.webp",
  );
  assert.equal(snapshot.ai_usage_instruction, blogSourceCrawlSnapshotAiInstruction);
});

test("toBlogSourceCrawlSnapshot does not include raw HTML storage fields", () => {
  const snapshot = toBlogSourceCrawlSnapshot({
    ...crawlSnapshotRow,
    raw_html_storage_path: "raw/site-1.html",
    raw_html: "<html><body>원문</body></html>",
  } as BlogSourceCrawlSnapshotRow & {
    raw_html_storage_path: string;
    raw_html: string;
  });
  const serialized = JSON.stringify(snapshot);

  assert.ok(snapshot);
  assert.equal(serialized.includes("raw_html"), false);
  assert.equal(serialized.includes("<html>"), false);
});

test("toBlogSourceCrawlSnapshot ignores external screenshot URLs", () => {
  const snapshot = toBlogSourceCrawlSnapshot({
    ...crawlSnapshotRow,
    screenshot_url: "https://external.example/snapshot.webp",
    screenshot_thumb_url: "https://external.example/snapshot-thumb.webp",
  });

  assert.ok(snapshot);
  assert.equal(snapshot.screenshot_url, null);
  assert.equal(snapshot.screenshot_thumb_url, null);
});

test("getBlogSourceCrawlSnapshotJson returns persisted crawl snapshot JSON", () => {
  const snapshot = toBlogSourceCrawlSnapshot(crawlSnapshotRow);

  assert.deepEqual(
    getBlogSourceCrawlSnapshotJson({ crawl_snapshot: snapshot }),
    snapshot,
  );
});

test("missing crawl snapshot is safe", () => {
  assert.equal(toBlogSourceCrawlSnapshot(null), null);
  assert.equal(getBlogSourceCrawlSnapshotJson(null), null);
  assert.equal(getBlogSourceCrawlSnapshotJson({}), null);
});
