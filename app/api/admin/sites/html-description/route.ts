import { NextResponse } from "next/server";
import type { SiteHtmlObservation } from "@/app/data/site-html-observation";
import { containsSiteObservationPromotionalTerm } from "@/app/data/site-html-promotional-flags";
import {
  ensureObservationDisclosure,
  observationDisclosureText,
  sanitizeObservationDescription,
  validateObservationDescriptionDraft,
} from "@/app/data/site-observation-description";
import {
  getAdminSession,
  getBearerToken,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

type DescriptionRequest = {
  siteName?: unknown;
  sourceUrl?: unknown;
  observation?: unknown;
};

type DescriptionResponse = {
  aiDetailDescriptionMd: string;
  aiObservationSummaryJson: Record<string, unknown>;
  adminWarnings: string[];
  validationErrors?: string[];
  validationStatus?: string;
  provider: "openai" | "local";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeObservation(value: unknown): SiteHtmlObservation | null {
  if (!isRecord(value)) return null;

  return value as SiteHtmlObservation;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeBullets(values: string[], limit = 6) {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((value) => !containsSiteObservationPromotionalTerm(value))
    .slice(0, limit);
}

function buildLocalDescriptionDraft({
  siteName,
  sourceUrl,
  observation,
}: {
  siteName: string;
  sourceUrl: string;
  observation: SiteHtmlObservation;
}) {
  const title = observation.page_title || observation.h1 || siteName;
  const menuLabels = safeBullets(observation.observed_menu_labels, 10);
  const accountItems = safeBullets(observation.observed_account_features);
  const bettingItems = safeBullets(observation.observed_betting_features);
  const paymentItems = safeBullets(observation.observed_payment_flags);
  const noticeItems = safeBullets(observation.observed_notice_items);
  const footerItems = safeBullets(observation.observed_footer_text, 3);
  const lines = [
    `${siteName} 사이트 상세 설명 초안`,
    "",
    `조회 시점 기준 관리자가 제공한 공개 HTML과 스크린샷에서 관측된 정보를 바탕으로 ${siteName}의 화면 기록을 정리한 초안입니다. 화면에서 확인된 제목 계열은 "${title}"이며, 가입 또는 이용을 권유하기 위한 내용이 아닙니다.`,
    "",
    "관측된 화면 구성",
    menuLabels.length > 0
      ? `- 주요 메뉴: ${menuLabels.join(", ")}`
      : "- 주요 메뉴: HTML에서 명확한 메뉴 라벨을 추가 검수해야 합니다.",
    accountItems.length > 0
      ? `- 계정 관련 요소: ${accountItems.join(", ")}`
      : "- 계정 관련 요소: 공개 화면에서 별도 확인이 필요합니다.",
    bettingItems.length > 0
      ? `- 게임/경기 관련 요소: ${bettingItems.join(", ")}`
      : "- 게임/경기 관련 요소: 공개 화면에서 별도 확인이 필요합니다.",
    paymentItems.length > 0
      ? "- 결제 관련 요소: 공개 화면에 관련 라벨이 관측되었습니다."
      : "- 결제 관련 요소: 공개 화면에서 별도 확인이 필요합니다.",
    noticeItems.length > 0
      ? `- 공지/안내 요소: ${noticeItems.join(", ")}`
      : "- 공지/안내 요소: HTML에서 명확한 공지 영역을 추가 검수해야 합니다.",
    footerItems.length > 0
      ? `- 푸터/저작권: ${footerItems.join(" / ")}`
      : "- 푸터/저작권: 공개 화면 하단 정보는 추가 검수가 필요합니다.",
    "",
    "검수 메모",
    `- 원본 URL: ${sourceUrl}`,
    `- HTML 해시: ${observation.html_sha256}`,
    `- 화면 텍스트 해시: ${observation.visible_text_sha256}`,
    "- 외부 이미지 후보는 미리보기 후보로만 사용하고, 상세페이지에는 저장소에 확정된 이미지만 반영해야 합니다.",
  ];

  return lines.join("\n");
}

function buildObservationSummaryJson(observation: SiteHtmlObservation) {
  return {
    title: observation.page_title,
    h1: observation.h1,
    summary: observation.public_observation_summary,
    counts: {
      menu_labels: observation.observed_menu_labels.length,
      account_features: observation.observed_account_features.length,
      betting_features: observation.observed_betting_features.length,
      payment_flags: observation.observed_payment_flags.length,
      notices: observation.observed_notice_items.length,
      events: observation.observed_event_items.length,
      footer_items: observation.observed_footer_text.length,
      promotional_terms:
        observation.promotional_flags_json.found_terms?.length ?? 0,
    },
  };
}

function getObservationSourceTextChunks(observation: SiteHtmlObservation) {
  return [
    ...asStringArray(observation.observed_menu_labels),
    ...asStringArray(observation.observed_account_features),
    ...asStringArray(observation.observed_betting_features),
    ...asStringArray(observation.observed_payment_flags),
    ...asStringArray(observation.observed_notice_items),
    ...asStringArray(observation.observed_event_items),
    ...asStringArray(observation.observed_footer_text),
    ...asStringArray(observation.observed_badges),
    ...asStringArray(observation.image_candidates_json.image_alts),
  ];
}

async function callOpenAiDescription({
  apiKey,
  model,
  siteName,
  sourceUrl,
  observation,
  rewriteDraft,
}: {
  apiKey: string;
  model: string;
  siteName: string;
  sourceUrl: string;
  observation: SiteHtmlObservation;
  rewriteDraft?: string;
}) {
  const observationInput = JSON.stringify({
    siteName,
    sourceUrl,
    title: observation.page_title,
    h1: observation.h1,
    metaDescription: observation.meta_description,
    publicSummary: observation.public_observation_summary,
    menuLabels: asStringArray(observation.observed_menu_labels),
    accountFeatures: asStringArray(observation.observed_account_features),
    bettingFeatures: asStringArray(observation.observed_betting_features),
    paymentFlags: asStringArray(observation.observed_payment_flags),
    noticeItems: asStringArray(observation.observed_notice_items),
    eventItems: asStringArray(observation.observed_event_items),
    footerText: asStringArray(observation.observed_footer_text),
    promotionalFlags: observation.promotional_flags_json,
    excludedTerms: observation.excluded_terms_json,
    hashes: {
      html: observation.html_sha256,
      visibleText: observation.visible_text_sha256,
    },
  });
  const userPrompt = rewriteDraft
    ? [
        "아래 설명문은 원본 HTML 문장을 그대로 복사한 것으로 의심되는 부분이 있습니다. 원본 문구를 그대로 사용하지 말고, 조회 시점 기준 관측 정보 요약문으로 다시 작성하세요. 가입, 입금, 프로모션, 보너스, 추천 문구는 강조하지 마세요.",
        "",
        "기존 설명문:",
        rewriteDraft,
        "",
        "관측 데이터:",
        observationInput,
      ].join("\n")
    : observationInput;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "한국어 사이트 상세 설명 초안을 작성한다.",
                "추천, 홍보, 가입 유도, 이벤트 강조를 하지 않는다.",
                "입력 HTML에서 공개 화면 기준으로 관측된 사실만 쓴다.",
                "첫 문단에는 조회 시점 기준, 관리자가 제공한 공개 HTML과 스크린샷, 관측된 정보, 가입 또는 이용 권유가 아니라는 의미를 포함한다.",
                "promotional/excluded terms는 본문에서 강조하지 않는다.",
                "마크다운으로 작성하되 외부 이미지 URL을 삽입하지 않는다.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt,
            },
          ],
        },
      ],
      max_output_tokens: 2200,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        output_text?: string;
        output?: Array<{
          content?: Array<{ text?: string }>;
        }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "OpenAI 설명 생성에 실패했습니다.");
  }

  const outputText =
    payload?.output_text ??
    payload?.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ??
    "";

  if (!outputText) {
    throw new Error("OpenAI 응답에서 설명 초안을 찾지 못했습니다.");
  }

  return outputText;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as DescriptionRequest | null;
  const siteName = normalizeText(body?.siteName) || "대상 사이트";
  const sourceUrl = normalizeText(body?.sourceUrl);
  const observation = normalizeObservation(body?.observation);

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "원본 URL이 필요합니다." },
      { status: 400 },
    );
  }

  if (!observation) {
    return NextResponse.json(
      { error: "먼저 HTML 관측 정보를 추출해주세요." },
      { status: 400 },
    );
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiModel =
    process.env.OPENAI_SITE_DESCRIPTION_MODEL ||
    process.env.OPENAI_BLOG_PLANNER_MODEL ||
    "";
  const adminWarnings: string[] = [];
  let provider: DescriptionResponse["provider"] = "local";
  let aiDetailDescriptionMd = "";

  if (openaiApiKey && openaiModel) {
    try {
      aiDetailDescriptionMd = await callOpenAiDescription({
        apiKey: openaiApiKey,
        model: openaiModel,
        siteName,
        sourceUrl,
        observation,
      });
      provider = "openai";
    } catch (error) {
      adminWarnings.push(
        error instanceof Error
          ? `OpenAI 생성 실패: ${error.message}`
          : "OpenAI 생성 실패: 원인을 확인하지 못했습니다.",
      );
    }
  } else {
    adminWarnings.push(
      "OPENAI_API_KEY와 OPENAI_SITE_DESCRIPTION_MODEL이 없어 로컬 규칙 기반 초안을 생성했습니다.",
    );
  }

  if (!aiDetailDescriptionMd) {
    aiDetailDescriptionMd = buildLocalDescriptionDraft({
      siteName,
      sourceUrl,
      observation,
    });
  }

  aiDetailDescriptionMd = sanitizeObservationDescription(
    ensureObservationDisclosure(aiDetailDescriptionMd),
  );
  let validation = validateObservationDescriptionDraft({
    detailDescriptionMd: aiDetailDescriptionMd,
    sourceTextChunks: getObservationSourceTextChunks(observation),
  });

  if (
    provider === "openai" &&
    validation.status === "warning" &&
    validation.warnings.some((warning) =>
      warning.includes("원본 HTML의 긴 문장"),
    ) &&
    openaiApiKey &&
    openaiModel
  ) {
    try {
      aiDetailDescriptionMd = await callOpenAiDescription({
        apiKey: openaiApiKey,
        model: openaiModel,
        siteName,
        sourceUrl,
        observation,
        rewriteDraft: aiDetailDescriptionMd,
      });
      aiDetailDescriptionMd = sanitizeObservationDescription(
        ensureObservationDisclosure(aiDetailDescriptionMd),
      );
      validation = validateObservationDescriptionDraft({
        detailDescriptionMd: aiDetailDescriptionMd,
        sourceTextChunks: getObservationSourceTextChunks(observation),
      });
      adminWarnings.push(
        "원문 복사 의심 경고가 감지되어 초안을 1회 자동 재작성했습니다.",
      );
    } catch (error) {
      adminWarnings.push(
        error instanceof Error
          ? `원문 복사 의심 초안 자동 재작성 실패: ${error.message}`
          : "원문 복사 의심 초안 자동 재작성 실패: 원인을 확인하지 못했습니다.",
      );
    }
  }

  if (
    containsSiteObservationPromotionalTerm(
      aiDetailDescriptionMd.replace(observationDisclosureText, ""),
    )
  ) {
    adminWarnings.push(
      "초안에 이용 유도성 문구가 포함될 수 있습니다. 공개 저장 전 문맥을 검수하세요.",
    );
  }
  adminWarnings.push(...validation.warnings);

  return NextResponse.json({
    aiDetailDescriptionMd,
    aiObservationSummaryJson: {
      ...buildObservationSummaryJson(observation),
      validation_status: validation.status,
      validation_errors: validation.errors,
      admin_warnings: validation.warnings,
      prohibited_phrase_check: validation.prohibited_phrase_check,
    },
    adminWarnings,
    validationErrors: validation.errors,
    validationStatus: validation.status,
    provider,
  } satisfies DescriptionResponse);
}
