export const SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION =
  "site-observation-description-v1";

export const siteObservationDescriptionSystemPrompt = [
  "당신은 한국어 사이트 상세페이지용 관측 설명 초안 작성자입니다.",
  "추천, 홍보, 가입 유도, 충전 유도, 베팅 유도, 이벤트 강조를 하지 않는 정보 리포트 문체로 작성합니다.",
  "detail_description_md의 첫 문단에는 조회 시점 기준, 관리자가 제공한 공개 HTML과 스크린샷, 관측된 정보, 가입 또는 이용 권유가 아니라는 의미를 반드시 포함합니다.",
  "원본 HTML의 긴 문장을 그대로 복사하지 말고, 관측된 메뉴, 화면 요소, footer, badge, 이미지 alt를 요약합니다.",
  "가입, 입금, 충전, 환전, 보너스, 이벤트, 추천, 쿠폰, 바로가기, 최신 주소, 우회 주소 표현은 공개 설명에서 강조하지 않습니다.",
  "이용 유도성 문구가 관측되었더라도 정확한 문구를 반복하지 말고 '이용 유도성 문구가 관측되어 공개 설명에서는 제외했습니다' 정도로만 처리합니다.",
  "안전하다, 먹튀 없음, 검증 완료처럼 단정하거나 보증하는 표현을 사용하지 않습니다.",
  "Cloudflare, WHOIS 비공개, IP 공유 같은 기술 신호만으로 위험하다고 단정하지 않습니다.",
  "JSON 객체만 출력하고 Markdown 코드펜스, 설명 문장, 주석을 출력하지 않습니다.",
].join("\n");

export const siteObservationDescriptionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "detail_description_md",
    "observation_summary",
    "admin_warnings",
    "prohibited_phrase_check",
  ],
  properties: {
    detail_description_md: {
      type: "string",
    },
    observation_summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "page_title",
        "h1",
        "menu_summary",
        "account_feature_summary",
        "betting_feature_summary",
        "payment_feature_summary",
        "notice_summary",
        "footer_summary",
        "excluded_promotional_terms",
      ],
      properties: {
        page_title: {
          type: ["string", "null"],
        },
        h1: {
          type: ["string", "null"],
        },
        menu_summary: {
          type: "array",
          items: { type: "string" },
        },
        account_feature_summary: {
          type: "array",
          items: { type: "string" },
        },
        betting_feature_summary: {
          type: "array",
          items: { type: "string" },
        },
        payment_feature_summary: {
          type: "array",
          items: { type: "string" },
        },
        notice_summary: {
          type: "array",
          items: { type: "string" },
        },
        footer_summary: {
          type: "array",
          items: { type: "string" },
        },
        excluded_promotional_terms: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    admin_warnings: {
      type: "array",
      items: { type: "string" },
    },
    prohibited_phrase_check: {
      type: "object",
      additionalProperties: false,
      required: [
        "contains_signup_cta",
        "contains_bonus_or_event_promo",
        "contains_recommendation",
        "contains_absolute_safety_claim",
        "contains_access_facilitation",
      ],
      properties: {
        contains_signup_cta: { type: "boolean" },
        contains_bonus_or_event_promo: { type: "boolean" },
        contains_recommendation: { type: "boolean" },
        contains_absolute_safety_claim: { type: "boolean" },
        contains_access_facilitation: { type: "boolean" },
      },
    },
  },
} as const;

export type SiteObservationDescriptionPromptInput = {
  site: {
    id: string;
    name: string;
    url: string | null;
  };
  snapshot: {
    id: string;
    source_url: string | null;
    final_url: string | null;
    collected_at: string | null;
    page_title: string | null;
    meta_description: string | null;
    h1: string | null;
    observed_menu_labels: string[];
    observed_account_features: string[];
    observed_betting_features: string[];
    observed_payment_flags: string[];
    observed_notice_items: string[];
    observed_event_items: string[];
    observed_footer_text: string[];
    observed_badges: string[];
    image_alt_texts: string[];
    promotional_flags_json: Record<string, unknown>;
    excluded_terms_json: string[];
    html_sha256: string | null;
    visible_text_sha256: string | null;
  };
};

export function buildSiteObservationDescriptionPrompt(
  input: SiteObservationDescriptionPromptInput,
) {
  return `다음 site_crawl_snapshots 관측 데이터를 바탕으로 사이트 상세페이지용 한국어 설명 초안을 JSON으로 작성하세요.

작성 원칙:
- detail_description_md는 Markdown 문자열입니다.
- 첫 문단에 조회 시점 기준, 관리자가 제공한 공개 HTML과 스크린샷, 관측된 정보, 가입 또는 이용 권유가 아니라는 의미를 반드시 포함합니다.
- 원본 사이트 이용을 돕거나 유도하는 문구를 쓰지 않습니다.
- 관측된 화면 구조는 요약하되, promotional/excluded terms는 공개 설명에서 반복하거나 강조하지 않습니다.
- 이용 유도성 문구가 관측된 경우 정확한 문구를 나열하지 말고 "이용 유도성 문구가 관측되어 공개 설명에서는 제외했습니다"라고만 정리합니다.
- 안전성, 먹튀 여부, 검증 완료 여부를 단정하지 않습니다.
- 원본 문장이나 footer 문구를 긴 문장 그대로 복사하지 않습니다.

출력 JSON:
{
  "detail_description_md": "string",
  "observation_summary": {
    "page_title": "string|null",
    "h1": "string|null",
    "menu_summary": ["string"],
    "account_feature_summary": ["string"],
    "betting_feature_summary": ["string"],
    "payment_feature_summary": ["string"],
    "notice_summary": ["string"],
    "footer_summary": ["string"],
    "excluded_promotional_terms": ["string"]
  },
  "admin_warnings": ["string"],
  "prohibited_phrase_check": {
    "contains_signup_cta": false,
    "contains_bonus_or_event_promo": false,
    "contains_recommendation": false,
    "contains_absolute_safety_claim": false,
    "contains_access_facilitation": false
  }
}

입력 JSON:
${JSON.stringify(input, null, 2)}`;
}
