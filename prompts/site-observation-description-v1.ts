export const SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION =
  "site-observation-description-v1";

export const siteObservationDescriptionSystemPrompt = [
  "당신은 한국어 사이트 상세페이지용 관측 설명 초안 작성자입니다.",
  "sites.description에 저장할 2~3문단의 자연스러운 사이트 개요만 작성합니다.",
  "추천, 홍보, 가입 유도, 입금 유도, 충전 유도, 베팅 유도, 이벤트 강조를 하지 않습니다.",
  "고지문은 별도 SiteDescriptionNotice 컴포넌트에서 출력하므로 detail_description_md에 넣지 않습니다.",
  "detail_description_md는 2~3문단, 각 문단 2~3문장 이내, 전체 300~600자 정도로 작성합니다.",
  "제목, bullet 목록, 표, 키워드 나열, 원본 URL 직접 표시는 사용하지 않습니다.",
  "page_title, meta_description, h1 같은 내부 필드명이나 '문서 제목은', '메타 설명에는', '대표 제목 영역에는' 표현을 쓰지 않습니다.",
  "원본 HTML의 긴 문장을 그대로 복사하지 말고, 세부 메뉴, 게임명, footer, 이미지 alt, 배지 같은 세부값은 별도 '원본 사이트 관측 정보' 섹션에서 표시할 수 있도록 observation_summary에만 정리합니다.",
  "사이트 개요에는 메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않습니다.",
  "실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 제공된 HTML과 스크린샷만으로 확인되지 않는다고 짧게 언급합니다.",
  "'관측되었습니다', '공개 화면에서는', '조회 시점 기준', '공개 HTML에서', '표시되었습니다', '보입니다', '정리했습니다' 같은 리포트식 표현은 최소화합니다.",
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
  return `다음 site_crawl_snapshots 관측 데이터를 바탕으로 sites.description에 저장할 한국어 사이트 설명 초안을 JSON으로 작성하세요.

작성 원칙:
- detail_description_md는 Markdown 문자열입니다.
- 고지문은 별도 Notice 컴포넌트에서 출력하므로 detail_description_md에 넣지 않습니다.
- detail_description_md는 2~3문단으로 제한하고, 각 문단은 2~3문장 이내로 작성합니다.
- 전체 분량은 300~600자 정도를 우선합니다.
- 제목, bullet 목록, 표, 키워드 나열은 사용하지 않습니다.
- 사이트 개요는 짧고 자연스럽게 작성하고, 원본 사이트 이용을 돕거나 유도하는 문구를 쓰지 않습니다.
- 화면에 보이는 흐름은 요약하되, promotional/excluded terms는 공개 설명에서 반복하거나 강조하지 않습니다.
- detail_description_md에는 사이트 표시명, 화면 구성 요약, 주요 카테고리 요약, 계정/문의 메뉴 요약, 결제/이용 내역 관련 요소의 존재 여부, 확인되지 않은 항목, 원본 사이트 관측 정보 섹션 안내만 담습니다.
- 세부 메뉴, 게임명, footer, 이미지 alt, 배지 같은 값은 detail_description_md에 나열하지 말고 별도 "원본 사이트 관측 정보" 섹션에서 표시할 수 있도록 observation_summary 배열에만 정리합니다.
- 메뉴 전체 목록, 게임명, 카테고리명, 언어명, footer 문구를 길게 나열하지 않습니다.
- page_title, meta_description, h1 같은 내부 필드명을 직접 언급하지 않습니다.
- "문서 제목은 ...로 표시되었습니다", "메타 설명에는 ...", "대표 제목 영역에는 ..." 같은 내부 추출 설명을 쓰지 않습니다.
- "관측되었습니다", "공개 화면에서는", "조회 시점 기준", "공개 HTML에서", "표시되었습니다", "보입니다", "정리했습니다" 표현은 최대한 줄입니다.
- 대체 표현으로 "사용합니다", "구성되어 있습니다", "함께 배치되어 있습니다", "포함되어 있습니다", "확인됩니다", "확인할 수 없습니다", "별도로 정리했습니다"를 우선 사용합니다.
- 이용 유도성 문구가 있는 경우 정확한 문구를 나열하지 말고 원문 그대로 옮기지 않았다는 수준으로만 정리합니다.
- 실제 결제 방식, 본인 확인 절차, 이용 조건, 접근 제한 여부는 제공된 HTML과 스크린샷만으로 확인되지 않는다고 짧게 언급합니다.
- 안전성, 먹튀 여부, 검증 완료 여부를 단정하지 않습니다.
- 원본 문장이나 footer 문구를 긴 문장 그대로 복사하지 않습니다.
- URL은 설명 본문에 직접 길게 쓰지 말고 주소·도메인 섹션에서 표시할 대상으로만 취급합니다.

추천 출력 스타일:
"{사이트명}은 공개 화면에서 {표시명}이라는 이름을 사용하는 사이트입니다. 주요 화면은 스포츠, 카지노, 라이브 게임 등 게임 카테고리를 중심으로 구성되어 있으며, 로그인과 고객센터처럼 계정·문의 관련 메뉴도 함께 표시됩니다.

본문에는 여러 게임 영역으로 이동하는 카드형 안내와 인기 게임을 보여주는 슬라이드형 구성이 사용되었습니다. 일부 영역에는 계정 생성, 이용 내역, 결제 관련 요소로 보이는 문구도 포함되어 있지만, 제공된 HTML과 스크린샷만으로 실제 결제 방식이나 이용 조건까지 확인할 수는 없습니다.

하단에는 고객지원, 공지, 외부 연락 채널, 책임 있는 이용 관련 안내가 포함되어 있습니다. 자세한 메뉴와 화면 구성은 아래 원본 사이트 관측 정보 섹션에서 확인할 수 있습니다."

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
