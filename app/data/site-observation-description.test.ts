import assert from "node:assert/strict";
import test from "node:test";
import {
  approveObservationDescription,
  buildObservationDescriptionFallback,
  ensureObservationDisclosure,
  generateObservationDescription,
  observationDisclosureText,
  validateObservationDescriptionDraft,
  type ApproveObservationDescriptionSiteUpdate,
  type ApproveObservationDescriptionSnapshotUpdate,
  type ObservationDescriptionAiOutput,
  type ObservationDescriptionSite,
  type ObservationDescriptionSnapshot,
  type ObservationDescriptionSnapshotUpdate,
} from "./site-observation-description";

const site: ObservationDescriptionSite = {
  id: "site-1",
  name: "관측 테스트",
  url: "https://example.com",
  description: "기존 수동 설명입니다. 관리자가 직접 입력한 설명입니다.",
  slug: "observation-test",
};

const snapshot: ObservationDescriptionSnapshot = {
  id: "snapshot-1",
  site_id: "site-1",
  source_url: "https://example.com",
  final_url: "https://example.com",
  collected_at: "2026-05-02T00:00:00.000Z",
  page_title: "관측 테스트 페이지",
  meta_description: "관리자가 제공한 공개 HTML 관측용 설명입니다.",
  h1: "관측 테스트 메인",
  observed_menu_labels: ["홈", "스포츠", "고객센터"],
  observed_account_features: ["로그인", "가입"],
  observed_betting_features: ["스포츠 경기", "카지노 게임"],
  observed_payment_flags: ["충전", "환전"],
  observed_notice_items: ["공지사항"],
  observed_event_items: ["이벤트", "보너스"],
  observed_footer_text: ["Copyright 2026 Example. All rights reserved."],
  observed_badges: ["운영 안내"],
  image_candidates_json: {
    image_alts: ["대표 화면 로고", "이벤트 배너"],
  },
  promotional_flags_json: {
    has_promotional_terms: true,
    found_terms: [
      { term: "가입", count: 1, contexts: ["가입"] },
      { term: "충전", count: 1, contexts: ["충전"] },
      { term: "이벤트", count: 1, contexts: ["이벤트"] },
      { term: "보너스", count: 1, contexts: ["보너스"] },
    ],
  },
  excluded_terms_json: ["가입", "충전", "이벤트", "보너스"],
  html_sha256: "a".repeat(64),
  visible_text_sha256: "b".repeat(64),
  snapshot_status: "extracted",
};

const validAiOutput: ObservationDescriptionAiOutput = {
  detail_description_md: `${observationDisclosureText}\n\n주요 메뉴, 화면 요소, 푸터 정보를 요약하고 화면 기록 확인에 필요한 공개 관측값을 정리합니다. 관리자 검수자는 이 요약을 기준으로 공개 상세페이지 설명을 보정할 수 있습니다.`,
  observation_summary: {
    page_title: "관측 테스트 페이지",
    h1: "관측 테스트 메인",
    menu_summary: ["홈", "스포츠", "고객센터"],
    account_feature_summary: ["계정 관련 화면 요소가 관측되었습니다."],
    betting_feature_summary: ["게임 및 경기 관련 화면 요소가 관측되었습니다."],
    payment_feature_summary: [
      "금전 처리 관련 화면 요소가 관측되었으나 공개 설명에서는 직접 라벨을 제외했습니다.",
    ],
    notice_summary: ["공지사항"],
    footer_summary: ["Copyright 2026 Example. All rights reserved."],
    excluded_promotional_terms: ["가입", "충전", "이벤트", "보너스"],
  },
  admin_warnings: [],
  prohibited_phrase_check: {
    contains_signup_cta: false,
    contains_bonus_or_event_promo: false,
    contains_recommendation: false,
    contains_absolute_safety_claim: false,
    contains_access_facilitation: false,
  },
};

async function runGenerate(options: {
  aiOutput?: ObservationDescriptionAiOutput;
  useAi?: boolean;
  admin?: boolean;
} = {}) {
  let updatePayload: ObservationDescriptionSnapshotUpdate | null = null;
  const result = await generateObservationDescription({
    adminSession:
      options.admin === false
        ? null
        : { userId: "admin-1", email: "admin@example.com" },
    siteId: "site-1",
    body: { snapshot_id: "snapshot-1" },
    getSite: async () => ({ site }),
    getSnapshot: async () => ({ snapshot }),
    generateDescription:
      options.useAi === false
        ? undefined
        : async () => ({
            output: options.aiOutput ?? validAiOutput,
            provider: "openai",
            model: "gpt-test",
            promptVersion: "test-prompt",
          }),
    updateSnapshot: async (_snapshotId, values) => {
      updatePayload = values;
      return {};
    },
  });

  return {
    result,
    updatePayload: updatePayload as ObservationDescriptionSnapshotUpdate | null,
  };
}

async function runApprove(options: {
  admin?: boolean;
  finalDescription?: string;
  targetSnapshot?: ObservationDescriptionSnapshot;
} = {}) {
  let siteUpdate: ApproveObservationDescriptionSiteUpdate | null = null;
  let snapshotUpdate: ApproveObservationDescriptionSnapshotUpdate | null = null;
  const finalDescription =
    options.finalDescription ??
    "조회 시점 기준 공개 HTML에서 관측된 정보만 바탕으로 정리한 최종 설명입니다. 메뉴와 화면 요소를 요약하며 이용을 권유하지 않습니다.";
  const result = await approveObservationDescription({
    adminSession:
      options.admin === false
        ? null
        : { userId: "admin-1", email: "admin@example.com" },
    siteId: "site-1",
    body: {
      snapshot_id: "snapshot-1",
      final_description_md: finalDescription,
    },
    getSite: async () => ({ site }),
    getSnapshot: async () => ({
      snapshot: options.targetSnapshot ?? snapshot,
    }),
    updateSiteDescription: async (_siteId, values) => {
      siteUpdate = values;
      return {};
    },
    approveSnapshot: async (_snapshotId, values) => {
      snapshotUpdate = values;
      return {};
    },
  });

  return {
    result,
    siteUpdate: siteUpdate as ApproveObservationDescriptionSiteUpdate | null,
    snapshotUpdate:
      snapshotUpdate as ApproveObservationDescriptionSnapshotUpdate | null,
  };
}

test("ensureObservationDisclosure inserts 조회 시점 기준 when missing", () => {
  const description =
    "공개 HTML 관측 정보를 바탕으로 메뉴와 화면 요소를 요약합니다.";
  const result = ensureObservationDisclosure(description);

  assert.equal(result.includes("조회 시점 기준"), true);
  assert.equal(result.includes(description), true);
});

test("ensureObservationDisclosure inserts 공개 HTML and observation source wording when missing", () => {
  const description =
    "조회 기준 화면 기록을 바탕으로 메뉴와 하단 안내를 정리합니다.";
  const result = ensureObservationDisclosure(description);

  assert.equal(result.includes("공개 HTML"), true);
  assert.equal(result.includes("관측된 정보"), true);
});

test("ensureObservationDisclosure does not duplicate an existing disclosure", () => {
  const description = `${observationDisclosureText}\n\n화면 구성과 메뉴를 요약합니다.`;
  const result = ensureObservationDisclosure(description);

  assert.equal(result.split(observationDisclosureText).length - 1, 1);
});

test("generateObservationDescription stores AI result on the snapshot", async () => {
  const { result, updatePayload } = await runGenerate();

  assert.equal(result.status, 200);
  assert.equal(result.body.snapshotId, "snapshot-1");
  assert.equal(updatePayload?.snapshot_status, "ai_generated");
  assert.equal(
    updatePayload?.ai_detail_description_md,
    validAiOutput.detail_description_md,
  );
  assert.equal(
    (
      updatePayload?.ai_observation_summary_json as {
        validation_status?: string;
      }
    )?.validation_status,
    "passed",
  );
});

test("generateObservationDescription marks forbidden phrases as failed", async () => {
  const { result, updatePayload } = await runGenerate({
    aiOutput: {
      ...validAiOutput,
      detail_description_md:
        "조회 시점 기준 공개 HTML에서 관측된 정보입니다. 지금 가입하세요. 최신 주소 바로가기와 이벤트 보너스도 확인할 수 있습니다. 먹튀 없음 검증 완료.",
    },
  });
  const check = result.body.prohibited_phrase_check as Record<string, boolean>;

  assert.equal(result.body.validation_status, "failed");
  assert.equal(check.contains_signup_cta, true);
  assert.equal(check.contains_bonus_or_event_promo, true);
  assert.equal(check.contains_access_facilitation, true);
  assert.equal(check.contains_absolute_safety_claim, true);
  assert.equal(
    (
      updatePayload?.ai_observation_summary_json as {
        validation_status?: string;
      }
    )?.validation_status,
    "failed",
  );
});

test("generateObservationDescription inserts required disclosure before validation", async () => {
  const { result, updatePayload } = await runGenerate({
    aiOutput: {
      ...validAiOutput,
      detail_description_md:
        "공개 HTML 관측 정보만 정리한 초안입니다. 화면 구조, 메뉴 배열, 하단 안내, 이미지 대체 텍스트를 관리자가 확인하기 쉽게 요약합니다.",
    },
  });
  const warnings = result.body.admin_warnings as string[];

  assert.equal(result.body.validation_status, "passed");
  assert.match(
    updatePayload?.ai_detail_description_md ?? "",
    /조회 시점 기준/,
  );
  assert.equal(
    updatePayload?.ai_detail_description_md.includes(observationDisclosureText),
    true,
  );
  assert.equal(
    warnings.some((warning) => warning.includes("조회 시점 기준")),
    false,
  );
});

test("fallback draft does not emphasize promotional flags in public description", () => {
  const fallback = buildObservationDescriptionFallback({ site, snapshot });
  const fallbackWithoutDisclosure = fallback.detail_description_md.replace(
    observationDisclosureText,
    "",
  );

  assert.equal(
    /가입|충전|환전|이벤트|보너스|첫충|추천|바로가기|최신 주소|우회 주소/.test(
      fallbackWithoutDisclosure,
    ),
    false,
  );
  assert.equal(
    fallback.detail_description_md.includes(
      "이용 유도성 문구가 관측되어 공개 설명에서는 제외했습니다.",
    ),
    true,
  );
  assert.deepEqual(fallback.observation_summary.excluded_promotional_terms, [
    "가입",
    "충전",
    "이벤트",
    "보너스",
  ]);
});

test("validateObservationDescriptionDraft reports disclosure omissions as warnings", () => {
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd:
      "관리자가 확인한 화면 구성과 메뉴 배열을 중심으로 사이트 식별에 필요한 공개 관측값을 요약합니다.",
    sourceTextChunks: ["메뉴 영역", "공지 영역", "푸터 영역"],
  });

  assert.equal(validation.status, "warning");
  assert.equal(
    validation.warnings.some((warning) => warning.includes("조회 시점 기준")),
    true,
  );
  assert.equal(
    validation.warnings.some((warning) => warning.includes("공개 HTML")),
    true,
  );
  assert.deepEqual(validation.errors, []);
});

test("validateObservationDescriptionDraft clears disclosure warnings after automatic insertion", () => {
  const description =
    "관리자가 확인한 화면 구성과 메뉴 배열을 중심으로 사이트 식별에 필요한 공개 관측값을 요약합니다.";
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: ensureObservationDisclosure(description),
    sourceTextChunks: ["메뉴 영역", "공지 영역", "푸터 영역"],
  });

  assert.equal(
    validation.warnings.some((warning) => warning.includes("조회 시점 기준")),
    false,
  );
  assert.equal(
    validation.warnings.some((warning) => warning.includes("공개 HTML")),
    false,
  );
});

test("validateObservationDescriptionDraft fails hard prohibited phrases", () => {
  for (const phrase of [
    "가입하세요",
    "바로가기",
    "최신 주소",
    "먹튀 없음",
    "안전합니다",
  ]) {
    const validation = validateObservationDescriptionDraft({
      detailDescriptionMd: `${observationDisclosureText}\n\n화면 구조와 메뉴 구성을 설명합니다. ${phrase}`,
      sourceTextChunks: ["메뉴 영역", "공지 영역", "푸터 영역"],
    });

    assert.equal(validation.status, "failed", phrase);
  }
});

test("validateObservationDescriptionDraft ignores short title h1 and menu copies", () => {
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: `${observationDisclosureText}\n\n관측 테스트 페이지와 관측 테스트 메인, 홈, 스포츠 라벨을 참고해 화면 구조를 요약했습니다. 추가로 메뉴 배열과 하단 안내가 관리 검수용으로 정리되었습니다.`,
    sourceTextChunks: ["관측 테스트 페이지", "관측 테스트 메인", "홈", "스포츠"],
  });

  assert.equal(validation.status, "passed");
});

test("validateObservationDescriptionDraft warns for one similar source sentence", () => {
  const copiedSentence =
    "관리자 공지 영역에는 점검 일정과 화면 변경 안내가 순서대로 배치되어 있다는 문장이 표시됩니다.";
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: `${observationDisclosureText}\n\n${copiedSentence}\n\n그 외 설명은 메뉴 구조, 하단 안내, 이미지 대체 텍스트를 별도로 요약해 원문 표현과 구분합니다. 관리자 검수자는 화면 기록과 공개 관측값을 함께 확인할 수 있습니다. 추가 문단에서는 관측 시각, 해시 기록, 저장소 이미지 여부, 공개 화면에서 제외된 이용 유도성 표현의 처리 기준을 설명합니다. 설명문은 원본 문장을 반복하기보다 관리자가 검토할 수 있는 구조화된 요약으로 보완됩니다.`,
    sourceTextChunks: [copiedSentence, "메뉴 영역", "푸터 영역"],
  });

  assert.equal(validation.status, "warning");
  assert.equal(
    validation.warnings.some((warning) => warning.includes("원본 HTML")),
    true,
  );
  assert.deepEqual(validation.errors, []);
});

test("validateObservationDescriptionDraft fails for multiple long copied sentences", () => {
  const firstCopiedSentence =
    "관리자 공지 영역에는 점검 일정과 화면 변경 안내가 순서대로 배치되어 있으며 이용자는 화면 하단에서 관련 고지를 확인할 수 있다는 긴 문장이 표시되고 추가 안내 문구도 같은 문단에 이어지며 관리자가 별도 확인해야 할 화면 위치와 문단 성격까지 함께 설명됩니다.";
  const secondCopiedSentence =
    "푸터 영역에는 회사 소개와 서비스 안내, 고객센터 운영 시간, 저작권 안내가 하나의 문단으로 길게 표시되어 화면 하단 정보로 관측되며 관리자는 이 문단을 별도 확인해야 하고 반복 표시되는 안내 문구와 저작권 문구를 구분해야 합니다.";
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: `${observationDisclosureText}\n\n${firstCopiedSentence}\n\n${secondCopiedSentence}\n\n나머지 문단은 관리자 검수용 요약입니다.`,
    sourceTextChunks: [firstCopiedSentence, secondCopiedSentence, "메뉴 영역"],
  });

  assert.equal(validation.status, "failed");
  assert.equal(
    validation.errors.some((error) => error.includes("80자 이상")),
    true,
  );
});

test("validateObservationDescriptionDraft fails long copied promotional sentence", () => {
  const promotionalSentence =
    "가입하면 보너스 혜택을 받을 수 있으며 이벤트 참여와 충전 안내를 통해 추가 혜택을 확인할 수 있다는 문장이 표시됩니다.";
  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: `${observationDisclosureText}\n\n${promotionalSentence}\n\n관리자 검수용 설명입니다.`,
    sourceTextChunks: [promotionalSentence, "메뉴 영역", "푸터 영역"],
  });

  assert.equal(validation.status, "failed");
  assert.equal(
    validation.errors.some((error) => error.includes("홍보성")),
    true,
  );
});

test("generateObservationDescription does not change site description before approval", async () => {
  const { updatePayload } = await runGenerate();

  assert.ok(updatePayload);
  assert.equal("description" in updatePayload, false);
  assert.deepEqual(Object.keys(updatePayload).sort(), [
    "ai_detail_description_md",
    "ai_observation_summary_json",
    "snapshot_status",
  ]);
});

test("approveObservationDescription updates site description after approval", async () => {
  const finalDescription =
    "조회 시점 기준 공개 HTML에서 관측된 정보만 반영한 관리자 최종 설명입니다. 공개 화면 구성과 푸터 정보를 요약했습니다.";
  const { result, siteUpdate } = await runApprove({ finalDescription });

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(siteUpdate?.description, finalDescription);
});

test("approveObservationDescription allows warning-only descriptions", async () => {
  const copiedSentence =
    "관리자 공지 영역에는 점검 일정과 화면 변경 안내가 순서대로 배치되어 있다는 문장이 표시됩니다.";
  const finalDescription = `${observationDisclosureText}\n\n${copiedSentence}\n\n관리자 최종 설명은 화면 구조, 메뉴 배열, 하단 안내, 이미지 대체 텍스트, 관측 시각, 해시 기록을 종합해 사이트 식별과 화면 기록 확인에 필요한 내용을 별도로 정리합니다. 이 문단은 원문 표현을 반복하지 않고 공개 관측값의 용도와 검수 기준을 설명합니다.`;
  const { result, siteUpdate, snapshotUpdate } = await runApprove({
    finalDescription,
    targetSnapshot: {
      ...snapshot,
      observed_notice_items: [copiedSentence],
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.validation_status, "warning");
  assert.equal(siteUpdate?.description, finalDescription);
  assert.equal(snapshotUpdate?.snapshot_status, "approved");
});

test("approveObservationDescription stores description source snapshot id", async () => {
  const { siteUpdate } = await runApprove();

  assert.equal(siteUpdate?.description_source_snapshot_id, "snapshot-1");
  assert.match(siteUpdate?.description_generated_at ?? "", /^\d{4}-/);
});

test("approveObservationDescription marks snapshot as approved", async () => {
  const { snapshotUpdate } = await runApprove();

  assert.equal(snapshotUpdate?.snapshot_status, "approved");
  assert.match(snapshotUpdate?.ai_detail_description_md ?? "", /조회 시점 기준/);
  assert.equal(
    (
      snapshotUpdate?.ai_observation_summary_json as {
        validation_status?: string;
      }
    )?.validation_status,
    "passed",
  );
});

test("approveObservationDescription blocks forbidden final descriptions", async () => {
  const { result, siteUpdate, snapshotUpdate } = await runApprove({
    finalDescription:
      "조회 시점 기준 공개 HTML에서 관측된 정보입니다. 지금 가입하세요. 최신 주소 바로가기와 이벤트 보너스를 확인하세요.",
  });

  assert.equal(result.status, 422);
  assert.equal(result.body.validation_status, "failed");
  assert.equal(siteUpdate, null);
  assert.equal(snapshotUpdate, null);
});

test("approveObservationDescription rejects non-admin callers", async () => {
  const { result, siteUpdate, snapshotUpdate } = await runApprove({
    admin: false,
  });

  assert.equal(result.status, 403);
  assert.equal(siteUpdate, null);
  assert.equal(snapshotUpdate, null);
});
