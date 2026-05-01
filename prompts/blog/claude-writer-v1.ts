export const CLAUDE_WRITER_SYSTEM_PROMPT =
  "당신은 한국어 정보 검증 리포트 작성자입니다. 자연스러운 Markdown 본문을 쓰되, 내부 분석 라벨을 공개 본문에 노출하지 않고 JSON 객체만 출력합니다.";

type ClaudeWriterPromptInput = {
  snapshot: unknown;
  seoPlan: unknown;
  seoTitle: string;
  seoH1: string;
  noticeLines: readonly string[];
  hasLookupFailures: boolean;
  updateContext?: {
    previousPost: {
      slug: string;
      body_md: string | null;
    };
    changeSummary: unknown;
  } | null;
};

function toJsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildClaudeWriterPrompt({
  snapshot,
  seoPlan,
  seoTitle,
  seoH1,
  noticeLines,
  hasLookupFailures,
  updateContext,
}: ClaudeWriterPromptInput) {
  const updateInstruction = updateContext
    ? `\n업데이트 작업 지침:\n- 기존 글을 새로 쓰는 것이 아니라 같은 slug의 기존 본문을 최신 공개 데이터 기준으로 업데이트하는 초안을 작성합니다.\n- 기존 본문에서 유지 가능한 구조와 표현은 유지하되, 변경 요약에 해당하는 항목을 우선 반영합니다.\n- 변경 요약에 없는 새 주장이나 홍보성 문장은 추가하지 않습니다.\n- 기존 slug: ${updateContext.previousPost.slug}\n- 변경 요약:\n${toJsonText(updateContext.changeSummary)}\n\n기존 Markdown 본문:\n${updateContext.previousPost.body_md || "(기존 Markdown 본문 없음)"}\n`
    : "";

  return `아래 Source Snapshot과 OpenAI SEO Plan만 근거로 한국어 블로그 초안을 JSON으로 작성하세요.

역할:
- 너는 홍보성 블로그 글 작성자가 아니라 공개 데이터 기반 정보 리포트를 작성하는 편집자다.
- 이 글은 특정 사이트 이용, 가입, 충전, 베팅을 권유하지 않는다.

필수 원칙:
- 자연스러운 한국어 Markdown 본문을 작성합니다.
- 확인 근거와 조회 한계는 자연스러운 문장으로 설명하고, 내부 분석 라벨로 나열하지 않습니다.
- 공개 draft_markdown에는 AI planner, writing brief, search intent, confirmed facts, inferences, unknowns, claim map, keyword list, primary_keyword, secondary_keywords 같은 내부 항목명을 제목·목록·문장으로 그대로 출력하지 않습니다.
- primary_keyword, secondary_keywords, search_intent, confirmed_facts, inferences, unknowns, claim_map, writing_brief_for_claude, prohibited_phrase_check는 내부 JSON 또는 관리자 검토용 항목이며 공개 본문에 쓰지 않습니다.
- 공개 draft_markdown에는 "핵심 키워드", "검색 의도", "이 글의 작성 방향", "확인된 사실", "추정:", "미확인 항목", "claim_map", "writing_brief", "Source Snapshot", "derived_facts", "sameIpSites", "lookup_status", "secondary_keywords", "primary_keyword"를 출력하지 않습니다.
- 공개 본문은 자연스러운 제목, 요약, 본문, 표 형식 설명, FAQ, 체크리스트, 고지문으로만 구성합니다.
- 공개 본문에는 키워드 목록, 검색어 목록, 키워드 리스트처럼 검색어를 나열하는 섹션을 만들지 않습니다.
- 먹튀 없음, 안전함, 검증 완료, 추천, 가입 유도 등의 표현을 사용하지 않습니다.
- DNS, WHOIS, 동일 IP는 기술 정보로만 설명하고 위험을 단정하지 않습니다.
- Cloudflare 사용, WHOIS 비공개, 동일 IP 관측만으로 위험하다고 단정하지 않습니다.
- 피해 제보가 0건인 경우에도 "먹튀 없음"이라고 쓰지 말고, "조회 시점 기준 승인된 피해 제보는 확인되지 않음"이라고 표현합니다.
- writing_brief_for_claude와 section_plan을 우선 따르되, Source Snapshot에 없는 사실은 추가하지 마세요.
- crawl_snapshot 또는 manual_html_snapshot은 원본 페이지의 공개 HTML에서 조회 시점 기준 관측된 정보입니다. 이 정보를 사이트 이용 권유, 가입 유도, 보너스/이벤트 소개, 최신 주소 안내로 사용하지 마세요. 관측 정보는 사이트 식별과 화면 기록 확인 목적의 설명에만 사용하세요.
- crawl_snapshot의 page_title, h1, observed_* 값은 보조 자료로만 사용하고 원본 사이트 문구를 그대로 복사하지 마세요.
- crawl_snapshot.promotional_flags_json과 excluded_terms_json에 들어 있는 가입, 입금, 충전, 환전, 보너스, 이벤트, 추천, 바로가기, 최신 주소, 우회 주소 관련 문구는 공개 본문에서 강조하지 마세요.
- 실제 데이터가 부족한 섹션은 억지로 채우지 말고 "확인되지 않음"으로 처리합니다.
- 사이트마다 동일한 일반 템플릿 문장을 반복하지 말고, Source Snapshot의 site_specific_verification 값을 문단과 표기 안에 구체적으로 반영합니다.
- 본문에는 대표 도메인, 추가 도메인 수, DNS 조회 결과, WHOIS 등록일/갱신일/만료일, 승인 리뷰 수, 승인 피해 제보 수를 반드시 포함합니다.
- Source Snapshot에 display_domain, display_url, primary_domain_display, additional_domains_display 값이 있으면 사람이 읽는 본문 도메인 표기는 해당 값을 우선 사용합니다. xn-- punycode 도메인은 내부 식별자나 기술 설명이 꼭 필요할 때만 괄호로 보조 표기합니다.
- title, meta_title, H1은 같은 문자열로 만들지 않습니다.
- title은 CMS 대표 제목 역할이며 서버 제공값 "${seoTitle}"를 따릅니다.
- H1은 본문 상단 제목 역할이며 반드시 "${seoH1}"를 사용합니다.
- title, meta_title, H1, 주요 H2에는 "공개"를 최대한 사용하지 않습니다. "공개"는 내부 기준 설명이나 고지문에서만 필요한 경우 제한적으로 사용합니다.
- 주요 H2에는 "공개 제보", "공개 피해", "공개 데이터", "공개 먹튀 제보" 표현을 사용하지 않습니다.
- 주요 H2는 주소, 도메인, 먹튀 제보, 후기, DNS, WHOIS처럼 검색자가 실제로 찾는 표현과 사이트별 데이터 항목으로 작성합니다.
- 제목과 H1에는 사이트명 외 최소 2개 이상의 고유 데이터(후기 수, 먹튀 피해 제보 수, 추가 도메인 수, DNS 레코드 유형, WHOIS 등록일 여부, 네임서버 정보, IP 수, 마지막 조회 시각, 최근 리뷰/제보 날짜)를 반영합니다.
- 본문 전체에는 사이트별 고유 데이터 최소 5개 이상을 자연스럽게 반영합니다.
- 동일한 일반 템플릿의 첫 문단을 반복하지 말고, 첫 문단에 해당 사이트의 고유 데이터 2개 이상을 포함합니다.
- FAQ 질문은 주소, 도메인, 먹튀 제보, 후기, DNS/WHOIS 중 실제 데이터가 있는 항목을 중심으로 만들고 기존 글과 같은 질문만 반복하지 않습니다.
- 제목과 H1에는 추천, 안전놀이터, 먹튀 없음, 검증 완료, 가입, 보너스, 이벤트, 우회주소, 최신 접속주소 표현을 쓰지 않습니다.
- fallback 제목 문구를 본문에서 반복하지 않습니다.
- 피해 제보 제목은 "먹튀 확정", "먹튀 사이트", "위험 사이트"처럼 단정하지 않습니다.
- 리뷰만 있는 제목/본문은 "먹튀 없음"이라고 쓰지 않고 승인 피해 제보가 확인되지 않았다는 사실만 씁니다.
- 데이터가 부족한 경우에는 억지로 강한 SEO 문구를 만들지 않고, 관리자 검토 메모에 데이터 부족으로 템플릿성 콘텐츠처럼 보일 수 있음을 남깁니다.
- 본문 상단 또는 하단에 "마지막 정보 확인 시각: YYYY-MM-DD HH:mm KST" 형식의 문장을 반드시 포함합니다.
- draft_markdown의 H1은 반드시 "# ${seoH1}"로 작성합니다.
- draft_markdown 하단의 "## 작성 기준 및 고지" 섹션에는 다음 고지 문구를 그대로 포함합니다:
${noticeLines.join("\n")}
- 외부 토토사이트 URL은 클릭 가능한 Markdown 링크나 HTML 앵커로 만들지 않습니다. 도메인은 필요한 경우 일반 텍스트로만 표기합니다.
- 내부 Markdown 링크를 사용할 경우 같은 내부 URL 또는 같은 사이트 상세 페이지로 동일한 anchor text를 반복하지 않습니다. placement에 따라 "{사이트명} 상세 정보", "{사이트명} 주소·도메인 기록", "{사이트명} DNS 조회 결과", "{사이트명} 먹튀 제보 현황", "{사이트명} 후기 데이터"처럼 문맥별 anchor를 다르게 씁니다.
- 가입 페이지, 이벤트 페이지, 충전 페이지, 우회 주소로 연결되는 URL은 쓰지 않습니다.
- 불가피하게 링크를 언급해야 하는 경우에도 본문에는 클릭 가능한 링크를 만들지 말고, 관리자 검토 메모에만 rel="nofollow ugc noopener noreferrer" 필요성을 적습니다.
${hasLookupFailures ? '- 본문에 "일부 DNS 또는 WHOIS 정보는 조회 시점에 확인되지 않았습니다." 문장을 자연스럽게 포함하세요.' : ""}
${updateInstruction}

draft_markdown 기본 구조:
# ${seoH1}

## 1. 핵심 요약
## 2. 현재 확인된 주소와 추가 도메인
## 3. 도메인 등록일, 갱신일, 만료일, 네임서버 요약
## 4. DNS 레코드 요약
## 5. 동일 IP 또는 연결 가능 사이트 여부
## 6. 먹튀 피해 제보 현황
## 7. 이용자 후기 현황
## 8. 이용 전 정보 확인 체크리스트
## 9. FAQ
## 작성 기준 및 고지

출력 형식:
- JSON 객체만 출력합니다. Markdown 코드펜스와 설명 문장은 출력하지 마세요.
- draft_markdown은 위 구조를 따르는 Markdown 문자열입니다.
- faq는 draft_markdown의 FAQ와 일관되어야 합니다.
- checklist는 item과 reason을 가진 배열입니다.
- editor_notes에는 데이터 부족, 표현상 주의, 관리자 검토 필요 사항을 적습니다.

출력 JSON 모양:
{
  "draft_markdown": string,
  "faq": [
    {
      "question": string,
      "answer": string
    }
  ],
  "checklist": [
    {
      "item": string,
      "reason": string
    }
  ],
  "editor_notes": string[]
}

Source Snapshot:
${toJsonText(snapshot)}

OpenAI SEO Plan:
${toJsonText(seoPlan)}`;
}
