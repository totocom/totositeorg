import { NextResponse } from "next/server";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";
import {
  asStringArray,
  generateObservationDescription,
  getImageAltTexts,
  type ObservationDescriptionAiOutput,
  type ObservationDescriptionGeneratorResult,
  type ObservationDescriptionSite,
  type ObservationDescriptionSnapshot,
  type ObservationDescriptionSnapshotUpdate,
} from "@/app/data/site-observation-description";
import {
  buildSiteObservationDescriptionPrompt,
  SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
  siteObservationDescriptionJsonSchema,
  siteObservationDescriptionSystemPrompt,
} from "@/prompts/site-observation-description-v1";

export const runtime = "nodejs";

type ObservationDescriptionContext = {
  params: Promise<{
    siteId: string;
  }>;
};

function getOpenAiModel() {
  return (
    process.env.OPENAI_SITE_OBSERVATION_DESCRIPTION_MODEL ||
    process.env.OPENAI_SITE_DESCRIPTION_MODEL ||
    process.env.OPENAI_BLOG_PLANNER_MODEL ||
    ""
  );
}

async function generateObservationDescriptionWithProvider({
  site,
  snapshot,
  fallback,
}: {
  site: ObservationDescriptionSite;
  snapshot: ObservationDescriptionSnapshot;
  fallback: ObservationDescriptionAiOutput;
}): Promise<ObservationDescriptionGeneratorResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAiModel();

  if (!apiKey || !model) {
    return {
      output: fallback,
      provider: "local",
      model: null,
      promptVersion: SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
      adminWarnings: [
        "OPENAI_API_KEY 또는 관측 설명 모델 환경변수가 없어 로컬 규칙 기반 초안을 저장했습니다.",
      ],
    };
  }

  return {
    output: await callOpenAiObservationDescription({
      apiKey,
      model,
      site,
      snapshot,
    }),
    provider: "openai",
    model,
    promptVersion: SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
  };
}

async function rewriteObservationDescriptionWithProvider({
  site,
  snapshot,
  draft,
}: {
  site: ObservationDescriptionSite;
  snapshot: ObservationDescriptionSnapshot;
  draft: ObservationDescriptionAiOutput;
  fallback: ObservationDescriptionAiOutput;
}): Promise<ObservationDescriptionGeneratorResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAiModel();

  if (!apiKey || !model) {
    return {
      output: draft,
      provider: "local",
      model: null,
      promptVersion: SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
      adminWarnings: [
        "원문 복사 의심 경고가 있었지만 OpenAI 환경변수가 없어 자동 재작성을 건너뛰었습니다.",
      ],
    };
  }

  return {
    output: await callOpenAiObservationDescription({
      apiKey,
      model,
      site,
      snapshot,
      rewriteDraft: draft.detail_description_md,
    }),
    provider: "openai",
    model,
    promptVersion: SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION,
  };
}

async function callOpenAiObservationDescription({
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
}) {
  const promptInput = buildSiteObservationDescriptionPrompt({
    site,
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
      image_alt_texts: getImageAltTexts(snapshot),
      promotional_flags_json: asRecord(snapshot.promotional_flags_json),
      excluded_terms_json: asStringArray(snapshot.excluded_terms_json),
      html_sha256: snapshot.html_sha256,
      visible_text_sha256: snapshot.visible_text_sha256,
    },
  });
  const userPrompt = rewriteDraft
    ? [
        "아래 설명문은 원본 HTML 문장을 그대로 복사한 것으로 의심되는 부분이 있습니다. 원본 문구를 그대로 사용하지 말고, sites.description에 저장할 자연스러운 사이트 설명문으로 다시 작성하세요. 가입, 입금, 프로모션, 보너스, 추천 문구는 강조하지 마세요.",
        "세부 메뉴, 게임 분류, footer, 이미지 alt, 배지, 긴 URL은 설명 본문에 나열하지 말고 observation_summary에만 정리하세요.",
        "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않았다고 짧게 언급하세요.",
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

export async function POST(
  request: Request,
  context: ObservationDescriptionContext,
) {
  try {
    const token = getBearerToken(request);
    const adminSession = await getAdminSession(token);

    if (!adminSession) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      );
    }

    const { siteId } = await context.params;
    const body = await request.json().catch(() => null);
    const supabase = getServiceClient();
    const result = await generateObservationDescription({
      adminSession,
      siteId,
      body,
      getSite: async (targetSiteId) => {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name, url")
          .eq("id", targetSiteId)
          .maybeSingle();

        if (error) {
          return {
            site: null,
            error: "사이트 정보를 조회하지 못했습니다.",
          };
        }

        return {
          site: data
            ? {
                id: String(data.id),
                name: String(data.name),
                url: typeof data.url === "string" ? data.url : null,
              }
            : null,
        };
      },
      getSnapshot: async (snapshotId) => {
        const { data, error } = await supabase
          .from("site_crawl_snapshots")
          .select(
            [
              "id",
              "site_id",
              "source_url",
              "final_url",
              "collected_at",
              "page_title",
              "meta_description",
              "h1",
              "observed_menu_labels",
              "observed_account_features",
              "observed_betting_features",
              "observed_payment_flags",
              "observed_notice_items",
              "observed_event_items",
              "observed_footer_text",
              "observed_badges",
              "image_candidates_json",
              "promotional_flags_json",
              "excluded_terms_json",
              "html_sha256",
              "visible_text_sha256",
              "snapshot_status",
            ].join(", "),
          )
          .eq("id", snapshotId)
          .maybeSingle();

        if (error) {
          return {
            snapshot: null,
            error: "관측 snapshot을 조회하지 못했습니다.",
          };
        }

        const row = data as Record<string, unknown> | null;

        return {
          snapshot: row
            ? ({
                id: String(row.id),
                site_id: String(row.site_id),
                source_url:
                  typeof row.source_url === "string"
                    ? row.source_url
                    : null,
                final_url:
                  typeof row.final_url === "string" ? row.final_url : null,
                collected_at:
                  typeof row.collected_at === "string"
                    ? row.collected_at
                    : null,
                page_title:
                  typeof row.page_title === "string" ? row.page_title : null,
                meta_description:
                  typeof row.meta_description === "string"
                    ? row.meta_description
                    : null,
                h1: typeof row.h1 === "string" ? row.h1 : null,
                observed_menu_labels: row.observed_menu_labels,
                observed_account_features: row.observed_account_features,
                observed_betting_features: row.observed_betting_features,
                observed_payment_flags: row.observed_payment_flags,
                observed_notice_items: row.observed_notice_items,
                observed_event_items: row.observed_event_items,
                observed_footer_text: row.observed_footer_text,
                observed_badges: row.observed_badges,
                image_candidates_json: row.image_candidates_json,
                promotional_flags_json: row.promotional_flags_json,
                excluded_terms_json: row.excluded_terms_json,
                html_sha256:
                  typeof row.html_sha256 === "string"
                    ? row.html_sha256
                    : null,
                visible_text_sha256:
                  typeof row.visible_text_sha256 === "string"
                    ? row.visible_text_sha256
                    : null,
                snapshot_status:
                  typeof row.snapshot_status === "string"
                    ? row.snapshot_status
                    : undefined,
              } satisfies ObservationDescriptionSnapshot)
            : null,
        };
      },
      generateDescription: generateObservationDescriptionWithProvider,
      rewriteDescription: rewriteObservationDescriptionWithProvider,
      updateSnapshot: async (
        snapshotId,
        values: ObservationDescriptionSnapshotUpdate,
      ) => {
        const { error } = await supabase
          .from("site_crawl_snapshots")
          .update(values)
          .eq("id", snapshotId);

        return {
          error: error?.message,
        };
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "관측 설명 초안 생성 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
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
  const error = asRecord(payload).error;

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

  return message ? `OpenAI API 요청에 실패했습니다: ${message}` : "OpenAI API 요청에 실패했습니다.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
