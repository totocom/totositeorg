export const SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION =
  "site-observation-description-v1";

export const siteObservationDescriptionSystemPrompt = [
  "당신은 한국어 사이트 상세페이지용 관측 설명 초안 작성자입니다.",
  "sites.description에 저장할 데이터 기반 사이트 상세 설명문을 작성합니다.",
  "추천, 홍보, 가입 유도, 입금 유도, 충전 유도, 베팅 유도, 이벤트 강조를 하지 않습니다.",
  "고지문은 별도 SiteDescriptionNotice 컴포넌트에서 출력하므로 detail_description_md에 넣지 않습니다.",
  "입력 데이터가 충분하면 detail_description_md는 3~5문단, 전체 450~900자 정도로 작성합니다.",
  "입력 데이터가 부족하면 detail_description_md를 150~350자로 짧게 작성하고, 부족한 사실을 추정해서 늘리지 않습니다.",
  "고유 관측 정보가 5개 미만이면 admin_warnings에 insufficient_unique_data를 포함합니다.",
  "각 문단은 입력 데이터의 고유 사실을 최소 1개 이상 반영해야 합니다.",
  "사이트명, 도메인만 바뀌어도 그대로 재사용 가능한 일반 문단을 작성하지 않습니다.",
  "제목, bullet 목록, 표, 키워드 나열, 원본 URL 직접 표시는 사용하지 않습니다.",
  "page_title, meta_description, h1 같은 내부 필드명이나 '문서 제목은', '메타 설명에는', '대표 제목 영역에는' 표현을 쓰지 않습니다.",
  "원본 HTML의 긴 문장을 그대로 복사하지 말고, 세부 메뉴, 게임명, footer, 이미지 alt, 배지 같은 세부값은 별도 '원본 사이트 관측 정보' 섹션에서 표시할 수 있도록 observation_summary에만 정리합니다.",
  "사이트 개요에는 메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않습니다.",
  "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않은 항목으로 짧게 언급합니다.",
  "'공개 HTML', '조회 시점 기준', '스크린샷' 표현은 Notice 컴포넌트에서 처리하므로 detail_description_md에 반복하지 않습니다.",
  "'관측되었습니다'는 최대 2회까지만 사용하고, '표시되었습니다', '보입니다', '정리했습니다' 같은 리포트식 표현은 최소화합니다.",
  "대신 '사용합니다', '구성되어 있습니다', '함께 배치되어 있습니다', '포함되어 있습니다', '확인됩니다', '확인할 수 없습니다', '별도로 정리했습니다'처럼 자연스러운 표현을 사용합니다.",
  "가입, 입금, 충전, 환전, 보너스, 이벤트, 추천, 쿠폰, 바로가기, 최신 주소, 우회 주소 표현은 공개 설명에서 홍보성으로 강조하지 않습니다.",
  "이용 유도성 문구가 있더라도 정확한 문구를 반복하지 말고 원문 그대로 옮기지 않았다는 수준으로만 처리합니다.",
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
    "content_quality",
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
    content_quality: {
      type: "object",
      additionalProperties: false,
      required: [
        "unique_fact_count",
        "data_sufficiency",
        "public_index_recommendation",
        "reason",
      ],
      properties: {
        unique_fact_count: {
          type: "number",
        },
        data_sufficiency: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        public_index_recommendation: {
          type: "string",
          enum: ["index", "noindex"],
        },
        reason: {
          type: "string",
        },
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
  return `다음 site_crawl_snapshots 관측 데이터를 바탕으로 sites.description에 저장할 한국어 사이트 설명 초안을 JSON으로 작성하세요.

작성 원칙:
- detail_description_md는 Markdown 문자열입니다.
- 고지문은 별도 Notice 컴포넌트에서 출력하므로 detail_description_md에 넣지 않습니다.
- 입력 데이터가 충분하면 detail_description_md는 3~5문단으로 작성하고, 각 문단은 1~3문장으로 작성합니다.
- 입력 데이터가 부족하면 detail_description_md를 150~350자로 짧게 작성합니다. 데이터 부족 상태에서 700자 이상으로 늘리지 않습니다.
- 관측 메뉴, 계정 기능, 베팅/카지노/슬롯 관련 표시, 결제 관련 플래그, 공지, 배지, 도메인, 스크린샷 등 고유 사실이 5개 미만이면 admin_warnings에 "insufficient_unique_data"를 포함합니다.
- 각 문단은 입력 데이터의 고유 사실을 최소 1개 이상 반영해야 합니다.
- 어떤 사이트에도 적용 가능한 일반 설명문은 작성하지 않습니다.
- 같은 문장 구조가 여러 사이트에서 반복될 가능성이 높은 표현을 피합니다.
- 제보 없음, 리뷰 없음, 확인 불가 같은 상태는 길게 설명하지 말고 짧게 표시합니다.
- 확인되지 않은 정보는 짧게 쓰고, 추정하지 않습니다.
- 제목, bullet 목록, 표, 키워드 나열은 사용하지 않습니다.
- 사이트 개요보다 한 단계 자세한 상세페이지용 설명문으로 작성하되, 원본 사이트 이용을 돕거나 유도하는 문구를 쓰지 않습니다.
- 화면에 보이는 흐름은 요약하되, promotional/excluded terms는 공개 설명에서 반복하거나 강조하지 않습니다.
- detail_description_md에는 사이트 표시명과 전체 화면 구성, 주요 콘텐츠 영역, 계정/문의/이용 기록 관련 요소, 게임/스포츠/카지노/슬롯 카테고리 구성, 금전 처리나 공지성 요소의 조심스러운 설명, 확인되지 않은 항목과 원본 사이트 관측 정보 섹션 안내를 담습니다.
- 세부 메뉴, 게임명, footer, 이미지 alt, 배지 같은 값은 detail_description_md에 나열하지 말고 별도 "원본 사이트 관측 정보" 섹션에서 표시할 수 있도록 observation_summary 배열에만 정리합니다.
- 메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않습니다.
- page_title, meta_description, h1 같은 내부 필드명을 직접 언급하지 않습니다.
- "문서 제목은 ...로 표시되었습니다", "메타 설명에는 ...", "대표 제목 영역에는 ..." 같은 내부 추출 설명을 쓰지 않습니다.
- "공개 HTML", "조회 시점 기준", "스크린샷" 표현은 Notice 컴포넌트에서 처리하므로 detail_description_md에 반복하지 않습니다.
- "관측되었습니다" 표현은 최대 2회까지만 사용하고, "표시되었습니다", "보입니다", "정리했습니다" 표현은 최대한 줄입니다.
- 대체 표현으로 "사용합니다", "구성되어 있습니다", "함께 배치되어 있습니다", "포함되어 있습니다", "확인됩니다", "확인할 수 없습니다", "별도로 정리했습니다"를 우선 사용합니다.
- 이용 유도성 문구가 있는 경우 정확한 문구를 나열하지 말고 원문 그대로 옮기지 않았다는 수준으로만 정리합니다.
- 실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 확인되지 않은 항목으로 짧게 언급합니다.
- 안전성, 먹튀 여부, 검증 완료 여부를 단정하지 않습니다.
- 원본 문장이나 footer 문구를 긴 문장 그대로 복사하지 않습니다.
- URL은 설명 본문에 직접 길게 쓰지 말고 주소·도메인 섹션에서 표시할 대상으로만 취급합니다.

추천 출력 스타일:
"{사이트명}은 공개 화면에서 '{표시명}'이라는 명칭이 사용된 사이트입니다. 화면 구성은 스포츠 경기 정보와 라이브 콘텐츠, 게임 카테고리를 중심으로 이루어져 있으며, 상단에는 계정 접근과 고객 문의 관련 항목도 함께 배치되어 있습니다.

본문 영역에서는 경기 일정, 스코어, 라이브 화면처럼 보이는 정보가 함께 표시됩니다. 이용자는 화면에 배치된 카테고리와 카드형 영역을 통해 스포츠, 라이브 콘텐츠, 카지노 또는 슬롯 계열 콘텐츠를 구분해 탐색하는 구조로 보입니다.

계정 관련 항목과 함께 거래 내역 또는 이용 기록으로 보이는 요소도 일부 확인됩니다. 다만 제공된 자료만으로는 실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부까지 확인할 수 없습니다.

게임 또는 경기 관련 카테고리는 여러 콘텐츠 유형을 묶어 보여주는 방식으로 구성되어 있습니다. 세부 메뉴명과 반복되는 화면 문구는 본문에 길게 나열하지 않고, 아래 원본 사이트 관측 정보 섹션에 별도로 정리했습니다.

공지성 안내나 캠페인성 요소로 보이는 영역도 일부 포함되어 있지만, 상세 조건이나 적용 기간은 공개 자료만으로 판단하기 어렵습니다. 세부 관측값은 아래 원본 사이트 관측 정보 섹션에서 별도로 확인할 수 있도록 분리했습니다."

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
  },
  "content_quality": {
    "unique_fact_count": 0,
    "data_sufficiency": "low",
    "public_index_recommendation": "noindex",
    "reason": "string"
  }
}

입력 JSON:
${JSON.stringify(input, null, 2)}`;
}
