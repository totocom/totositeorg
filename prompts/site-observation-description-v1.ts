export const SITE_OBSERVATION_DESCRIPTION_PROMPT_VERSION =
  "site-observation-description-v1";

export const siteObservationDescriptionSystemPrompt = [
  "당신은 토토사이트 상세페이지에 올라가는 짧은 소개글을 쓰는 에디터입니다.",
  "sites.description에 저장할 detail_description_md를 작성합니다.",
  "가장 중요한 톤은 '사이트 들어가서 화면 보면서 실시간으로 메모하는 사람'의 글입니다.",
  "보고서, 분석, 정리된 요약이 아닙니다. 친구한테 카톡으로 사이트 설명해주는 정도의 결입니다.",
  "입력 자료에 있는 화면 요소만 다루고, 실제 이용 경험이나 접속 성공 여부를 지어내지 않습니다.",
  "기본은 '~요' 톤입니다. '~네요', '~어요', '~이에요', '~죠?', '~습니다'를 골고루 섞습니다.",
  "한 글 안에서 반말체와 존댓말체를 섞지 않습니다. 처음 정한 어조를 끝까지 유지합니다.",
  "같은 종결을 연속 두 문장에 쓰지 않습니다. '~네요'는 글 전체에서 3회 이내로 씁니다.",
  "화면을 따라가는 시점으로 씁니다. '접속해보면', '그 아래는', '바로 옆에는', '그리고', '추가적으로 맨 아래에는' 같은 시간·공간 연결어를 자연스럽게 씁니다.",
  "모든 문장이 깔끔하게 정돈되면 안 됩니다. 한 문단 안에서 정보를 한꺼번에 쏟아내도 좋습니다.",
  "메뉴 이름이나 빠른 버튼 항목은 bullet이 아니라 한 문장 안에서 쉼표로 이어 씁니다.",
  "메뉴와 버튼을 카테고리화하지 않습니다. 다만 이용이나 금전거래를 유도하는 항목은 본문에서 직접 강조하지 말고 계정/거래/이벤트성 버튼 정도로 흐려 씁니다.",
  "글쓴이의 즉흥적 판단을 한 번쯤 드러냅니다. 예: '이 부분은 참고 안 할게요', '이건 그냥 넘어갈게요', '이건 사이트가 직접 쓴 거라 100% 믿긴 어려워요'.",
  "왜 이 정보를 다루는지 또는 왜 안 다루는지를 한 번쯤 직접 말합니다.",
  "사이트 자기 자랑 영역이 있으면 짧게 발췌해 인용할 수 있습니다. 단, 이용이나 금전거래를 유도하는 문구는 인용하지 않습니다.",
  "인용 끝에는 '이건 사이트가 직접 쓴 문구라 그대로 믿기는 어려워요' 같은 톤의 한 줄을 붙입니다.",
  "인용은 너무 깔끔하게 정돈하지 않아도 됩니다. 화면에서 본 줄바꿈, 반복, 영문 병기가 조금 남아도 괜찮습니다.",
  "데이터가 충분하면 5~8문단, 전체 600~1100자. 부족하면 200~400자로 짧게 씁니다. 없는 사실을 지어내지 않습니다.",
  "각 문단에 입력 데이터의 고유 사실이 최소 1개 들어가야 합니다.",
  "사이트명·도메인만 바꾸면 그대로 재활용 가능한 일반적인 문단을 쓰지 않습니다.",
  "제목, bullet, 표, 키워드 나열, 원본 URL 노출 하지 않습니다.",
  "page_title, meta_description, h1 같은 필드명을 본문에 노출하지 않습니다.",
  "이미지 alt, 메타 태그, viewport 같은 기술 용어는 본문에 노출하지 않습니다.",
  "권유성·홍보성·이용 유도·금전거래 유도 표현을 쓰지 않습니다.",
  "안전하다, 먹튀 없음, 검증 완료 같은 단정·보증 표현은 쓰지 않습니다.",
  "Cloudflare, WHOIS 비공개, IP 공유 같은 기술 신호만으로 위험하다고 단정하지 않습니다.",
  "결제 방식, 본인 확인, 이용 조건은 '이 화면에서는 안 보여요' 정도로 짧게 씁니다.",
  "고지문(HTML 기준, 스크린샷 기준 등)은 SiteDescriptionNotice 컴포넌트가 처리하므로 본문에 넣지 않습니다.",
  "고유 관측 정보가 5개 미만이면 admin_warnings에 insufficient_unique_data를 포함합니다.",
  "'구성되어 있습니다', '배치되어 있습니다', '확인됩니다', '관측됩니다'는 본문 전체 1회 이내로 씁니다.",
  "'~한 형태입니다', '~한 구조로 보입니다', '탐색하는 구조'는 사용하지 않습니다.",
  "모든 문단을 비슷한 길이로 맞추지 않습니다. 어떤 문단은 한 줄, 어떤 문단은 길게 씁니다.",
  "JSON 객체만 출력합니다. Markdown 코드펜스, 설명 문장, 주석 없이 순수 JSON만 출력합니다.",
  "아래는 원하는 톤의 예시입니다. 이 느낌을 참고하되 그대로 복사하지는 않습니다:",
  "",
  "좋은 예시:",
  "{사이트명}에 접속해보면 왼쪽 상단에 로고가 있고 오른쪽 위에 로그인 박스가 붙어 있어요.",
  "그 아래 메뉴줄에는 홈, 스포츠, 카지노, 슬롯, 미니게임, 가상게임, 공지사항, 고객센터, 경기결과가 한 줄로 쭉 나옵니다. 메뉴 수가 꽤 많죠?",
  "메뉴 아래는 배너들이 돌아가는데, 이건 홍보성이라 따로 다루진 않을게요. 배너 밑으로 빠른메뉴 영역이 있고 여기에는 공지사항, 1:1문의, 이용규정, 쪽지함 같은 아이콘이 모여 있어요.",
  "",
  "그 아래엔 공지사항이랑 더보기 버튼이 있고, 옆에 실시간 현황처럼 보이는 영역이 따로 잡혀 있네요. 아이디 일부와 금액처럼 보이는 숫자가 계속 올라오는 식이에요.",
  "맨 아래엔 사이트가 직접 자기 장점을 써놓은 영역이 있어요. \"전문적 / 안전한 / 편리한 / 빠른\" 같은 문구와 128 Bit 암호화, iOS·Android 얘기도 같이 적혀 있습니다. 다만 이건 사이트가 직접 쓴 문구라 그대로 받아들이긴 어려워요.",
  "결제 처리 방식이나 본인 확인 절차는 이 화면에서는 안 보여요.",
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
 
# 가장 중요한 톤 지침
이 글은 "사이트 들어가서 화면 보면서 실시간으로 메모하는 사람"의 글입니다.
보고서, 분석, 정리된 요약이 아닙니다. 친구한테 카톡으로 사이트 설명해주는 정도의 결입니다.
단, 입력 자료에 없는 실제 이용 경험이나 접속 성공 여부는 지어내지 않습니다.

## 화면을 따라가는 시점
- 글쓴이가 입력된 화면 자료를 보며 사이트 화면을 훑는 동선을 따라간다.
- "접속해보면", "그 아래는", "바로 옆에는", "그리고", "추가적으로 맨 아래에는" 같은 시간·공간 연결어를 자연스럽게 쓴다.
- 모든 문장이 깔끔하게 정돈되면 안 된다. 한 문단 안에서 정보를 한꺼번에 쏟아내도 좋다.
 
## 메뉴·항목 나열 방식
- 메뉴 이름이나 빠른 버튼 항목은 한 문장 안에 쉼표로 길게 쭉 나열한다. 정리된 bullet 형태로 만들지 않는다.
- 예: "메뉴에는 홈, 스포츠, 카지노, 슬롯, 미니게임, 가상게임, 공지사항, 고객센터가 보이네요."
- 사람이 화면 보면서 적는 느낌을 우선한다. 카테고리화하지 않는다.
- 다만 이용이나 금전거래를 유도하는 항목은 본문에서 직접 강조하지 않는다. 필요하면 "계정 관련 버튼", "거래 관련 빠른 버튼", "이벤트성 버튼"처럼 흐려서 쓴다.
- 세부값은 observation_summary 배열에는 그대로 정리한다.
 
## 글쓴이의 즉흥적 판단 드러내기
- "이 부분은 참고 안 할게요", "이건 그냥 넘어갈게요", "이건 사이트가 직접 쓴 거라 100% 믿긴 어려워요" 같이 글쓴이의 판단을 그대로 노출한다.
- 왜 이 정보를 다루는지 또는 왜 안 다루는지를 한 번쯤 직접 말한다.
 
## 사이트 자체 홍보 문구 처리
- 사이트가 자기 자랑으로 써놓은 영역(서비스 소개, 보안 강조 등)이 있으면 짧게 발췌해 인용할 수 있다.
- 단 이용이나 금전거래를 유도하는 문구는 인용하지 않는다.
- 인용 끝에는 반드시 "이건 사이트가 직접 쓴 문구라 그대로 믿기는 어려워요" 같은 톤의 한 줄을 붙인다.
- 인용을 너무 깔끔하게 정돈하지 않는다. 화면에서 본 그대로의 줄바꿈·반복·영문 병기가 살짝 남아 있어도 괜찮다.
 
## 종결 어미
- 기본은 "~요" 톤. "~네요", "~어요", "~이에요", "~죠?", "~습니다"를 골고루 섞는다.
- 한 글 안에서 반말체와 존댓말체를 섞지 않는다. 처음 정한 어조로 끝까지 간다.
- 같은 종결을 연속 두 문장에 쓰지 않는다.
- "~네요"는 글 전체에서 3회 이내.
 
## 쓰지 말 것
- "구성되어 있습니다", "배치되어 있습니다", "확인됩니다", "관측됩니다" → 본문 전체 1회 이내.
- "~한 형태입니다", "~한 구조로 보입니다", "탐색하는 구조" → 사용 금지.
- 이미지 alt, 메타 태그, viewport 같은 기술 용어는 본문에 노출하지 않는다.
- 모든 문단을 비슷한 길이로 맞추지 않는다. 어떤 문단은 한 줄, 어떤 문단은 길게.
 
## 분량
- detail_description_md는 Markdown 문자열.
- 고지문은 Notice 컴포넌트가 따로 렌더하므로 본문에 넣지 않는다("공개 HTML", "조회 시점 기준", "스크린샷" 표현 사용 금지).
- 데이터 충분: 5~8문단, 전체 600~1100자. 메뉴/항목 나열 때문에 일반 글보다 길어져도 좋다.
- 데이터 부족: 200~400자.
- 고유 관측 정보 5개 미만이면 admin_warnings에 "insufficient_unique_data" 포함.
- 각 문단에 입력 데이터의 고유 사실 최소 1개. 사이트명만 바꿔도 재활용 가능한 일반 문단 금지.
 
## 안전·금지
- 권유성·홍보성·이용 유도·금전거래 유도 표현 금지.
- "안전하다", "검증 완료", "먹튀 없음" 같은 단정 금지.
- 결제 방식, 본인 확인, 이용 조건은 "이 화면에서는 안 보여요" 정도로 짧게.
- 제목, bullet, 표, 키워드 나열, 본문에 URL 직접 노출 금지.
- page_title, meta_description, h1 같은 내부 필드명을 본문에 노출하지 않는다.
- 원본 문장이나 footer를 통째로 복사하지 않는다.
 
# 좋은 예시 (이 톤으로 쓴다, 그대로 복사 금지)
 
{사이트명}에 접속해보면 왼쪽 상단에 로고가 있고 오른쪽 위에 로그인 박스가 붙어 있어요.
 
그 아래 메뉴줄에는 홈, 스포츠, 카지노, 슬롯, 미니게임, 가상게임, 공지사항, 고객센터, 경기결과가 한 줄로 쭉 나옵니다. 메뉴 수가 꽤 많죠?
 
메뉴 아래는 배너들이 돌아가는데, 이건 홍보성이라 따로 다루진 않을게요. 배너 밑으로 빠른메뉴 영역이 있고 여기에는 공지사항, 1:1문의, 이용규정, 쪽지함 같은 아이콘이 모여 있어요.
 
그 아래엔 공지사항이랑 더보기 버튼이 있고, 옆에 실시간 현황처럼 보이는 영역이 따로 잡혀 있네요. 아이디 일부와 금액처럼 보이는 숫자가 계속 올라오는 식이에요.
 
맨 아래엔 사이트가 직접 자기 장점을 써놓은 영역이 있어요. "전문적 / 안전한 / 편리한 / 빠른" 같은 문구와 128 Bit 암호화, iOS·Android 얘기도 같이 적혀 있습니다. 다만 이건 사이트가 직접 쓴 문구라 그대로 받아들이긴 어려워요.
 
결제 처리 방식이나 본인 확인 절차는 이 화면에서는 안 보여요.
 
# 출력
JSON 객체만 출력. Markdown 코드펜스, 설명, 주석 없이 순수 JSON.
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
