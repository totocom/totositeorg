import { NextResponse } from "next/server";
import type { SiteHtmlObservation } from "@/app/data/site-html-observation";
import { containsSiteObservationPromotionalTerm } from "@/app/data/site-html-promotional-flags";
import { formatObservationDescriptionForPublic } from "@/app/data/public-site-description";
import {
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
      ? `${siteSubject}는 공개 화면에서 "${displayName}"이라는 이름을 사용하는 사이트입니다.`
      : `${siteSubject}는 사이트 식별명과 주요 화면 흐름을 함께 사용하는 사이트입니다.`;
  const categorySentence =
    bettingItems.length > 0
      ? "전체 화면은 스포츠 경기 정보, 카지노 또는 슬롯 계열 콘텐츠, 라이브 콘텐츠로 보이는 영역을 함께 탐색하는 구조에 가깝습니다. 화면은 여러 기능을 한 페이지 안에서 구분해 보여주는 편입니다."
      : "전체 화면은 사이트 식별 영역, 계정 관련 메뉴, 문의 또는 고객지원 요소를 중심으로 탐색하는 구조에 가깝습니다. 화면은 여러 기능을 한 페이지 안에서 구분해 보여주는 편입니다.";
  const mainContentSentence =
    bettingItems.length > 0
      ? "본문에는 콘텐츠를 구분해 보여주는 카드형 영역과 카테고리 이동 요소가 함께 배치되어 있습니다. 이용자는 화면의 구획을 따라 스포츠, 라이브 콘텐츠, 게임성 콘텐츠를 나누어 살펴보는 흐름으로 이해할 수 있습니다."
      : "본문에는 여러 안내 영역과 화면 전환 요소가 함께 배치되어 있습니다. 이용자는 상단 식별 영역과 본문 구획을 따라 주요 메뉴와 고객지원 흐름을 구분해 살펴보는 구조로 이해할 수 있습니다.";
  const accountSentence =
    accountItems.length > 0
      ? "계정 접근, 문의, 이용 기록과 관련된 요소도 일부 확인됩니다. 다만 화면에 보이는 라벨만으로 실제 계정 생성 절차나 본인 확인 방식, 이용 조건이 어떻게 적용되는지는 판단하기 어렵습니다."
      : "계정이나 문의 흐름과 관련된 세부 절차는 제공된 자료만으로 충분히 확인되지 않습니다. 실제 계정 생성 절차, 본인 확인 방식, 이용 조건은 별도 검토가 필요한 항목입니다.";
  const categoryDetailSentence =
    bettingItems.length > 0
      ? "게임 또는 경기 관련 카테고리는 여러 성격의 콘텐츠를 묶어 보여주는 방식으로 구성되어 있습니다. 세부 메뉴명과 개별 게임명은 본문에서 길게 나열하지 않고, 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있도록 분리했습니다."
      : "세부 메뉴는 계정, 문의, 화면 이동 항목을 중심으로 정리할 수 있습니다. 반복되는 메뉴명과 하단 문구는 본문에 길게 나열하지 않고, 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있도록 분리했습니다.";
  const paymentRecordSentence =
    paymentItems.length > 0 || accountItems.length > 0
      ? "금전 처리나 이용 내역과 관련된 항목으로 해석될 수 있는 요소가 일부 포함되어 있습니다. 실제 결제 방식, 본인 확인 절차, 접근 제한 여부, 세부 이용 조건은 제공된 자료만으로 확인되지 않습니다."
      : "실제 결제 방식, 본인 확인 절차, 접근 제한 여부, 세부 이용 조건은 제공된 자료만으로 확인되지 않습니다. 공지성 안내나 캠페인성 영역이 있더라도 적용 조건과 기간은 별도 자료 없이는 단정하기 어렵습니다.";
  const paragraphs = [
    `${displayNameSentence} ${categorySentence}`,
    mainContentSentence,
    accountSentence,
    categoryDetailSentence,
    `${paymentRecordSentence} 세부 관측값은 상세 설명 본문에 반복하지 않고 원본 사이트 관측 정보 섹션에 남겨, 관리자가 화면 구성과 저장된 원문 자료를 함께 검토할 수 있게 했습니다.`,
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
        "4~6문단, 각 문단 2~3문장, 전체 700~1,100자 정도로 자연스럽게 작성하고 제목이나 bullet 목록은 사용하지 마세요.",
        "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지, 긴 URL은 설명 본문에 나열하지 마세요.",
        "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않았다고 짧게 언급하세요.",
        "고지문은 별도 컴포넌트에서 출력하므로 공개 HTML, 조회 시점 기준, 스크린샷 표현은 본문에 반복하지 마세요.",
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
                "입력 자료에 표시된 정보를 상세페이지 본문으로 해석 중심 요약한다.",
                "고지문은 별도 컴포넌트에서 출력하므로 본문에 넣지 않는다.",
                "4~6문단, 각 문단 2~3문장, 전체 700~1,100자 정도로 작성한다.",
                "제목, bullet 목록, 표, 키워드 나열은 사용하지 않는다.",
                "page_title, meta_description, h1 같은 내부 필드명이나 '문서 제목은', '메타 설명에는', '대표 제목 영역에는' 표현을 쓰지 않는다.",
                "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지, 긴 URL은 설명 본문에 나열하지 않고 원본 사이트 관측 정보 섹션에서 다룰 값으로 남긴다.",
                "메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않는다.",
                "'관측되었습니다'는 최대 2회까지만 사용하고, '공개 HTML', '조회 시점 기준', '스크린샷' 표현은 본문에 반복하지 않는다.",
                "'구성 요소', '문구가 확인되었습니다', '배치된 형태로 보입니다'처럼 AI 리포트처럼 보이는 표현은 최소화한다.",
                "대신 '확인됩니다', '표시됩니다', '사용되었습니다', '구성되어 있습니다', '함께 보입니다', '따로 정리했습니다'를 우선 사용한다.",
                "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않은 항목으로 짧게 언급한다.",
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

  const formattedDescription = formatObservationDescriptionForPublic(
    aiDetailDescriptionMd,
  );
  aiDetailDescriptionMd = sanitizeObservationDescription(
    formattedDescription.description,
  );
  adminWarnings.push(...formattedDescription.warnings);
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
      const formattedRewriteDescription = formatObservationDescriptionForPublic(
        aiDetailDescriptionMd,
      );
      aiDetailDescriptionMd = sanitizeObservationDescription(
        formattedRewriteDescription.description,
      );
      adminWarnings.push(...formattedRewriteDescription.warnings);
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
    containsSiteObservationPromotionalTerm(aiDetailDescriptionMd)
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
