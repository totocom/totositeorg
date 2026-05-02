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
  observation,
}: {
  siteName: string;
  observation: SiteHtmlObservation;
}) {
  const displayName =
    safeBullets([observation.h1 || observation.page_title || siteName], 1)[0] ||
    siteName;
  const siteSubject = siteName.endsWith("사이트") ? siteName : `${siteName} 사이트`;
  const accountItems = safeBullets(observation.observed_account_features);
  const bettingItems = safeBullets(observation.observed_betting_features);
  const paymentItems = safeBullets(observation.observed_payment_flags);
  const displayNameSentence =
    displayName && displayName !== siteName
      ? `${siteSubject}는 공개 화면에서 "${displayName}"이라는 표시명이 사용된 것으로 확인됩니다.`
      : `${siteSubject}는 공개 화면에서 사이트 식별명과 주요 화면 흐름이 함께 확인됩니다.`;
  const gameTypeSentence =
    bettingItems.length > 0
      ? "스포츠와 카지노·슬롯 계열처럼 게임 유형을 구분하는 흐름도 함께 보이지만, 세부 분류명은 본문에 나열하지 않았습니다."
      : "게임 유형으로 보이는 항목은 세부값을 본문에 나열하지 않고 별도 관측 정보로 분리했습니다.";
  const paymentRecordSentence =
    paymentItems.length > 0 || accountItems.length > 0
      ? "일부 영역에서는 금전 처리나 이용 기록과 관련된 요소도 확인되지만, 실제 처리 방식으로 해석하지 않았습니다."
      : "금전 처리나 이용 기록과 관련된 실제 절차는 제공된 화면만으로 판단하지 않았습니다.";
  const paragraphs = [
    observationDisclosureText,
    `${displayNameSentence} 주요 화면은 게임 유형, 계정 관련 메뉴, 이용 내역으로 보이는 항목을 중심으로 구성되어 있습니다. ${gameTypeSentence}`,
    `상단과 주요 메뉴 영역에는 화면 이동 항목과 계정 이용과 관련된 메뉴가 함께 보입니다. ${paymentRecordSentence}`,
    "다만 제공된 HTML과 스크린샷만으로는 실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부까지 확인할 수 없습니다. 세부 메뉴와 화면 구성은 아래 원본 사이트 관측 정보 섹션에 별도로 정리했습니다.",
  ];

  return paragraphs.join("\n\n");
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
        "아래 설명문은 원본 HTML 문장을 그대로 복사한 것으로 의심되는 부분이 있습니다. 원본 문구를 그대로 사용하지 말고, sites.description에 저장할 자연스러운 사이트 설명문으로 다시 작성하세요. 가입, 입금, 프로모션, 보너스, 추천 문구는 강조하지 마세요.",
        "3~4문단, 각 문단 2~3문장, 전체 400~700자 정도로 자연스럽게 작성하고 제목이나 bullet 목록은 사용하지 마세요.",
        "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지, 긴 URL은 설명 본문에 나열하지 마세요.",
        "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않았다고 짧게 언급하세요.",
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
                "한국어 사이트 상세 설명 초안을 sites.description에 저장할 자연스러운 설명문으로 작성한다.",
                "추천, 홍보, 가입 유도, 입금 유도, 이벤트 강조를 하지 않는다.",
                "입력 HTML과 스크린샷에 표시된 정보만 짧게 요약한다.",
                "첫 문단에는 '이 설명은 조회 시점 기준 관리자가 제공한 공개 HTML과 스크린샷을 바탕으로 작성되었습니다. 화면에 표시된 정보만 요약한 것이며, 가입이나 이용을 권유하는 내용은 아닙니다.' 고지를 포함한다.",
                "3~4문단, 각 문단 2~3문장, 전체 400~700자 정도로 작성한다.",
                "제목, bullet 목록, 표, 키워드 나열은 사용하지 않는다.",
                "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지, 긴 URL은 설명 본문에 나열하지 않고 원본 사이트 관측 정보 섹션에서 다룰 값으로 남긴다.",
                "메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않는다.",
                "'관측되었습니다'는 최대 2회까지만 사용하고, '공개 화면', '공개 HTML', '조회 시점 기준' 표현도 반복하지 않는다.",
                "'구성 요소', '문구가 확인되었습니다', '배치된 형태로 보입니다'처럼 AI 리포트처럼 보이는 표현은 최소화한다.",
                "대신 '확인됩니다', '표시됩니다', '사용되었습니다', '구성되어 있습니다', '함께 보입니다', '따로 정리했습니다'를 우선 사용한다.",
                "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 제공된 HTML과 스크린샷만으로 확인되지 않는다고 짧게 언급한다.",
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
