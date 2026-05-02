import assert from "node:assert/strict";
import test from "node:test";
import { buildClaudeWriterPrompt } from "../../prompts/blog/claude-writer-v1";
import { buildOpenAiPlannerPrompt } from "../../prompts/blog/openai-planner-v1";
import { buildOpenAiValidatorPrompt } from "../../prompts/blog/openai-validator-v1";

const siteName = "민속촌";
const primaryKeyword = `${siteName} 토토사이트`;
const secondaryKeywords = [
  `${siteName} 토토사이트 검증`,
  `${siteName} 주소`,
  `${siteName} 도메인`,
  `${siteName} 먹튀`,
  `${siteName} 먹튀 제보`,
  `${siteName} 후기`,
];
const snapshot = {
  site: {
    id: "site-1",
    name: siteName,
    slug: "minsokchon",
    url: "https://example.test",
    description: "관리자 승인 사이트 상세 관측 설명",
    description_source_snapshot_id: "crawl-1",
    description_generated_at: "2026-05-02T03:00:00.000Z",
    screenshot_url:
      "https://project.supabase.co/storage/v1/object/public/site-screenshots/main.webp",
    screenshot_thumb_url:
      "https://project.supabase.co/storage/v1/object/public/site-screenshots/main-thumb.webp",
    favicon_url:
      "https://project.supabase.co/storage/v1/object/public/site-screenshots/favicon.webp",
    logo_url:
      "https://project.supabase.co/storage/v1/object/public/site-screenshots/logo.webp",
  },
  crawl_snapshot: {
    id: "crawl-1",
    source_type: "manual_html",
    collected_at: "2026-05-02T03:00:00.000Z",
    page_title: "관측 페이지",
    observed_menu_labels: ["홈", "스포츠"],
    promotional_flags_json: {
      has_promotional_terms: true,
      found_terms: [{ term: "보너스", count: 1 }],
    },
    excluded_terms_json: ["가입", "보너스"],
  },
  site_specific_verification: {
    representativeDomain: "example.test",
    approvedReviewCount: 2,
  },
};

test("planner input includes sites description and crawl snapshot context", () => {
  const prompt = buildOpenAiPlannerPrompt({
    siteName,
    primaryKeyword,
    secondaryKeywords,
    seoTitle: "민속촌 토토사이트 종합 정보 리포트",
    seoMetaTitle: "민속촌 토토사이트 | 관측·DNS·제보 현황",
    seoH1: "민속촌 토토사이트 종합 정보 리포트",
    seoMetaDescription: "민속촌 토토사이트 정보를 정리했습니다.",
    preferredSlug: "minsokchon-totosite",
    noticeLines: ["공지 문구"],
    hasLookupFailures: false,
    snapshot,
  });

  assert.ok(prompt.includes("관리자 승인 사이트 상세 관측 설명"));
  assert.ok(prompt.includes("description_source_snapshot_id"));
  assert.ok(prompt.includes("crawl_snapshot"));
  assert.ok(prompt.includes("## 민속촌 원본 사이트 관측 정보"));
});

test("writer and validator prompts require the comprehensive H2 structure", () => {
  const writerPrompt = buildClaudeWriterPrompt({
    snapshot,
    seoPlan: { section_plan: [] },
    seoTitle: "민속촌 토토사이트 종합 정보 리포트",
    seoH1: "민속촌 토토사이트 종합 정보 리포트",
    noticeLines: ["공지 문구"],
    hasLookupFailures: false,
  });
  const validatorPrompt = buildOpenAiValidatorPrompt({
    snapshot,
    siteName,
    seoPlan: {},
    claudeDraft: {},
    preferredSlug: "minsokchon-totosite",
    primaryKeyword,
    secondaryKeywords,
    seoTitle: "민속촌 토토사이트 종합 정보 리포트",
    seoMetaTitle: "민속촌 토토사이트 | 관측·DNS·제보 현황",
    seoH1: "민속촌 토토사이트 종합 정보 리포트",
    seoMetaDescription: "민속촌 토토사이트 정보를 정리했습니다.",
    noticeLines: ["공지 문구"],
    hasLookupFailures: false,
  });

  for (const prompt of [writerPrompt, validatorPrompt]) {
    assert.ok(prompt.includes("## 민속촌 원본 사이트 관측 정보"));
    assert.ok(prompt.includes("## 민속촌 도메인 DNS·WHOIS 조회 결과"));
    assert.ok(prompt.includes("## 민속촌 먹튀 제보 현황"));
    assert.ok(prompt.includes("## 민속촌 후기 데이터 현황"));
  }
});
