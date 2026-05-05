import { NextResponse } from "next/server";
import type { SiteHtmlObservation } from "@/app/data/site-html-observation";
import { containsSiteObservationPromotionalTerm } from "@/app/data/site-html-promotional-flags";
import { formatObservationDescriptionForPublic } from "@/app/data/public-site-description";
import {
  buildObservationDescriptionFallback,
  sanitizeObservationDescription,
  validateObservationDescriptionDraft,
  type ObservationDescriptionAiOutput,
  type ObservationDescriptionSite,
  type ObservationDescriptionSnapshot,
} from "@/app/data/site-observation-description";
import {
  getAdminSession,
  getBearerToken,
} from "@/app/api/admin/sites/_admin";
import {
  buildSiteObservationDescriptionPrompt,
  SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
  siteObservationDescriptionJsonSchema,
  siteObservationDescriptionSystemPrompt,
} from "@/prompts/site-observation-description-v1";

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

function buildLocalDescriptionDraft({
  siteName,
  sourceUrl,
  observation,
}: {
  siteName: string;
  sourceUrl: string;
  observation: SiteHtmlObservation;
}): ObservationDescriptionAiOutput {
  return buildObservationDescriptionFallback({
    site: buildPromptSite(siteName, sourceUrl),
    snapshot: buildPromptSnapshot({ sourceUrl, observation }),
  });
}

function buildPromptSite(
  siteName: string,
  sourceUrl: string,
): ObservationDescriptionSite {
  return {
    id: "manual-html-observation",
    name: siteName,
    url: sourceUrl || null,
  };
}

function buildPromptSnapshot({
  sourceUrl,
  observation,
}: {
  sourceUrl: string;
  observation: SiteHtmlObservation;
}): ObservationDescriptionSnapshot {
  return {
    id: "manual-html-observation",
    site_id: "manual-html-observation",
    source_url: sourceUrl || null,
    final_url: sourceUrl || null,
    collected_at: null,
    page_title: observation.page_title,
    meta_description: observation.meta_description,
    h1: observation.h1,
    observed_menu_labels: observation.observed_menu_labels,
    observed_account_features: observation.observed_account_features,
    observed_betting_features: observation.observed_betting_features,
    observed_payment_flags: observation.observed_payment_flags,
    observed_notice_items: observation.observed_notice_items,
    observed_event_items: observation.observed_event_items,
    observed_footer_text: observation.observed_footer_text,
    observed_badges: observation.observed_badges,
    image_candidates_json: observation.image_candidates_json,
    promotional_flags_json: observation.promotional_flags_json,
    excluded_terms_json: observation.excluded_terms_json,
    html_sha256: observation.html_sha256,
    visible_text_sha256: observation.visible_text_sha256,
    snapshot_status: "extracted",
  };
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
  site,
  snapshot,
  rewriteDraft,
}: {
  apiKey: string;
  model: string;
  site: ObservationDescriptionSite;
  snapshot: ObservationDescriptionSnapshot;
  rewriteDraft?: string;
}): Promise<ObservationDescriptionAiOutput> {
  const promptInput = buildSiteObservationDescriptionPrompt({
    site: {
      id: site.id,
      name: site.name,
      url: site.url,
    },
    snapshot: {
      id: snapshot.id,
      source_url: snapshot.source_url,
      final_url: snapshot.final_url,
      collected_at: snapshot.collected_at,
      page_title: snapshot.page_title,
      meta_description: snapshot.meta_description,
      h1: snapshot.h1,
      observed_menu_labels: asStringArray(snapshot.observed_menu_labels),
      observed_account_features: asStringArray(
        snapshot.observed_account_features,
      ),
      observed_betting_features: asStringArray(
        snapshot.observed_betting_features,
      ),
      observed_payment_flags: asStringArray(snapshot.observed_payment_flags),
      observed_notice_items: asStringArray(snapshot.observed_notice_items),
      observed_event_items: asStringArray(snapshot.observed_event_items),
      observed_footer_text: asStringArray(snapshot.observed_footer_text),
      observed_badges: asStringArray(snapshot.observed_badges),
      image_alt_texts: asStringArray(
        isRecord(snapshot.image_candidates_json)
          ? snapshot.image_candidates_json.image_alts
          : [],
      ),
      promotional_flags_json: isRecord(snapshot.promotional_flags_json)
        ? snapshot.promotional_flags_json
        : {},
      excluded_terms_json: asStringArray(snapshot.excluded_terms_json),
      html_sha256: snapshot.html_sha256,
      visible_text_sha256: snapshot.visible_text_sha256,
    },
  });
  const userPrompt = rewriteDraft
    ? [
        "아래 설명문은 원본 HTML 문장을 그대로 복사한 것으로 의심되는 부분이 있습니다. 원본 문구를 그대로 베끼지 말고, 사이트 화면을 보면서 실시간으로 메모하는 사람의 글처럼 다시 작성하세요.",
        "보고서, 분석문, 검증 리포트 톤은 피하세요. 친구한테 카톡으로 설명하는 정도의 '~요' 톤을 유지하세요.",
        "문장 끝은 '~네요', '~어요', '~이에요', '~죠?', '~습니다'를 골고루 섞되 같은 종결을 연속 두 문장에 쓰지 마세요. '~네요'는 전체 3회 이내입니다.",
        "고지문은 별도 컴포넌트에서 출력하므로 본문에 넣지 말고, 데이터가 충분하면 5~8문단과 600~1100자 범위로 작성하세요.",
        "page_title, meta_description, h1 같은 내부 필드명과 '문서 제목은', '메타 설명에는', '대표 제목 영역에는' 표현을 쓰지 마세요.",
        "메뉴 이름이나 빠른 버튼 항목은 bullet이 아니라 한 문장 안에 쉼표로 이어 쓰세요. 다만 이용이나 금전거래를 유도하는 항목은 직접 강조하지 말고 계정/거래/이벤트성 버튼처럼 흐려 쓰세요.",
        "사이트가 자기 자랑으로 써놓은 영역은 짧게 발췌할 수 있지만, 이용이나 금전거래를 유도하는 문구는 인용하지 마세요. 인용 뒤에는 사이트가 직접 쓴 문구라 그대로 믿긴 어렵다는 코멘트를 붙이세요.",
        "권유성, 홍보성, 이용 유도, 금전거래 유도 문구는 강조하지 마세요.",
        "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 '이 화면에서는 안 보여요' 정도로 짧게 언급하세요.",
        "공개 HTML, 조회 시점 기준, 스크린샷 표현은 Notice 컴포넌트에서 처리하므로 본문에 반복하지 마세요.",
        "이미지 alt, 메타 태그, viewport 같은 기술 용어는 본문에 노출하지 마세요.",
        "",
        "기존 설명문:",
        rewriteDraft,
        "",
        promptInput,
      ].join("\n")
    : promptInput;

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
              text: siteObservationDescriptionSystemPrompt,
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
      max_output_tokens: 3000,
      text: {
        format: {
          type: "json_schema",
          name: "site_observation_description",
          strict: true,
          schema: siteObservationDescriptionJsonSchema,
        },
      },
    }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getOpenAiErrorMessage(payload));
  }

  const outputText = extractOpenAiOutputText(payload);
  const jsonText = extractJsonObjectText(outputText);

  if (!jsonText) {
    throw new Error("OpenAI 응답에서 관측 설명 JSON을 찾지 못했습니다.");
  }

  return JSON.parse(jsonText);
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
    process.env.OPENAI_SITE_OBSERVATION_DESCRIPTION_MODEL ||
    process.env.OPENAI_SITE_DESCRIPTION_MODEL ||
    process.env.OPENAI_BLOG_PLANNER_MODEL ||
    "";
  const promptSite = buildPromptSite(siteName, sourceUrl);
  const promptSnapshot = buildPromptSnapshot({ sourceUrl, observation });
  const fallbackOutput = buildLocalDescriptionDraft({
    siteName,
    sourceUrl,
    observation,
  });
  const adminWarnings: string[] = [];
  let provider: DescriptionResponse["provider"] = "local";
  let model: string | null = null;
  let promptVersion: string | null = SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION;
  let aiOutput = fallbackOutput;

  if (openaiApiKey && openaiModel) {
    try {
      aiOutput = await callOpenAiDescription({
        apiKey: openaiApiKey,
        model: openaiModel,
        site: promptSite,
        snapshot: promptSnapshot,
      });
      provider = "openai";
      model = openaiModel;
    } catch (error) {
      adminWarnings.push(
        error instanceof Error
          ? `OpenAI 생성 실패: ${error.message}`
          : "OpenAI 생성 실패: 원인을 확인하지 못했습니다.",
      );
    }
  } else {
    adminWarnings.push(
      "OPENAI_API_KEY 또는 관측 설명 모델 환경변수가 없어 로컬 규칙 기반 초안을 생성했습니다.",
    );
  }

  adminWarnings.push(...aiOutput.admin_warnings);
  let aiDetailDescriptionMd = aiOutput.detail_description_md;

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
      aiOutput = await callOpenAiDescription({
        apiKey: openaiApiKey,
        model: openaiModel,
        site: promptSite,
        snapshot: promptSnapshot,
        rewriteDraft: aiDetailDescriptionMd,
      });
      provider = "openai";
      model = openaiModel;
      promptVersion = SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION;
      aiDetailDescriptionMd = aiOutput.detail_description_md;
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
  const finalAdminWarnings = uniqueStrings(adminWarnings);

  return NextResponse.json({
    aiDetailDescriptionMd,
    aiObservationSummaryJson: {
      ...buildObservationSummaryJson(observation),
      observation_summary: aiOutput.observation_summary,
      content_quality: aiOutput.content_quality,
      validation_status: validation.status,
      validation_errors: validation.errors,
      admin_warnings: finalAdminWarnings,
      prohibited_phrase_check: validation.prohibited_phrase_check,
      provider,
      model,
      prompt_version: promptVersion,
    },
    adminWarnings: finalAdminWarnings,
    validationErrors: validation.errors,
    validationStatus: validation.status,
    provider,
  } satisfies DescriptionResponse);
}

function extractOpenAiOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as Record<string, unknown>;

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = response.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];

      return content.map((part) => {
        if (!part || typeof part !== "object") return "";
        const record = part as Record<string, unknown>;
        return typeof record.text === "string" ? record.text : "";
      });
    })
    .join("\n")
    .trim();
}

function extractJsonObjectText(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    return candidate;
  }

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }

  return "";
}

function getOpenAiErrorMessage(payload: unknown) {
  const error = isRecord(payload) ? payload.error : null;

  if (!error || typeof error !== "object") {
    return "OpenAI API 요청에 실패했습니다.";
  }

  const errorRecord = error as Record<string, unknown>;
  const code = typeof errorRecord.code === "string" ? errorRecord.code : "";
  const type = typeof errorRecord.type === "string" ? errorRecord.type : "";
  const message =
    typeof errorRecord.message === "string" ? errorRecord.message : "";

  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return "OpenAI API 할당량이 부족합니다.";
  }

  return message
    ? `OpenAI API 요청에 실패했습니다: ${message}`
    : "OpenAI API 요청에 실패했습니다.";
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}
