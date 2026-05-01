export const BLOG_PROMPT_VERSION = "blog-v1";

export const OPENAI_PLANNER_SYSTEM_PROMPT =
  "당신은 한국어 SEO 정보 리포트 설계자입니다. 공개 데이터 기반으로 검색 의도, 제목/메타 후보, 섹션 계획, claim map, Claude 작성 브리프를 만들고 추천/홍보/안전 보장 표현을 차단합니다.";

type OpenAiPlannerPromptInput = {
  siteName: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  seoMetaTitle: string;
  seoH1: string;
  seoMetaDescription: string;
  preferredSlug: string;
  noticeLines: readonly string[];
  hasLookupFailures: boolean;
  snapshot: unknown;
  updateContext?: unknown;
};

function toJsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildOpenAiPlannerPrompt({
  siteName,
  primaryKeyword,
  secondaryKeywords,
  seoTitle,
  seoMetaTitle,
  seoH1,
  seoMetaDescription,
  preferredSlug,
  noticeLines,
  hasLookupFailures,
  snapshot,
  updateContext,
}: OpenAiPlannerPromptInput) {
  const input = {
    site_name: siteName,
    primary_keyword: primaryKeyword,
    secondary_keywords: secondaryKeywords,
    snapshot,
    ...(updateContext
      ? {
          update_context: updateContext,
        }
      : {}),
  };

  return `다음 입력 JSON을 분석해 OpenAI 1차 단계용 SEO 설계 + 사실 구조화 JSON을 작성하세요.

필수 원칙:
- primary_keyword는 반드시 "${primaryKeyword}"로 둔다.
- secondary_keywords는 반드시 다음 순서와 값으로 둔다: ${secondaryKeywords.join(", ")}.
- recommended_title은 반드시 "${seoTitle}"로 둔다.
- meta_title은 반드시 "${seoMetaTitle}"로 둔다.
- meta_description은 반드시 "${seoMetaDescription}"로 둔다.
- title_candidates 첫 번째 항목은 반드시 "${seoTitle}"로 둔다.
- title_strategy.title은 반드시 "${seoTitle}"로 둔다.
- title_strategy.meta_title은 반드시 "${seoMetaTitle}"로 둔다.
- title_strategy.h1은 반드시 "${seoH1}"로 둔다.
- title_strategy.selected_pattern은 reviews_and_reports, domain_count, whois_dns, dns_records, low_data 중 하나로 둔다.
- title_strategy.unique_data_points_used에는 제목에 반영한 Source Snapshot 필드명을 최소 2개 이상 넣는다.
- title_strategy.title_similarity_warning은 서버가 기존 발행 글과 비교해 최종 판정하므로 기본값 false로 둔다.
- 블로그 글 생성 시 글의 성격에 맞는 카테고리를 지정하라.
- 기본적으로 특정 사이트 하나를 종합 정리하는 글은 "site-reports" 카테고리를 대표 카테고리로 사용한다.
- DNS, WHOIS, 네임서버, IP, 레코드 정보가 중심이면 "domain-dns"를 보조 카테고리로 추가한다.
- 승인된 먹튀 피해 제보가 포함되면 "scam-reports"를 보조 카테고리로 추가한다.
- 승인된 이용자 리뷰가 포함되면 "user-reviews"를 보조 카테고리로 추가한다.
- 기존 글의 업데이트 초안이고 도메인, DNS, 리뷰, 먹튀 제보 변경 사항이 있으면 "change-history"를 보조 카테고리로 추가한다.
- 카테고리는 너무 많이 붙이지 말고 대표 카테고리 1개, 보조 카테고리 0~2개를 권장한다.
- 사이트명은 카테고리로 만들지 말고 태그로 처리한다.
- category_strategy.primary_category_slug는 반드시 대표 카테고리 slug로 둔다.
- category_strategy.secondary_category_slugs는 대표 카테고리를 제외한 보조 카테고리 slug 배열로 두고 최대 2개까지만 넣는다.
- category_strategy.tag_slugs는 소문자 slug 배열로 둔다. 사이트명 slug를 포함하고, "dns", "whois", "scam-reports", "user-reviews", "change-history"는 해당 근거 또는 보조 카테고리가 있을 때만 추가한다.
- category_strategy.reason에는 카테고리 선택 이유를 한국어 한 문장으로 적는다.
- title, meta_title, H1은 같은 문자열로 만들지 않는다.
- title은 CMS/관리자 대표 제목 역할이며 "${seoTitle}"로 둔다.
- meta_title은 검색 결과용 짧은 제목 역할이며 "${seoMetaTitle}"로 둔다.
- H1은 본문 상단 제목 역할이며 "${seoH1}"로 둔다.
- title, meta_title, H1, 주요 H2에는 "공개"를 최대한 사용하지 않는다. "공개"는 내부 기준 설명이나 고지문에서만 필요한 경우 제한적으로 사용한다.
- title, meta_title, H1, 주요 H2에는 "공개 제보", "공개 피해", "공개 데이터", "공개 먹튀 제보" 표현을 사용하지 않는다.
- title, meta_title, H1, 주요 H2에는 검색자가 실제로 검색할 표현인 "${primaryKeyword}", ${secondaryKeywords.join(", ")}를 자연스럽게 우선 사용한다.
- "{사이트명} 토토사이트 정보 리포트: 제보, 도메인, DNS 조회 기준 정리" 형태는 fallback 용도로만 사용한다.
- Google 검색 노출 기준에 맞춰 각 페이지의 title은 고유하고 설명적이어야 한다. 사이트명만 바뀌고 나머지 문구가 동일한 boilerplate 제목 후보를 대량 생성하지 않는다.
- 제목 후보는 Source Snapshot의 seo_title_signals 중 사이트명 외 최소 2개 이상, 가능하면 2~3개를 조합한다: 후기 수, 먹튀 제보 수, 추가 도메인 수, DNS 레코드 타입, WHOIS 등록일 여부, 네임서버 정보, IP 수, 최신 리뷰/제보 시각, DNS/WHOIS 조회 시각.
- 모든 사이트에 "{사이트명}"만 바뀌고 나머지 문구가 동일한 제목 후보를 반복하지 않는다.
- 제목 후보 생성 규칙:
  1. 피해 제보가 1건 이상이면 "{사이트명} 토토사이트 먹튀 제보 {n}건 정리: 도메인·DNS·후기 현황" 방향을 사용한다. 단, "먹튀 확정", "먹튀 사이트", "위험 사이트"처럼 단정하지 않는다.
  2. 피해 제보는 없고 승인 리뷰가 있으면 "{사이트명} 토토사이트 후기 {n}건과 먹튀 제보 0건: DNS 조회 기준" 방향을 사용한다. "먹튀 없음"이라고 쓰지 않는다.
  3. 추가 도메인이 여러 개면 "{사이트명} 토토사이트 도메인 {n}개 관측 현황: WHOIS·DNS·제보 정리" 방향을 사용한다.
  4. WHOIS 등록일 정보가 있으면 "{사이트명} 토토사이트 WHOIS 등록일·네임서버 정보: 제보와 DNS 기록 정리" 방향을 사용한다.
  5. DNS 레코드 타입이 풍부하면 "{사이트명} 토토사이트 DNS 레코드 분석: A·NS·TXT 기록과 제보 현황" 방향을 사용한다.
  6. 정보가 부족하면 "{사이트명} 토토사이트 기본 정보 확인: 먹튀 제보 0건·후기 0건·도메인 {domain_count}개" 방향을 fallback으로 사용하고, 억지로 강한 SEO 제목을 만들지 않는다.
- meta_title은 짧게 작성한다. 예: "{사이트명} 토토사이트 | 도메인·DNS·제보 현황", "{사이트명} 후기·제보 현황 | DNS 조회 기준", "{사이트명} 도메인 정보 | WHOIS·후기 데이터", "{사이트명} 제보 현황 | 후기·DNS 정리".
- H1은 검색 title보다 조금 길어도 되지만, 동일한 boilerplate를 반복하지 않는다. 예: "{사이트명} 토토사이트 도메인 리포트: 도메인 이력, DNS 기록, 후기와 피해 제보 현황".
- 제목 후보에는 다음 표현을 사용하지 않는다: 추천, 안전놀이터, 먹튀 없음, 검증 완료, 가입, 보너스, 이벤트, 우회주소, 최신 접속주소.
- 먹튀 제보가 0건인 경우에도 "먹튀 없음"이라고 쓰지 말고, "먹튀 제보 0건"처럼 표현한다.
- search_intent.main_intent는 "정보 확인" 방향으로 둔다.
- section_plan은 H2/H3 작성에 바로 사용할 수 있는 구조로 만든다.
- section_plan의 주요 H2는 "공개 제보", "공개 피해", "공개 데이터", "공개 먹튀 제보"를 쓰지 않고 주소, 도메인, 먹튀 제보, 후기, DNS, WHOIS처럼 실제 검색 표현과 데이터 항목을 중심으로 작성한다.
- confirmed_facts, inferences, unknowns를 분리한다.
- claim_map.source는 sites, dns, whois, reviews, scam_reports, domain_submissions, crawl_snapshot 중 하나만 사용한다.
- search_intent, confirmed_facts, inferences, unknowns, claim_map, writing_brief_for_claude, primary_keyword, secondary_keywords, prohibited_phrase_check는 내부 JSON 또는 관리자 검토용 항목이며 공개 본문에 그대로 노출하지 않도록 계획한다.
- section_plan과 writing_brief_for_claude는 공개 본문이 자연스러운 제목, 요약, 본문, 표 형식 설명, FAQ, 체크리스트, 고지문으로만 구성되도록 지시한다.
- writing_brief_for_claude에는 공개 body_md 안에 primary_keyword, secondary_keywords, search_intent, claim_map, confirmed_facts, inferences, unknowns, writing_brief 같은 내부 필드명이 절대 나오지 않도록 지시한다.
- writing_brief_for_claude에는 키워드 목록, 검색어 목록, 키워드 나열 섹션을 만들지 말고 문맥 속 자연스러운 표현만 쓰라고 지시한다.
- confidence는 근거가 직접 있으면 high, 집계/간접 관측이면 medium, 조회 실패/부재/불명확하면 low를 사용한다.
- 모든 글에는 Source Snapshot의 site_specific_verification 값을 고유 데이터로 반영한다.
- crawl_snapshot 또는 manual_html_snapshot은 원본 페이지의 공개 HTML에서 조회 시점 기준 관측된 정보입니다. 이 정보를 사이트 이용 권유, 가입 유도, 보너스/이벤트 소개, 최신 주소 안내로 사용하지 마세요. 관측 정보는 사이트 식별과 화면 기록 확인 목적의 설명에만 사용하세요.
- crawl_snapshot의 page_title, h1, observed_* 값은 보조 자료로만 쓰고, 원본 사이트 문구를 그대로 복사하지 않는다.
- crawl_snapshot.promotional_flags_json과 excluded_terms_json에 있는 표현은 AI 입력에는 포함되더라도 공개 본문, 제목, FAQ, checklist에서 강조하지 않는다.
- 블로그 본문에서도 가입, 입금, 충전, 환전, 보너스, 이벤트, 추천, 바로가기, 최신 주소, 우회 주소를 소개하거나 강조하지 않는다.
- 모든 글은 사이트별 고유 데이터 최소 5개 이상을 반영해야 한다. 예: 대표 도메인, 추가 도메인 수, DNS 레코드 유형, WHOIS 날짜, 네임서버, 승인 리뷰 수, 먹튀 제보 수, 마지막 조회 시각, 동일 IP 관측 여부.
- 글마다 같은 템플릿 문장을 반복하지 말고, 대표 도메인, 추가 도메인 수, DNS 조회 결과, WHOIS 날짜, 리뷰 수, 피해 제보 수, 마지막 정보 확인 시각을 해당 사이트 값으로 구체화한다.
- 최근 발행 글 또는 update_context가 제공되면 제목 패턴, H2 흐름, 첫 문단, FAQ 질문이 반복되지 않도록 section_plan과 writing_brief_for_claude에 차별화 지침을 포함한다.
- 최종 OpenAI validator가 duplicate_risk_check를 작성할 수 있도록, section_plan에는 제목 패턴, H2 패턴, 첫 문단 차별화 포인트, FAQ 차별화 포인트를 명확히 남긴다.
- Source Snapshot에 display_domain, display_url, primary_domain_display, additional_domains_display 값이 있으면 제목, 본문, FAQ, checklist의 사람이 읽는 도메인 표기는 해당 값을 우선 사용한다. xn-- punycode 도메인은 내부 식별자나 기술 설명이 꼭 필요할 때만 괄호로 보조 표기한다.
- 피해 제보가 없으면 title, meta_title, H1, 주요 H2에서는 "먹튀 제보 0건"으로 표현하고, 본문 설명에서는 "조회 시점 기준 승인된 피해 제보는 확인되지 않음"처럼 표현한다.
- risk_warnings에는 "먹튀 없음", "안전 보장", "추천", "가입 유도", 운영 주체 단정, 동일 IP 단정 금지를 포함한다.
- writing_brief_for_claude에는 자연스러운 한국어 블로그 본문 작성 지침, 반드시 포함할 사실, 피해야 할 문장을 함께 적는다.
- writing_brief_for_claude에는 본문 하단 "작성 기준 및 고지" 섹션에 다음 고지를 그대로 포함하라고 적는다:
${noticeLines.join("\n")}
- 외부 토토사이트 URL은 Markdown 링크나 HTML 앵커로 만들지 않는다. 도메인은 필요한 경우 일반 텍스트로만 쓴다.
- 내부 링크를 계획할 때 같은 URL 또는 같은 사이트 상세 페이지의 anchor text를 반복하지 않는다. summary, 주소·도메인, DNS, 먹튀 제보, 후기 placement마다 서로 다른 anchor text를 쓰도록 지시한다.
- 가입 페이지, 이벤트 페이지, 충전 페이지, 우회 주소로 이어지는 URL 또는 링크는 생성하지 않는다.
- 불가피하게 외부 링크가 필요하다고 판단되는 경우에도 rel="nofollow ugc noopener noreferrer" 원칙을 risk_warnings에 남긴다.
- DNS/WHOIS 조회 실패가 있으면 "일부 DNS 또는 WHOIS 정보는 조회 시점에 확인되지 않았습니다." 취지를 포함한다.
- recommended_title과 title_candidates는 정보 검증 리포트 톤으로 작성하고, slug는 서버에서 "${preferredSlug}"를 사용한다.
${hasLookupFailures ? '- 이번 Source Snapshot에는 DNS/WHOIS 조회 실패가 포함되어 있으므로 claim_map에 미확인 항목으로 분리한다.' : ""}
${updateContext ? '- 이 작업은 기존 published 글을 새로 만들지 않고 같은 slug로 업데이트 초안을 만드는 작업이다. update_context.change_summary를 section_plan과 writing_brief_for_claude에 반영한다.' : ""}

title_strategy JSON 형식:
{
  "selected_pattern": "reviews_and_reports",
  "reason": "",
  "unique_data_points_used": [
    "approved_review_count",
    "approved_public_scam_report_count",
    "additional_domain_count"
  ],
  "title": "${seoTitle}",
  "meta_title": "${seoMetaTitle}",
  "h1": "${seoH1}",
  "title_similarity_warning": false
}

category_strategy JSON 형식:
{
  "primary_category_slug": "site-reports",
  "secondary_category_slugs": [
    "domain-dns",
    "scam-reports"
  ],
  "tag_slugs": [
    "sitename",
    "dns",
    "whois",
    "scam-reports"
  ],
  "reason": "이 글은 특정 토토사이트의 도메인, DNS, WHOIS, 먹튀 제보, 승인 리뷰를 종합 정리하는 사이트 정보 리포트이므로 site-reports를 대표 카테고리로 지정한다."
}

입력 JSON:
${toJsonText(input)}`;
}
