export const OPENAI_VALIDATOR_SYSTEM_PROMPT =
  "당신은 CMS 저장 전 최종 검수자입니다. 제목/메타/Markdown/FAQ/checklist를 정리하고 금지 표현과 근거 없는 주장을 엄격히 검사한 JSON만 출력합니다.";

export const OPENAI_VALIDATOR_REPAIR_SYSTEM_PROMPT =
  "당신은 CMS 저장 전 최종 검수자입니다. 제공된 위반 목록을 모두 제거하고 금지 표현 검사 결과가 모두 false가 되도록 정리한 JSON만 출력합니다.";

type OpenAiValidatorPromptInput = {
  snapshot: unknown;
  siteName: string;
  seoPlan: unknown;
  claudeDraft: unknown;
  preferredSlug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoTitle: string;
  seoMetaTitle: string;
  seoH1: string;
  seoMetaDescription: string;
  noticeLines: readonly string[];
  hasLookupFailures: boolean;
  updateContext?: unknown;
  previousViolations?: unknown[];
};

function toJsonText(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildOpenAiValidatorPrompt({
  snapshot,
  siteName,
  seoPlan,
  claudeDraft,
  preferredSlug,
  primaryKeyword,
  secondaryKeywords,
  seoTitle,
  seoMetaTitle,
  seoH1,
  seoMetaDescription,
  noticeLines,
  hasLookupFailures,
  updateContext,
  previousViolations,
}: OpenAiValidatorPromptInput) {
  return `Claude가 작성한 한국어 본문을 OpenAI 최종 검수 JSON으로 정리하세요.

절대 규칙:
- slug는 반드시 "${preferredSlug}"를 사용한다.
- title은 반드시 "${seoTitle}"로 둔다.
- meta_title은 반드시 "${seoMetaTitle}"로 둔다.
- meta_description은 반드시 "${seoMetaDescription}"로 둔다.
- primary_keyword는 반드시 "${primaryKeyword}"로 둔다.
- secondary_keywords는 반드시 다음 순서와 값으로 둔다: ${secondaryKeywords.join(", ")}.
- category_strategy는 OpenAI SEO Plan의 category_strategy를 유지한다.
- category_strategy.primary_category_slug는 반드시 "site-reports"로 둔다.
- category_strategy.secondary_category_slugs는 서버 규칙과 맞춘다. DNS 레코드, WHOIS 조회 시각, IP 관측값이 있으면 "domain-dns"를 넣고, 공개 승인 먹튀 제보가 1건 이상이면 "scam-reports"를 넣고, 승인 리뷰가 있으면 "user-reviews"를 넣고, 업데이트 변경 사항이 있으면 "change-history"를 넣는다.
- category_strategy.tag_slugs는 SEO Plan의 값과 같은 소문자 slug 배열로 두되, "dns", "whois", "scam-reports", "user-reviews", "change-history"는 해당 근거 또는 보조 카테고리가 있을 때만 유지한다.
- category_strategy.reason에는 대표 카테고리를 site-reports로 둔 이유를 한국어 한 문장으로 적는다.
- body_md의 H1은 반드시 "# ${seoH1}"로 둔다.
- title, meta_title, H1은 같은 문자열로 만들지 않는다.
- title은 CMS/관리자 대표 제목, meta_title은 검색 결과용 짧은 제목, H1은 본문 상단 제목 역할로 분리한다.
- "{사이트명} 토토사이트 정보 리포트: 공개 제보, 도메인, DNS 조회 기준 정리" 형태는 fallback 용도로만 허용한다.
- title, meta_title, H1은 사이트명만 바뀌는 boilerplate 문장으로 바꾸지 않는다. Source Snapshot의 seo_title_signals 중 사이트명 외 최소 2개 이상이 반영된 서버 제공 제목을 유지한다.
- 공개 피해 제보가 있어도 "먹튀 확정", "먹튀 사이트", "위험 사이트"처럼 단정하는 제목과 본문은 금지한다.
- 피해 제보가 없고 리뷰만 있는 경우 "먹튀 없음"으로 바꾸지 않고, "공개 제보 현황" 또는 "공개 먹튀 제보 0건"처럼 표현한다.
- 데이터가 부족한 경우에는 "{사이트명} 기본 정보 확인: 공개 먹튀 제보 0건·리뷰 0건·도메인 {domain_count}개" 방향의 fallback만 허용하고, admin_warnings에 데이터 부족 경고가 있는지 확인한다.
- body_md 하단의 "## 작성 기준 및 고지" 섹션에는 다음 고지 문구를 그대로 포함한다:
${noticeLines.join("\n")}
- body_md에는 외부 토토사이트 URL을 Markdown 링크나 HTML 앵커로 만들지 않는다. 필요한 도메인은 일반 텍스트로만 둔다.
- 가입 페이지, 이벤트 페이지, 충전 페이지, 우회 주소로 연결되는 링크나 URL은 제거한다.
- 외부 링크가 불가피하다고 판단되는 경우 admin_warnings에 rel="nofollow ugc noopener noreferrer" 적용 필요성을 남긴다.
- title, meta_title, H1에는 다음 표현을 사용하지 않는다: 추천, 안전놀이터, 먹튀 없음, 검증 완료, 가입, 보너스, 이벤트, 우회주소, 최신 접속주소.
- 서버가 이 JSON을 CMS 저장용 blog_posts 데이터로 변환한다.
- 추천, 홍보, 가입 유도, 안전 보장 표현을 제거한다.
- 피해 제보 부재는 "조회 시점 기준 공개 승인된 피해 제보는 확인되지 않습니다"로만 표현한다.
- WHOIS 비공개, CDN, 동일 IP 관측은 기술적 관측으로만 설명한다.
- DNS/WHOIS 조회 실패가 있으면 "일부 DNS 또는 WHOIS 정보는 조회 시점에 확인되지 않았습니다." 문장을 유지한다.
- body_md에는 Source Snapshot의 site_specific_verification 값이 반영되어야 한다.
- body_md에는 대표 도메인, 추가 도메인 수, DNS 조회 결과, WHOIS 등록일/갱신일/만료일, 공개 승인 리뷰 수, 공개 승인 피해 제보 수, 마지막 정보 확인 시각이 빠지면 안 된다.
- Source Snapshot에 display_domain, display_url, primary_domain_display, additional_domains_display 값이 있으면 사람이 읽는 도메인 표기는 해당 값을 우선 사용한다. xn-- punycode 도메인을 본문, FAQ, checklist에 단독 표기로 남기지 않는다.
- "마지막 정보 확인 시각: YYYY-MM-DD HH:mm KST" 형식의 문장을 유지한다.
- 사이트마다 동일한 템플릿 문장만 반복되는 본문은 site_specific_verification 값을 이용해 해당 사이트 고유 문장으로 고친다.
- Claude draft_markdown, faq, checklist, editor_notes를 모두 검토해 CMS JSON으로 정리한다.
- 제목, 메타 제목, 메타 설명, FAQ, checklist를 정리한다.
- 금지 표현, 과도한 단정 표현, 확인되지 않은 주장, 홍보성 표현, 이용/접근 지원 표현을 검사한다.
- prohibited_phrase_check는 최종 body_md, FAQ, checklist, title, meta_description 전체를 기준으로 엄격히 채운다.
- 확인되지 않은 주장은 제거하거나 summary.unknowns에 분리한다.
- FAQ risk_level은 low, medium, high 중 하나로 지정한다.
- needs_human_legal_review는 true로 둔다.
- JSON 문자열 안의 모든 본문은 한국어로 작성한다.
${hasLookupFailures ? '- 이번 초안에는 DNS/WHOIS 조회 실패 안내 문장이 반드시 포함되어야 한다.' : ""}
${updateContext ? '- 이 출력은 기존 글의 업데이트 초안이다. slug는 기존 slug를 유지하고, update_context.change_summary에 있는 변경 사항을 본문과 summary에 반영한다.' : ""}

출력 JSON:
{
  "title": "",
  "slug": "",
  "meta_title": "",
  "meta_description": "",
  "primary_keyword": "",
  "secondary_keywords": [],
  "category_strategy": {
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
  },
  "body_md": "",
  "faq_json": [
    {
      "question": "",
      "answer": "",
      "risk_level": "low | medium | high"
    }
  ],
  "checklist_json": [
    {
      "item": "",
      "reason": ""
    }
  ],
  "summary": {
    "confirmed_facts": [],
    "inferences": [],
    "unknowns": []
  },
  "admin_warnings": [],
  "prohibited_phrase_check": {
    "contains_recommendation": false,
    "contains_signup_cta": false,
    "contains_bonus_or_event_promo": false,
    "contains_absolute_safety_claim": false,
    "contains_uncited_claims": false,
    "contains_access_facilitation": false
  },
  "needs_human_legal_review": true
}

${previousViolations?.length ? `이전 출력에서 발견된 금지 표현:\n${toJsonText(previousViolations)}\n반드시 수정하세요.` : ""}

Source Snapshot:
${toJsonText(snapshot)}

${updateContext ? `Update Context:\n${toJsonText(updateContext)}\n` : ""}

OpenAI SEO Plan:
${toJsonText(seoPlan)}

Claude Draft JSON:
${toJsonText(claudeDraft)}`;
}
