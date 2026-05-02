import { createHash } from "node:crypto";
import { formatObservationDescriptionForPublic } from "./public-site-description";
import type { SiteCrawlSnapshotStatus } from "./site-crawl-snapshots";
import {
  containsSiteObservationPromotionalTerm,
  omitSiteObservationPromotionalText,
} from "./site-html-promotional-flags";

export type ObservationDescriptionAdminSession = {
  userId: string;
  email: string;
};

export type ObservationDescriptionSite = {
  id: string;
  name: string;
  url: string | null;
  description?: string | null;
  slug?: string | null;
};

export type ObservationDescriptionSnapshot = {
  id: string;
  site_id: string;
  source_url: string | null;
  final_url: string | null;
  collected_at: string | null;
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  observed_menu_labels: unknown;
  observed_account_features: unknown;
  observed_betting_features: unknown;
  observed_payment_flags: unknown;
  observed_notice_items: unknown;
  observed_event_items: unknown;
  observed_footer_text: unknown;
  observed_badges: unknown;
  image_candidates_json: unknown;
  promotional_flags_json: unknown;
  excluded_terms_json: unknown;
  html_sha256: string | null;
  visible_text_sha256: string | null;
  snapshot_status?: SiteCrawlSnapshotStatus | string;
  ai_observation_summary_json?: unknown;
};

export type ObservationDescriptionSummary = {
  page_title: string | null;
  h1: string | null;
  menu_summary: string[];
  account_feature_summary: string[];
  betting_feature_summary: string[];
  payment_feature_summary: string[];
  notice_summary: string[];
  footer_summary: string[];
  excluded_promotional_terms: string[];
};

export type ObservationDescriptionProhibitedPhraseCheck = {
  contains_signup_cta: boolean;
  contains_bonus_or_event_promo: boolean;
  contains_recommendation: boolean;
  contains_absolute_safety_claim: boolean;
  contains_access_facilitation: boolean;
};

export type ObservationDescriptionAiOutput = {
  detail_description_md: string;
  observation_summary: ObservationDescriptionSummary;
  admin_warnings: string[];
  prohibited_phrase_check: ObservationDescriptionProhibitedPhraseCheck;
};

export type ObservationDescriptionValidationStatus =
  | "passed"
  | "warning"
  | "failed";

export type ObservationDescriptionValidationResult = {
  status: ObservationDescriptionValidationStatus;
  warnings: string[];
  errors: string[];
  admin_warnings: string[];
  prohibited_phrase_check: ObservationDescriptionProhibitedPhraseCheck;
};

export type ObservationDescriptionGeneratorResult = {
  output: unknown;
  provider: "openai" | "local";
  model: string | null;
  promptVersion: string | null;
  adminWarnings?: string[];
};

export type ObservationDescriptionSnapshotUpdate = {
  ai_detail_description_md: string;
  ai_observation_summary_json: Record<string, unknown>;
  snapshot_status: "ai_generated";
};

type GenerateObservationDescriptionDeps = {
  adminSession: ObservationDescriptionAdminSession | null;
  siteId: string;
  body: unknown;
  getSite: (siteId: string) => Promise<{
    site: ObservationDescriptionSite | null;
    error?: string;
  }>;
  getSnapshot: (snapshotId: string) => Promise<{
    snapshot: ObservationDescriptionSnapshot | null;
    error?: string;
  }>;
  generateDescription?: (input: {
    site: ObservationDescriptionSite;
    snapshot: ObservationDescriptionSnapshot;
    fallback: ObservationDescriptionAiOutput;
  }) => Promise<ObservationDescriptionGeneratorResult>;
  rewriteDescription?: (input: {
    site: ObservationDescriptionSite;
    snapshot: ObservationDescriptionSnapshot;
    draft: ObservationDescriptionAiOutput;
    fallback: ObservationDescriptionAiOutput;
  }) => Promise<ObservationDescriptionGeneratorResult>;
  updateSnapshot: (
    snapshotId: string,
    values: ObservationDescriptionSnapshotUpdate,
  ) => Promise<{ error?: string }>;
};

type ObservationDescriptionRequestBody = {
  snapshot_id?: unknown;
};

type ApproveObservationDescriptionRequestBody = {
  snapshot_id?: unknown;
  final_description_md?: unknown;
};

export type ApproveObservationDescriptionSiteUpdate = {
  description: string;
  description_source_snapshot_id: string;
  description_generated_at: string;
  updated_at: string;
};

export type ApproveObservationDescriptionSnapshotUpdate = {
  ai_detail_description_md: string;
  ai_observation_summary_json: Record<string, unknown>;
  snapshot_status: "approved";
  updated_at: string;
};

type ApproveObservationDescriptionDeps = {
  adminSession: ObservationDescriptionAdminSession | null;
  siteId: string;
  body: unknown;
  getSite: (siteId: string) => Promise<{
    site: ObservationDescriptionSite | null;
    error?: string;
  }>;
  getSnapshot: (snapshotId: string) => Promise<{
    snapshot: ObservationDescriptionSnapshot | null;
    error?: string;
  }>;
  updateSiteDescription: (
    siteId: string,
    values: ApproveObservationDescriptionSiteUpdate,
  ) => Promise<{ error?: string }>;
  approveSnapshot: (
    snapshotId: string,
    values: ApproveObservationDescriptionSnapshotUpdate,
  ) => Promise<{ error?: string }>;
};

export type GenerateObservationDescriptionResult = {
  status: number;
  body: Record<string, unknown>;
};

export type ApproveObservationDescriptionResult = {
  status: number;
  body: Record<string, unknown>;
};

const emptyProhibitedPhraseCheck: ObservationDescriptionProhibitedPhraseCheck = {
  contains_signup_cta: false,
  contains_bonus_or_event_promo: false,
  contains_recommendation: false,
  contains_absolute_safety_claim: false,
  contains_access_facilitation: false,
};

export const observationDisclosureText =
  "이 설명은 조회 시점 기준 관리자가 제공한 공개 HTML과 스크린샷을 바탕으로 작성되었습니다. 화면에 표시된 정보만 요약한 것이며, 가입이나 이용을 권유하는 내용은 아닙니다.";

const detailDescriptionMinLength = 300;
const detailDescriptionMaxLength = 600;
const reportLikeRepeatedPhrases = [
  "관측되었습니다",
  "구성 요소",
  "문구가 확인되었습니다",
  "배치된 형태로 보입니다",
];
const overviewDetailOnlyPatterns = [
  /(?:세부\s*메뉴|게임\s*분류)\s*[:：]/,
  /\bfooter\b/i,
  /푸터/,
  /이미지\s*(?:alt|대체\s*텍스트)/i,
  /배지/,
];

export async function generateObservationDescription({
  adminSession,
  siteId,
  body,
  getSite,
  getSnapshot,
  generateDescription,
  rewriteDescription,
  updateSnapshot,
}: GenerateObservationDescriptionDeps): Promise<GenerateObservationDescriptionResult> {
  if (!adminSession) {
    return {
      status: 403,
      body: { error: "관리자 권한이 필요합니다." },
    };
  }

  const requestBody = normalizeRequestBody(body);
  const snapshotId = normalizeString(requestBody.snapshot_id);

  if (!snapshotId) {
    return {
      status: 400,
      body: { error: "snapshot_id가 필요합니다." },
    };
  }

  const siteResult = await getSite(siteId);
  if (siteResult.error) {
    return {
      status: 500,
      body: { error: siteResult.error },
    };
  }

  if (!siteResult.site) {
    return {
      status: 404,
      body: { error: "사이트를 찾지 못했습니다." },
    };
  }

  const snapshotResult = await getSnapshot(snapshotId);
  if (snapshotResult.error) {
    return {
      status: 500,
      body: { error: snapshotResult.error },
    };
  }

  if (!snapshotResult.snapshot) {
    return {
      status: 404,
      body: { error: "관측 snapshot을 찾지 못했습니다." },
    };
  }

  if (snapshotResult.snapshot.site_id !== siteResult.site.id) {
    return {
      status: 400,
      body: { error: "snapshot_id가 해당 site_id에 속하지 않습니다." },
    };
  }

  const fallback = buildObservationDescriptionFallback({
    site: siteResult.site,
    snapshot: snapshotResult.snapshot,
  });
  const generationWarnings: string[] = [];
  let provider: ObservationDescriptionGeneratorResult["provider"] = "local";
  let model: string | null = null;
  let promptVersion: string | null = null;
  let generatedOutput: unknown = fallback;

  if (generateDescription) {
    try {
      const generationResult = await generateDescription({
        site: siteResult.site,
        snapshot: snapshotResult.snapshot,
        fallback,
      });
      provider = generationResult.provider;
      model = generationResult.model;
      promptVersion = generationResult.promptVersion;
      generatedOutput = generationResult.output;
      generationWarnings.push(...(generationResult.adminWarnings ?? []));
    } catch (error) {
      generationWarnings.push(
        error instanceof Error
          ? `AI 설명 생성 실패: ${error.message}`
          : "AI 설명 생성 실패: 원인을 확인하지 못했습니다.",
      );
    }
  }

  let normalizedOutput = normalizeObservationDescriptionAiOutput(
    generatedOutput,
    fallback,
  );
  const formattingWarnings: string[] = [];
  const formattedOutput = formatObservationDescriptionForStorage(
    normalizedOutput.detail_description_md,
    fallback.detail_description_md,
  );
  formattingWarnings.push(...formattedOutput.warnings);
  normalizedOutput = {
    ...normalizedOutput,
    detail_description_md: formattedOutput.description,
  };
  let validation = validateObservationDescriptionDraft({
    detailDescriptionMd: normalizedOutput.detail_description_md,
    sourceTextChunks: getSnapshotSourceTextChunks(snapshotResult.snapshot),
    prohibitedPhraseCheck: normalizedOutput.prohibited_phrase_check,
  });

  if (
    rewriteDescription &&
    validation.status === "warning" &&
    validation.warnings.some(isCopiedSourceWarning)
  ) {
    try {
      const rewriteResult = await rewriteDescription({
        site: siteResult.site,
        snapshot: snapshotResult.snapshot,
        draft: normalizedOutput,
        fallback,
      });
      provider = rewriteResult.provider;
      model = rewriteResult.model;
      promptVersion = rewriteResult.promptVersion;
      generationWarnings.push(...(rewriteResult.adminWarnings ?? []));
      generationWarnings.push(
        "원문 복사 의심 경고가 감지되어 초안을 1회 자동 재작성했습니다.",
      );
      normalizedOutput = normalizeObservationDescriptionAiOutput(
        rewriteResult.output,
        fallback,
      );
      const formattedRewriteOutput = formatObservationDescriptionForStorage(
        normalizedOutput.detail_description_md,
        fallback.detail_description_md,
      );
      formattingWarnings.push(...formattedRewriteOutput.warnings);
      normalizedOutput = {
        ...normalizedOutput,
        detail_description_md: formattedRewriteOutput.description,
      };
      validation = validateObservationDescriptionDraft({
        detailDescriptionMd: normalizedOutput.detail_description_md,
        sourceTextChunks: getSnapshotSourceTextChunks(snapshotResult.snapshot),
        prohibitedPhraseCheck: normalizedOutput.prohibited_phrase_check,
      });
    } catch (error) {
      generationWarnings.push(
        error instanceof Error
          ? `원문 복사 의심 초안 자동 재작성 실패: ${error.message}`
          : "원문 복사 의심 초안 자동 재작성 실패: 원인을 확인하지 못했습니다.",
      );
    }
  }

  const adminWarnings = uniqueStrings([
    ...normalizedOutput.admin_warnings,
    ...generationWarnings,
    ...formattingWarnings,
    ...validation.warnings,
  ]);
  const resultOutput: ObservationDescriptionAiOutput = {
    ...normalizedOutput,
    admin_warnings: adminWarnings,
    prohibited_phrase_check: validation.prohibited_phrase_check,
  };
  const aiObservationSummaryJson = {
    observation_summary: resultOutput.observation_summary,
    admin_warnings: adminWarnings,
    validation_errors: validation.errors,
    prohibited_phrase_check: resultOutput.prohibited_phrase_check,
    validation_status: validation.status,
    provider,
    model,
    prompt_version: promptVersion,
    generated_at: new Date().toISOString(),
  };

  const updateResult = await updateSnapshot(snapshotId, {
    ai_detail_description_md: resultOutput.detail_description_md,
    ai_observation_summary_json: aiObservationSummaryJson,
    snapshot_status: "ai_generated",
  });

  if (updateResult.error) {
    return {
      status: 500,
      body: { error: updateResult.error },
    };
  }

  return {
    status: 200,
    body: {
      snapshotId,
      siteId,
      detail_description_md: resultOutput.detail_description_md,
      observation_summary: resultOutput.observation_summary,
      admin_warnings: adminWarnings,
      validation_errors: validation.errors,
      prohibited_phrase_check: resultOutput.prohibited_phrase_check,
      validation_status: validation.status,
      provider,
      model,
      prompt_version: promptVersion,
    },
  };
}

export async function approveObservationDescription({
  adminSession,
  siteId,
  body,
  getSite,
  getSnapshot,
  updateSiteDescription,
  approveSnapshot,
}: ApproveObservationDescriptionDeps): Promise<ApproveObservationDescriptionResult> {
  if (!adminSession) {
    return {
      status: 403,
      body: { error: "관리자 권한이 필요합니다." },
    };
  }

  const requestBody = normalizeApproveRequestBody(body);
  const snapshotId = normalizeString(requestBody.snapshot_id);
  const formattedFinalDescription = formatObservationDescriptionForStorage(
    normalizeDescriptionMarkdown(requestBody.final_description_md),
  );
  const finalDescriptionMd = formattedFinalDescription.description;

  if (!snapshotId) {
    return {
      status: 400,
      body: { error: "snapshot_id가 필요합니다." },
    };
  }

  if (finalDescriptionMd.length < 30) {
    return {
      status: 400,
      body: { error: "final_description_md는 최소 30자 이상이어야 합니다." },
    };
  }

  const siteResult = await getSite(siteId);
  if (siteResult.error) {
    return {
      status: 500,
      body: { error: siteResult.error },
    };
  }

  if (!siteResult.site) {
    return {
      status: 404,
      body: { error: "사이트를 찾지 못했습니다." },
    };
  }

  const snapshotResult = await getSnapshot(snapshotId);
  if (snapshotResult.error) {
    return {
      status: 500,
      body: { error: snapshotResult.error },
    };
  }

  if (!snapshotResult.snapshot) {
    return {
      status: 404,
      body: { error: "관측 snapshot을 찾지 못했습니다." },
    };
  }

  if (snapshotResult.snapshot.site_id !== siteResult.site.id) {
    return {
      status: 400,
      body: { error: "snapshot_id가 해당 site_id에 속하지 않습니다." },
    };
  }

  const validation = validateObservationDescriptionDraft({
    detailDescriptionMd: finalDescriptionMd,
    sourceTextChunks: getSnapshotSourceTextChunks(snapshotResult.snapshot),
  });
  const approvalWarnings = uniqueStrings([
    ...formattedFinalDescription.warnings,
    ...validation.warnings,
  ]);

  if (validation.errors.length > 0) {
    return {
      status: 422,
      body: {
        error: "금지 문구가 포함되어 사이트 설명에 반영할 수 없습니다.",
        validation_status: validation.status,
        admin_warnings: approvalWarnings,
        validation_errors: validation.errors,
        prohibited_phrase_check: validation.prohibited_phrase_check,
      },
    };
  }

  const now = new Date().toISOString();
  const previousDescription = normalizeDescriptionMarkdown(
    siteResult.site.description ?? "",
  );
  const siteUpdateResult = await updateSiteDescription(siteId, {
    description: finalDescriptionMd,
    description_source_snapshot_id: snapshotId,
    description_generated_at: now,
    updated_at: now,
  });

  if (siteUpdateResult.error) {
    return {
      status: 500,
      body: { error: siteUpdateResult.error },
    };
  }

  const existingSummary = isRecord(snapshotResult.snapshot.ai_observation_summary_json)
    ? snapshotResult.snapshot.ai_observation_summary_json
    : {};
  const approveSnapshotResult = await approveSnapshot(snapshotId, {
    ai_detail_description_md: finalDescriptionMd,
    ai_observation_summary_json: {
      ...existingSummary,
      approval: {
        approved_at: now,
        approved_by: adminSession.userId,
        previous_description_sha256: previousDescription
          ? sha256(previousDescription)
          : null,
        final_description_sha256: sha256(finalDescriptionMd),
      },
      validation_status: validation.status,
      admin_warnings: approvalWarnings,
      validation_errors: validation.errors,
      prohibited_phrase_check: validation.prohibited_phrase_check,
    },
    snapshot_status: "approved",
    updated_at: now,
  });

  if (approveSnapshotResult.error) {
    return {
      status: 500,
      body: { error: approveSnapshotResult.error },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      siteId,
      snapshotId,
      description: finalDescriptionMd,
      description_source_snapshot_id: snapshotId,
      description_generated_at: now,
      validation_status: validation.status,
      admin_warnings: approvalWarnings,
      validation_errors: validation.errors,
      prohibited_phrase_check: validation.prohibited_phrase_check,
      preview_path: siteResult.site.slug ? `/sites/${siteResult.site.slug}` : null,
    },
  };
}

export function buildObservationDescriptionFallback({
  site,
  snapshot,
}: {
  site: ObservationDescriptionSite;
  snapshot: ObservationDescriptionSnapshot;
}): ObservationDescriptionAiOutput {
  const observationSummary = buildObservationSummary(snapshot);
  const siteName = safePublicText(site.name) || "해당 사이트";
  const titleSummary = safePublicText(snapshot.page_title);
  const h1Summary = safePublicText(snapshot.h1);
  const displayName = getObservationDisplayName(
    titleSummary,
    h1Summary,
    siteName,
  );
  const siteSubject = getSiteSubjectName(siteName);
  const displayNameSentence =
    displayName && displayName !== siteName
      ? `${siteSubject}는 공개 화면에서 "${displayName}"이라는 이름을 사용하는 사이트입니다.`
      : `${siteSubject}는 사이트 식별명과 주요 화면 흐름을 함께 사용하는 사이트입니다.`;
  const categorySentence =
    observationSummary.betting_feature_summary.length > 0
      ? "주요 화면은 스포츠, 카지노, 슬롯 등 게임 카테고리를 중심으로 구성되어 있으며, 로그인과 고객센터처럼 계정·문의 관련 메뉴도 함께 배치되어 있습니다."
      : "주요 화면은 사이트 식별 영역, 계정 관련 메뉴, 문의 또는 고객지원 요소를 중심으로 구성되어 있습니다.";
  const paymentRecordSentence =
    observationSummary.payment_feature_summary.length > 0
      ? "일부 화면에는 결제나 이용 내역 관련 요소가 포함되어 있지만, 제공된 HTML과 스크린샷만으로 실제 결제 방식이나 이용 조건까지 확인할 수는 없습니다."
      : "제공된 HTML과 스크린샷만으로 실제 결제 방식, 본인 확인 절차, 이용 조건까지 확인할 수는 없습니다.";
  const paragraphs = [
    `${displayNameSentence} ${categorySentence}`,
    `본문에는 여러 영역으로 이동하는 카드형 안내와 화면 전환 요소가 함께 배치되어 있습니다. ${paymentRecordSentence}`,
    "하단에는 고객지원, 공지, 외부 연락 채널, 책임 있는 이용 관련 안내가 포함되어 있습니다. 자세한 메뉴와 화면 구성은 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있습니다.",
  ];

  return {
    detail_description_md: paragraphs.join("\n\n"),
    observation_summary: observationSummary,
    admin_warnings: [],
    prohibited_phrase_check: emptyProhibitedPhraseCheck,
  };
}

export function buildObservationSummary(
  snapshot: ObservationDescriptionSnapshot,
): ObservationDescriptionSummary {
  return {
    page_title: normalizeNullableString(snapshot.page_title),
    h1: normalizeNullableString(snapshot.h1),
    menu_summary: safeValues(snapshot.observed_menu_labels, 8),
    account_feature_summary: safeValues(
      snapshot.observed_account_features,
      6,
      "계정 관련 화면 요소가 확인되지만 이용 유도성 표현은 제외했습니다.",
    ),
    betting_feature_summary: safeValues(
      snapshot.observed_betting_features,
      6,
      "게임 및 경기 관련 화면 요소가 확인됩니다.",
    ),
    payment_feature_summary: safeValues(
      snapshot.observed_payment_flags,
      6,
      "금전 처리 관련 화면 요소가 확인되지만 공개 설명에서는 직접 라벨을 제외했습니다.",
    ),
    notice_summary: safeValues(
      [
        ...asStringArray(snapshot.observed_notice_items),
        ...asStringArray(snapshot.observed_event_items),
      ],
      6,
      "공지성 또는 캠페인성 화면 요소가 확인됩니다.",
    ),
    footer_summary: safeValues(
      snapshot.observed_footer_text,
      4,
      "하단 영역의 운영 또는 저작권 관련 문구가 확인됩니다.",
    ),
    excluded_promotional_terms: asStringArray(snapshot.excluded_terms_json),
  };
}

export function normalizeObservationDescriptionAiOutput(
  value: unknown,
  fallback: ObservationDescriptionAiOutput,
): ObservationDescriptionAiOutput {
  const record = isRecord(value) ? value : {};
  const summaryRecord = isRecord(record.observation_summary)
    ? record.observation_summary
    : {};

  return {
    detail_description_md:
      normalizeDescriptionMarkdown(record.detail_description_md) ||
      fallback.detail_description_md,
    observation_summary: {
      page_title:
        normalizeNullableString(summaryRecord.page_title) ??
        fallback.observation_summary.page_title,
      h1:
        normalizeNullableString(summaryRecord.h1) ??
        fallback.observation_summary.h1,
      menu_summary: stringArrayOrFallback(
        summaryRecord.menu_summary,
        fallback.observation_summary.menu_summary,
      ),
      account_feature_summary: stringArrayOrFallback(
        summaryRecord.account_feature_summary,
        fallback.observation_summary.account_feature_summary,
      ),
      betting_feature_summary: stringArrayOrFallback(
        summaryRecord.betting_feature_summary,
        fallback.observation_summary.betting_feature_summary,
      ),
      payment_feature_summary: stringArrayOrFallback(
        summaryRecord.payment_feature_summary,
        fallback.observation_summary.payment_feature_summary,
      ),
      notice_summary: stringArrayOrFallback(
        summaryRecord.notice_summary,
        fallback.observation_summary.notice_summary,
      ),
      footer_summary: stringArrayOrFallback(
        summaryRecord.footer_summary,
        fallback.observation_summary.footer_summary,
      ),
      excluded_promotional_terms: stringArrayOrFallback(
        summaryRecord.excluded_promotional_terms,
        fallback.observation_summary.excluded_promotional_terms,
      ),
    },
    admin_warnings: asStringArray(record.admin_warnings),
    prohibited_phrase_check: normalizeProhibitedPhraseCheck(
      record.prohibited_phrase_check,
    ),
  };
}

export function ensureObservationDisclosure(description: string): string {
  return formatObservationDescriptionForStorage(description).description;
}

export function sanitizeObservationDescription(description: string): string {
  return normalizeDescriptionMarkdown(description)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "[제거된 스크립트]")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "[제거된 스타일]")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .trim();
}

function formatObservationDescriptionForStorage(
  description: string,
  fallbackDescription = "",
) {
  const formatted = formatObservationDescriptionForPublic(description);
  const storageDescription = sanitizeObservationDescription(formatted.description);

  if (storageDescription || !fallbackDescription) {
    return {
      description: storageDescription,
      warnings: formatted.warnings,
    };
  }

  const fallback = formatObservationDescriptionForPublic(fallbackDescription);

  return {
    description: sanitizeObservationDescription(fallback.description),
    warnings: uniqueStrings([
      ...formatted.warnings,
      ...fallback.warnings,
      "설명문에서 공개 가능한 본문을 찾지 못해 로컬 fallback 설명을 사용했습니다.",
    ]),
  };
}

export function validateObservationDescriptionDraft({
  detailDescriptionMd,
  sourceTextChunks = [],
  prohibitedPhraseCheck,
}: {
  detailDescriptionMd: string;
  sourceTextChunks?: string[];
  prohibitedPhraseCheck?: Partial<ObservationDescriptionProhibitedPhraseCheck>;
}): ObservationDescriptionValidationResult {
  const sanitizedDescription = sanitizeObservationDescription(detailDescriptionMd);
  const detectedCheck = detectProhibitedPhrases(sanitizedDescription);
  const mergedCheck = mergeProhibitedPhraseChecks(
    detectedCheck,
    normalizeProhibitedPhraseCheck(prohibitedPhraseCheck),
  );
  const warnings: string[] = [];
  const errors = getProhibitedPhraseErrors(mergedCheck);

  const descriptionWithoutDisclosure = sanitizedDescription.replace(
    observationDisclosureText,
    "",
  );

  if (normalizeForCopyCheck(descriptionWithoutDisclosure).length < 40) {
    warnings.push("detail_description_md가 짧아 관리자 추가 검수가 필요합니다.");
  }

  if (uniqueStrings(sourceTextChunks).length < 3) {
    warnings.push("관측 데이터가 부족해 관리자 추가 검수가 필요합니다.");
  }

  warnings.push(...getNaturalDescriptionStyleWarnings(sanitizedDescription));

  if (containsRawHtmlRenderAttempt(sanitizedDescription)) {
    errors.push("외부 원본 HTML을 그대로 렌더링하려는 내용이 포함되어 있습니다.");
  }

  const copyCheck = detectCopiedSourceText(sanitizedDescription, sourceTextChunks);
  warnings.push(...copyCheck.warnings);
  errors.push(...copyCheck.errors);

  const uniqueWarnings = uniqueStrings(warnings);
  const uniqueErrors = uniqueStrings(errors);
  const status: ObservationDescriptionValidationStatus =
    uniqueErrors.length > 0
      ? "failed"
      : uniqueWarnings.length > 0
        ? "warning"
        : "passed";

  return {
    status,
    warnings: uniqueWarnings,
    errors: uniqueErrors,
    admin_warnings: uniqueWarnings,
    prohibited_phrase_check: mergedCheck,
  };
}

export function detectProhibitedPhrases(
  value: string,
): ObservationDescriptionProhibitedPhraseCheck {
  const normalizedValue = normalizeForPhraseCheck(value);
  const sentences = splitSentences(normalizedValue);

  return {
    contains_signup_cta: /가입하세요|가입하기|회원가입\s*(?:하|진행|신청)|지금\s*가입/.test(
      normalizedValue,
    ),
    contains_bonus_or_event_promo: sentences.some(isPromotionalSentence),
    contains_recommendation: /추천합니다|추천드립니다|추천\s*대상|강력\s*추천/.test(
      normalizedValue,
    ),
    contains_absolute_safety_claim:
      /먹튀\s*없음|안전함|안전하다|안전합니다|검증\s*완료|완전\s*안전|안전\s*보장/.test(
        normalizedValue,
      ),
    contains_access_facilitation:
      /바로가기|최신\s*주소|우회\s*주소/.test(normalizedValue),
  };
}

export function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(normalizeString)
        .filter(Boolean)
    : [];
}

export function getImageAltTexts(snapshot: ObservationDescriptionSnapshot) {
  if (!isRecord(snapshot.image_candidates_json)) return [];

  return asStringArray(snapshot.image_candidates_json.image_alts);
}

export function getSnapshotSourceTextChunks(
  snapshot: ObservationDescriptionSnapshot,
) {
  return uniqueStrings([
    ...asStringArray(snapshot.observed_menu_labels),
    ...asStringArray(snapshot.observed_account_features),
    ...asStringArray(snapshot.observed_betting_features),
    ...asStringArray(snapshot.observed_payment_flags),
    ...asStringArray(snapshot.observed_notice_items),
    ...asStringArray(snapshot.observed_event_items),
    ...asStringArray(snapshot.observed_footer_text),
    ...asStringArray(snapshot.observed_badges),
    ...getImageAltTexts(snapshot),
  ]);
}

function safeValues(value: unknown, limit: number, fallbackText?: string) {
  const rawValues = asStringArray(value);
  const safeRawValues = omitSiteObservationPromotionalText(rawValues);
  const safe = safeRawValues
    .map(safePublicText)
    .filter(Boolean)
    .slice(0, limit);

  if (safe.length > 0) return safe;
  if (rawValues.length > 0 && fallbackText) return [fallbackText];

  return [];
}

function safePublicText(value: unknown) {
  const text = normalizeString(value);
  if (!text) return "";
  if (containsSiteObservationPromotionalTerm(text)) return "";
  if (Object.values(detectProhibitedPhrases(text)).some(Boolean)) return "";

  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function stringArrayOrFallback(value: unknown, fallback: string[]) {
  const values = asStringArray(value);
  return values.length > 0 ? values : fallback;
}

function getObservationDisplayName(
  titleSummary: string,
  h1Summary: string,
  siteName: string,
) {
  const displayName = h1Summary || titleSummary || siteName;

  return displayName.length > 60 ? `${displayName.slice(0, 57)}...` : displayName;
}

function getSiteSubjectName(siteName: string) {
  return siteName.endsWith("사이트") ? siteName : `${siteName} 사이트`;
}

function normalizeRequestBody(value: unknown): ObservationDescriptionRequestBody {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ObservationDescriptionRequestBody)
    : {};
}

function normalizeApproveRequestBody(
  value: unknown,
): ApproveObservationDescriptionRequestBody {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApproveObservationDescriptionRequestBody)
    : {};
}

function normalizeDescriptionMarkdown(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/\r\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim()
    : "";
}

function normalizeNullableString(value: unknown) {
  const normalizedValue = normalizeString(value);
  return normalizedValue || null;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeProhibitedPhraseCheck(
  value: unknown,
): ObservationDescriptionProhibitedPhraseCheck {
  const record = isRecord(value) ? value : {};

  return {
    contains_signup_cta: record.contains_signup_cta === true,
    contains_bonus_or_event_promo:
      record.contains_bonus_or_event_promo === true,
    contains_recommendation: record.contains_recommendation === true,
    contains_absolute_safety_claim:
      record.contains_absolute_safety_claim === true,
    contains_access_facilitation: record.contains_access_facilitation === true,
  };
}

function mergeProhibitedPhraseChecks(
  left: ObservationDescriptionProhibitedPhraseCheck,
  right: ObservationDescriptionProhibitedPhraseCheck,
): ObservationDescriptionProhibitedPhraseCheck {
  return {
    contains_signup_cta: left.contains_signup_cta || right.contains_signup_cta,
    contains_bonus_or_event_promo:
      left.contains_bonus_or_event_promo ||
      right.contains_bonus_or_event_promo,
    contains_recommendation:
      left.contains_recommendation || right.contains_recommendation,
    contains_absolute_safety_claim:
      left.contains_absolute_safety_claim ||
      right.contains_absolute_safety_claim,
    contains_access_facilitation:
      left.contains_access_facilitation || right.contains_access_facilitation,
  };
}

function normalizeForPhraseCheck(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getProhibitedPhraseErrors(
  check: ObservationDescriptionProhibitedPhraseCheck,
) {
  const errors: string[] = [];

  if (check.contains_signup_cta) {
    errors.push("가입 유도 문구가 포함되어 있습니다.");
  }

  if (check.contains_access_facilitation) {
    errors.push("바로가기, 최신 주소, 우회 주소 같은 접속 유도 문구가 포함되어 있습니다.");
  }

  if (check.contains_recommendation) {
    errors.push("추천 표현이 포함되어 있습니다.");
  }

  if (check.contains_absolute_safety_claim) {
    errors.push("안전성 또는 먹튀 여부를 단정하는 표현이 포함되어 있습니다.");
  }

  if (check.contains_bonus_or_event_promo) {
    errors.push("이벤트, 보너스, 충전, 환전 관련 홍보성 문장이 포함되어 있습니다.");
  }

  return errors;
}

function containsRawHtmlRenderAttempt(value: string) {
  return /<\/?(?:html|body|iframe|script|style|form|input|button|a|img|video|object|embed|meta|link)\b/i.test(
    value,
  );
}

function detectCopiedSourceText(detailDescriptionMd: string, chunks: string[]) {
  const descriptionSentences = splitSentences(detailDescriptionMd)
    .filter((sentence) => !isIgnoredCopySentence(sentence))
    .map((sentence) => ({
      text: sentence,
      normalized: normalizeForCopyCheck(sentence),
    }))
    .filter((sentence) => sentence.normalized.length >= 30);
  const sourceSentences = chunks
    .flatMap(splitSentences)
    .filter((sentence) => !isIgnoredCopySentence(sentence))
    .map((sentence) => ({
      text: sentence,
      normalized: normalizeForCopyCheck(sentence),
    }))
    .filter((sentence) => sentence.normalized.length >= 30);
  const matches: Array<{
    detailText: string;
    sourceText: string;
    detailLength: number;
    sourceLength: number;
    promotional: boolean;
  }> = [];

  for (const detailSentence of descriptionSentences) {
    const sourceSentence = sourceSentences.find((candidate) =>
      areSentencesNearlyIdentical(
        detailSentence.normalized,
        candidate.normalized,
      ),
    );

    if (!sourceSentence) continue;

    matches.push({
      detailText: detailSentence.text,
      sourceText: sourceSentence.text,
      detailLength: detailSentence.normalized.length,
      sourceLength: sourceSentence.normalized.length,
      promotional:
        containsCopyRiskPromotionalTerm(detailSentence.text) ||
        containsCopyRiskPromotionalTerm(sourceSentence.text),
    });
  }

  if (matches.length === 0) {
    return { warnings: [], errors: [] };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const copiedDescriptionLength = matches.reduce(
    (sum, match) => sum + match.detailLength,
    0,
  );
  const totalDescriptionLength = Math.max(
    normalizeForCopyCheck(detailDescriptionMd).length,
    1,
  );
  const longMatches = matches.filter(
    (match) => match.detailLength >= 80 || match.sourceLength >= 80,
  );
  const hasPromotionalCopy = matches.some(
    (match) =>
      match.promotional &&
      (match.detailLength >= 40 || match.sourceLength >= 40),
  );

  if (hasPromotionalCopy) {
    warnings.push("원본 HTML의 긴 홍보성 문장을 그대로 복사한 것으로 보입니다.");
  }

  if (longMatches.length >= 2) {
    warnings.push(
      "원본 HTML의 80자 이상 긴 문장을 여러 개 그대로 복사한 것으로 보입니다.",
    );
  }

  if (copiedDescriptionLength / totalDescriptionLength >= 0.2) {
    warnings.push("설명문 전체에서 원본 HTML과 거의 동일한 문장 비중이 높습니다.");
  }

  if (matches.some((match) => match.detailLength >= 40)) {
    warnings.push(
      "원본 HTML의 긴 문장을 그대로 복사한 것으로 보이는 문장이 있습니다.",
    );
  }

  return { warnings, errors };
}

function splitSentences(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/([.!?。！？])\s+/g, "$1\n")
    .split(/\n+/)
    .map((sentence) =>
      sentence
        .replace(/^\s{0,3}(?:#{1,6}|\-|\.|\*|\d+\.)\s*/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

function getNaturalDescriptionStyleWarnings(value: string) {
  const warnings: string[] = [];
  const paragraphs = getDescriptionParagraphs(value);
  const plainTextLength = normalizeForStyleLength(value).length;
  const repeatedPhraseCount = reportLikeRepeatedPhrases.reduce(
    (total, phrase) => total + countTextOccurrences(value, phrase),
    0,
  );
  const hasRepeatedSourceDisclosurePhrase =
    countTextOccurrences(value, "공개 화면") >= 3 ||
    countTextOccurrences(value, "공개 HTML") >= 2 ||
    countTextOccurrences(value, "조회 시점 기준") >= 2;

  if (paragraphs.length < 2 || paragraphs.length > 3) {
    warnings.push("사이트 설명은 2~3문단으로 정리하는 것이 좋습니다.");
  }

  if (
    plainTextLength < detailDescriptionMinLength ||
    plainTextLength > detailDescriptionMaxLength
  ) {
    warnings.push("사이트 설명은 300~600자 정도로 조정하는 것이 좋습니다.");
  }

  if (repeatedPhraseCount > 2 || hasRepeatedSourceDisclosurePhrase) {
    warnings.push(
      "AI 리포트처럼 보이는 반복 표현은 전체 설명에서 1~2회 이하로 줄이는 것이 좋습니다.",
    );
  }

  if (countTextOccurrences(value, "관측되었습니다") >= 3) {
    warnings.push("'관측되었습니다' 표현이 3회 이상 반복됩니다.");
  }

  if (countTextOccurrences(value, "공개 화면") >= 3) {
    warnings.push("'공개 화면' 표현이 3회 이상 반복됩니다.");
  }

  if (countTextOccurrences(value, "조회 시점 기준") >= 2) {
    warnings.push("'조회 시점 기준' 표현이 2회 이상 반복됩니다.");
  }

  if (countTextOccurrences(value, "공개 HTML") >= 2) {
    warnings.push("'공개 HTML' 표현이 2회 이상 반복됩니다.");
  }

  if (/문서\s*제목은|페이지\s*제목은|메타\s*설명(?:에는|은)|대표\s*제목\s*영역(?:에는|은)|\bpage_title\b|\bmeta_description\b|\bh1\b|h1\s*(?:에는|은)/i.test(value)) {
    warnings.push("page_title, meta_description, h1 같은 내부 추출 설명은 사이트 설명에서 제외하세요.");
  }

  if (/^\s{0,3}(?:#{1,6}|[-*+]|\d+\.)\s/m.test(value)) {
    warnings.push("사이트 설명은 제목이나 목록보다 자연스러운 문단 중심으로 작성하세요.");
  }

  if (/https?:\/\/\S+|www\.[^\s)]+/i.test(value)) {
    warnings.push("URL은 설명 본문에 길게 쓰지 말고 주소·도메인 섹션에서 표시하세요.");
  }

  if (plainTextLength > 700) {
    warnings.push("사이트 설명이 700자를 초과합니다.");
  }

  if (hasLongMenuLikeEnumeration(value)) {
    warnings.push("메뉴명이나 세부 항목이 과도하게 나열된 문장이 있습니다.");
  }

  if (overviewDetailOnlyPatterns.some((pattern) => pattern.test(value))) {
    warnings.push(
      "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지 같은 항목은 원본 사이트 관측 정보 섹션에서만 표시하세요.",
    );
  }

  for (const paragraph of paragraphs) {
    const sentenceCount = splitSentences(paragraph).length;

    if (sentenceCount > 3) {
      warnings.push("각 문단은 2~3문장 이내로 줄이는 것이 좋습니다.");
      break;
    }
  }

  return warnings;
}

function getDescriptionParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normalizeForStyleLength(value: string) {
  return value
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/[#*_`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countTextOccurrences(value: string, phrase: string) {
  return value.split(phrase).length - 1;
}

function hasLongMenuLikeEnumeration(value: string) {
  return value
    .split(/[.!?。！？]\s*/)
    .some((sentence) => {
      const items = sentence
        .split(/\s*(?:,|，|、|·|ㆍ|\/|\|)\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 1 && item.length <= 18);

      return items.length >= 8;
    });
}

function isPromotionalSentence(sentence: string) {
  if (!/이벤트|보너스|첫충|매충|충전|환전|쿠폰/.test(sentence)) {
    return false;
  }

  return /확인|받|제공|혜택|참여|누리|지급|이용|가능|안내|홍보|강조|진행|신청|하세요|드립니다|있습니다|할 수 있습니다|첫충|매충|쿠폰/.test(
    sentence,
  );
}

function isIgnoredCopySentence(sentence: string) {
  const normalizedSentence = sentence.replace(/\s+/g, " ").trim();
  const normalizedCopyText = normalizeForCopyCheck(normalizedSentence);

  return (
    normalizedSentence.includes(observationDisclosureText) ||
    normalizedCopyText.length < 30 ||
    /^copyright\s*\d{4}/i.test(normalizedSentence) ||
    /^[a-z0-9가-힣_-]{1,20}$/i.test(normalizedSentence)
  );
}

function areSentencesNearlyIdentical(left: string, right: string) {
  if (left.length < 30 || right.length < 30) return false;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;

  if (longer.includes(shorter) && shorter.length / longer.length >= 0.85) {
    return true;
  }

  return getBigramSimilarity(left, right) >= 0.92;
}

function getBigramSimilarity(left: string, right: string) {
  const leftBigrams = getBigrams(left);
  const rightBigrams = getBigrams(right);

  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0;

  let intersection = 0;

  for (const bigram of leftBigrams) {
    if (rightBigrams.has(bigram)) intersection += 1;
  }

  return (2 * intersection) / (leftBigrams.size + rightBigrams.size);
}

function getBigrams(value: string) {
  const bigrams = new Set<string>();

  for (let index = 0; index < value.length - 1; index += 1) {
    bigrams.add(value.slice(index, index + 2));
  }

  return bigrams;
}

function containsCopyRiskPromotionalTerm(value: string) {
  return /가입|입금|프로모션|보너스|추천|첫충|매충|이벤트|충전|환전/.test(value);
}

function normalizeForCopyCheck(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}가-힣]/gu, "")
    .toLowerCase()
    .trim();
}

function isCopiedSourceWarning(warning: string) {
  return warning.includes("원본 HTML의 긴 문장");
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(normalizeString).filter(Boolean)));
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
