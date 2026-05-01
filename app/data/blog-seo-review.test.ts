import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBlogKeywords,
  calculateBodySimilarity,
  calculateNormalizedBodySimilarity,
  calculateAverageWordsPerSentence,
  calculateUniqueFactScore,
  detectForbiddenPublicBodyTerms,
  detectKeywordStuffing,
  detectWeakSeoTermsInImportantFields,
  normalizeBodyForSimilarity,
  normalizeH2Pattern,
  normalizeTitlePattern,
  reviewBlogDuplicateRisk,
  validateBlogSeoDraft,
} from "./blog-seo-review";

const validBody = [
  "# 민속촌 토토사이트 검증 리포트",
  "## 민속촌 토토사이트 검증 기준",
  "민속촌 토토사이트는 등록 도메인과 DNS 조회값을 함께 확인해야 하는 정보 리포트 대상입니다.",
  "## 민속촌 주소 확인 방법",
  "민속촌 주소는 등록된 대표 도메인과 추가 승인 도메인을 나눠 확인하고, 외부 이동 링크 대신 내부 상세 페이지에서 공개 데이터를 비교합니다.",
  "## 민속촌 도메인과 DNS 기록",
  "민속촌 도메인은 WHOIS 생성일, 네임서버, A 레코드 관측값을 함께 보아야 변경 흐름을 더 구체적으로 파악할 수 있습니다.",
  "## 민속촌 먹튀 제보 현황",
  "최근 승인 리뷰 6건과 먹튀 제보 1건이 함께 기록되어 있어 단일 후기보다 여러 신호를 같이 보는 구성이 필요합니다.",
  "민속촌 먹튀 제보는 승인된 신고 수와 접수 시점을 기준으로만 설명하며, 단정적인 안전 판단으로 바꾸지 않습니다.",
  "## 민속촌 후기 요약",
  "WHOIS 생성일과 네임서버 값은 도메인 변경 여부를 판단할 때 보조 근거로 활용할 수 있습니다.",
  "동일 IP 관측값은 없지만 추가 도메인 2개가 승인 상태로 기록되어 주소 확인 항목을 분리했습니다.",
  "민속촌 후기는 결제, 고객지원, 계정 제한처럼 실제 이용 경험에서 반복되는 항목을 중심으로 확인합니다.",
  "## FAQ",
  "이 글은 가입 유도가 아니라 확인 가능한 데이터와 이용 전 체크리스트를 정리합니다.",
].join("\n\n");

const validDraft = {
  siteName: "민속촌",
  slug: "minsokchon-totosite",
  title: "민속촌 토토사이트 검증 리포트",
  metaTitle: "민속촌 토토사이트 검증 | 주소·도메인·먹튀 제보 현황",
  metaDescription: "민속촌 토토사이트 주소, 도메인, DNS, 승인 후기와 먹튀 제보 현황을 정리한 정보 리포트입니다.",
  h1: "민속촌 토토사이트 검증 리포트",
  bodyMd: validBody,
  faq: [
    { question: "민속촌 주소는 어떻게 확인하나요?", answer: "등록 도메인과 최근 승인 데이터를 함께 확인합니다." },
    { question: "민속촌 먹튀 제보가 있나요?", answer: "승인된 제보 수와 내용을 기준으로 확인합니다." },
    { question: "민속촌 후기는 어떻게 봐야 하나요?", answer: "평점보다 구체적인 경험과 시점을 함께 봅니다." },
    { question: "도메인 변경은 위험 신호인가요?", answer: "변경 자체보다 반복 여부와 공지 경로를 함께 확인합니다." },
  ],
  internalLinks: [
    { href: "/sites/minsokchon", label: "민속촌 상세" },
    { href: "/scam-reports", label: "먹튀 제보" },
    { href: "/reviews", label: "후기" },
  ],
  externalLinks: [{ href: "https://lookup.icann.org", label: "ICANN Lookup" }],
  facts: [
    "승인 리뷰 6건",
    "먹튀 제보 1건",
    "추가 도메인 2개",
    "WHOIS 생성일 확인",
    "네임서버 2개",
  ],
};

test("buildBlogKeywords returns the required primary and secondary keywords", () => {
  assert.deepEqual(buildBlogKeywords("민속촌"), {
    primaryKeyword: "민속촌 토토사이트",
    secondaryKeywords: [
      "민속촌 토토사이트 검증",
      "민속촌 주소",
      "민속촌 도메인",
      "민속촌 먹튀",
      "민속촌 먹튀 제보",
      "민속촌 후기",
    ],
  });
});

test("normalizeTitlePattern removes site-specific values", () => {
  assert.equal(
    normalizeTitlePattern("민속촌 토토사이트 검증: 승인 리뷰 6건과 도메인 2개", "민속촌"),
    "{사이트명} 토토사이트 검증: 승인 리뷰 {n}건과 도메인 {n}개",
  );
});

test("normalizeBodyForSimilarity normalizes markdown, domains, numbers, and site name", () => {
  assert.equal(
    normalizeBodyForSimilarity(
      "# 민속촌 주소\n민속촌 토토사이트는 https://example.com 도메인 2개를 기록했습니다.",
      "민속촌",
    ),
    "{사이트명} 주소 {사이트명} 토토사이트는 {url} 도메인 {n}개를 기록했습니다".toLowerCase(),
  );
});

test("normalizeH2Pattern joins normalized section heading patterns", () => {
  assert.equal(
    normalizeH2Pattern(
      ["민속촌 주소 2개 확인", "민속촌 먹튀 제보 1건"],
      "민속촌",
    ),
    "{사이트명} 주소 {n}개 확인 | {사이트명} 먹튀 제보 {n}건",
  );
});

test("calculate body similarity returns high scores for near duplicates", () => {
  assert.equal(
    calculateBodySimilarity(
      "민속촌 토토사이트 도메인 승인 리뷰 먹튀 제보 dns whois",
      "민속촌 토토사이트 도메인 승인 리뷰 먹튀 제보 dns whois",
    ),
    1,
  );
  assert.ok(
    calculateNormalizedBodySimilarity({
      bodyA: "민속촌 토토사이트는 승인 리뷰 6건과 도메인 2개를 확인했습니다.",
      bodyB: "민속촌 토토사이트는 승인 리뷰 5건과 도메인 3개를 확인했습니다.",
      siteNameA: "민속촌",
    }) >= 0.8,
  );
});

test("detectForbiddenPublicBodyTerms finds internal AI fields", () => {
  const matches = detectForbiddenPublicBodyTerms(
    "검색 의도: 정보 탐색\nclaim_map 값은 Source Snapshot 기준입니다.",
  );

  assert.deepEqual(
    matches.map((match) => match.term),
    ["검색 의도", "claim_map", "Source Snapshot"],
  );
});

test("detectWeakSeoTermsInImportantFields warns on missing primary keyword and weak terms", () => {
  const result = detectWeakSeoTermsInImportantFields({
    title: "민속촌 공개 제보 현황",
    metaTitle: "민속촌 토토사이트 검증",
    h1: "민속촌 후기",
    siteName: "민속촌",
  });

  assert.deepEqual(result.missingPrimaryKeywordFields, ["title", "h1"]);
  assert.deepEqual(result.weakTermMatches, [
    { field: "title", term: "공개 제보" },
  ]);
});

test("detectKeywordStuffing catches keyword list sections", () => {
  const result = detectKeywordStuffing(
    [
      "키워드 목록: 민속촌 토토사이트, 민속촌 토토사이트 검증, 민속촌 주소, 민속촌 도메인",
      "- 민속촌 먹튀",
      "- 민속촌 먹튀 제보",
      "- 민속촌 후기",
    ].join("\n"),
    "민속촌",
  );

  assert.equal(result.hasKeywordStuffing, true);
  assert.ok(result.matches.length > 0);
});

test("calculateUniqueFactScore counts distinct non-empty facts", () => {
  assert.equal(
    calculateUniqueFactScore([
      "승인 리뷰 6건",
      "승인 리뷰 6건",
      "먹튀 제보 1건",
      { domains: ["추가 도메인 2개"], dns: "네임서버 2개" },
    ]),
    4,
  );
});

test("calculateAverageWordsPerSentence returns a one-decimal average", () => {
  assert.equal(
    calculateAverageWordsPerSentence("민속촌 토토사이트는 도메인 기록을 확인합니다. 승인 리뷰와 제보를 함께 봅니다."),
    5,
  );
});

test("validateBlogSeoDraft passes a complete SEO draft", () => {
  const result = validateBlogSeoDraft(validDraft);

  assert.equal(result.seoReviewStatus, "passed");
  assert.equal(result.uniqueFactScore, 5);
  assert.equal(result.keywordChecks.titleHasPrimaryKeyword, true);
  assert.deepEqual(result.adminWarnings, []);
});

test("validateBlogSeoDraft warns when slug looks internal ID centered", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    slug: "site-mok5zh5i-778j-totosite-report",
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("slug가 내부 ID 중심"),
    ),
  );
  assert.equal(result.keywordChecks.slugQuality.isInternalIdLike, true);
});

test("validateBlogSeoDraft warns when slug contains a uuid", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    slug: "minsokchon-550e8400-e29b-41d4-a716-446655440000-totosite",
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("slug가 내부 ID 중심"),
    ),
  );
  assert.equal(result.keywordChecks.slugQuality.isInternalIdLike, true);
});

test("validateBlogSeoDraft accepts a readable romanized site slug", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    slug: "minsokchon-totosite",
  });

  assert.equal(result.seoReviewStatus, "passed");
  assert.deepEqual(result.keywordChecks.slugQuality.warnings, []);
});

test("validateBlogSeoDraft fails when slug is empty", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    slug: "",
  });

  assert.equal(result.seoReviewStatus, "failed");
  assert.ok(
    result.adminWarnings.some((warning) => warning.includes("slug가 비어")),
  );
  assert.equal(result.keywordChecks.slugQuality.isEmpty, true);
});

test("validateBlogSeoDraft warns when slug is longer than 80 characters", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    slug: `minsokchon-totosite-${"domain-".repeat(12)}`,
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) => warning.includes("slug가 너무 깁니다")),
  );
  assert.equal(result.keywordChecks.slugQuality.isTooLong, true);
});

test("validateBlogSeoDraft warns when internal link anchor text repeats", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    internalLinks: [
      { href: "/sites/minsokchon", label: "민속촌 상세 정보" },
      { href: "/sites/minsokchon/reports", label: "민속촌 상세 정보" },
      { href: "/reviews", label: "민속촌 후기 확인" },
    ],
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("동일한 내부 링크 앵커 텍스트"),
    ),
  );
  assert.deepEqual(result.keywordChecks.duplicateInternalAnchorTexts, [
    { anchor: "민속촌 상세 정보", count: 2 },
  ]);
});

test("validateBlogSeoDraft allows the same href with different internal anchor text", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    internalLinks: [
      { href: "/sites/minsokchon", label: "민속촌 상세 정보" },
      { href: "/sites/minsokchon", label: "민속촌 도메인 기록" },
      { href: "/sites/minsokchon", label: "민속촌 먹튀 제보 확인" },
    ],
  });

  assert.equal(
    result.adminWarnings.some((warning) =>
      warning.includes("동일한 내부 링크 앵커 텍스트"),
    ),
    false,
  );
  assert.deepEqual(result.keywordChecks.duplicateInternalAnchorTexts, []);
});

test("validateBlogSeoDraft warns when external reference links are empty", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [],
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("참고 자료용 외부 링크가 없습니다"),
    ),
  );
  assert.equal(result.keywordChecks.externalReferenceReview.linkCount, 0);
  assert.equal(result.keywordChecks.externalReferenceReview.validCount, 0);
});

test("validateBlogSeoDraft accepts ICANN external references", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      {
        href: "https://www.icann.org/resources/pages/rdap-2018-02-02-en",
        label: "ICANN RDAP 안내",
      },
    ],
  });

  assert.equal(result.seoReviewStatus, "passed");
  assert.equal(result.keywordChecks.externalReferenceReview.validCount, 1);
  assert.deepEqual(result.keywordChecks.externalReferenceReview.untrustedLinks, []);
  assert.deepEqual(result.keywordChecks.externalReferenceReview.disallowedLinks, []);
});

test("validateBlogSeoDraft accepts Cloudflare docs external references", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      {
        href: "https://developers.cloudflare.com/dns/",
        label: "Cloudflare DNS 설명",
      },
    ],
  });

  assert.equal(result.seoReviewStatus, "passed");
  assert.equal(result.keywordChecks.externalReferenceReview.validCount, 1);
});

test("validateBlogSeoDraft accepts KCGP 1336 external references", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      {
        href: "https://www.kcgp.or.kr/pcMain.do",
        label: "한국도박문제예방치유원 1336 안내",
      },
    ],
  });

  assert.equal(result.seoReviewStatus, "passed");
  assert.equal(result.keywordChecks.externalReferenceReview.validCount, 1);
});

test("validateBlogSeoDraft fails when external reference labels are promotional", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      { href: "https://lookup.icann.org", label: "가입하기" },
      { href: "https://lookup.icann.org", label: "이벤트 확인" },
      { href: "https://lookup.icann.org", label: "우회주소 안내" },
    ],
  });

  assert.equal(result.seoReviewStatus, "failed");
  assert.equal(result.keywordChecks.externalReferenceReview.disallowedLinks.length, 3);
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("허용되지 않는 외부 참고 링크"),
    ),
  );
});

test("validateBlogSeoDraft warns when external reference is outside the allowlist", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      {
        href: "https://example.org/dns-guide",
        label: "DNS 설명 자료",
      },
    ],
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.equal(result.keywordChecks.externalReferenceReview.untrustedLinks.length, 1);
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("허용된 참고 자료 도메인이 아닌 외부 링크"),
    ),
  );
});

test("validateBlogSeoDraft fails when external reference looks like a toto URL", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    externalLinks: [
      {
        href: "https://best-toto.example/signup",
        label: "토토사이트 바로가기",
      },
    ],
  });

  assert.equal(result.seoReviewStatus, "failed");
  assert.equal(result.keywordChecks.externalReferenceReview.disallowedLinks.length, 1);
});

test("validateBlogSeoDraft passes secondary keyword coverage when all are included", () => {
  const result = validateBlogSeoDraft(validDraft);

  assert.equal(result.seoReviewStatus, "passed");
  assert.equal(result.keywordChecks.secondaryKeywordCoverage.presentCount, 6);
  assert.deepEqual(result.keywordChecks.secondaryKeywordCoverage.missing, []);
  assert.ok(result.keywordChecks.h2KeywordCoverage.presentCount >= 4);
});

test("validateBlogSeoDraft warns when some secondary keywords are missing", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    bodyMd: validBody.replace(
      "## 민속촌 후기 요약\n\nWHOIS 생성일과 네임서버 값은 도메인 변경 여부를 판단할 때 보조 근거로 활용할 수 있습니다.\n\n동일 IP 관측값은 없지만 추가 도메인 2개가 승인 상태로 기록되어 주소 확인 항목을 분리했습니다.\n\n민속촌 후기는 결제, 고객지원, 계정 제한처럼 실제 이용 경험에서 반복되는 항목을 중심으로 확인합니다.",
      "## 이용자 경험 요약\n\nWHOIS 생성일과 네임서버 값은 도메인 변경 여부를 판단할 때 보조 근거로 활용할 수 있습니다.\n\n동일 IP 관측값은 없지만 추가 도메인 2개가 승인 상태로 기록되어 주소 확인 항목을 분리했습니다.\n\n이용자 경험은 결제, 고객지원, 계정 제한처럼 실제 이용 흐름에서 반복되는 항목을 중심으로 확인합니다.",
    ),
    faq: [
      { question: "민속촌 주소는 어떻게 확인하나요?", answer: "등록 도메인과 최근 승인 데이터를 함께 확인합니다." },
      { question: "민속촌 먹튀 제보가 있나요?", answer: "승인된 제보 수와 내용을 기준으로 확인합니다." },
      { question: "이용자 경험은 어떻게 봐야 하나요?", answer: "평점보다 구체적인 경험과 시점을 함께 봅니다." },
      { question: "도메인 변경은 위험 신호인가요?", answer: "변경 자체보다 반복 여부와 공지 경로를 함께 확인합니다." },
    ],
  });

  assert.equal(result.seoReviewStatus, "warning");
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes("일부 보조 키워드"),
    ),
  );
  assert.deepEqual(result.keywordChecks.secondaryKeywordCoverage.missing, [
    "민속촌 후기",
  ]);
});

test("validateBlogSeoDraft fails when secondary keywords only appear as a keyword list", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    bodyMd: [
      "# 민속촌 토토사이트 검증 리포트",
      "키워드 목록: 민속촌 토토사이트 검증, 민속촌 주소, 민속촌 도메인, 민속촌 먹튀, 민속촌 먹튀 제보, 민속촌 후기",
      "본문은 키워드 나열을 제거하고 공개 데이터 중심으로 다시 작성해야 합니다.",
    ].join("\n\n"),
  });

  assert.equal(result.seoReviewStatus, "failed");
  assert.ok(result.adminWarnings.some((warning) => warning.includes("키워드 나열")));
  assert.equal(result.keywordChecks.keywordStuffing.hasKeywordStuffing, true);
});

test("validateBlogSeoDraft warns when title metaTitle and h1 miss the primary keyword", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    title: "민속촌 검증 리포트",
    metaTitle: "민속촌 주소·도메인 확인",
    h1: "민속촌 정보 리포트",
  });

  assert.notEqual(result.seoReviewStatus, "passed");
  assert.deepEqual(
    [
      result.keywordChecks.titleHasPrimaryKeyword,
      result.keywordChecks.metaTitleHasPrimaryKeyword,
      result.keywordChecks.h1HasPrimaryKeyword,
    ],
    [false, false, false],
  );
  assert.ok(
    result.adminWarnings.some((warning) =>
      warning.includes('title에 "민속촌 토토사이트"가 없습니다'),
    ),
  );
});

test("validateBlogSeoDraft fails internal fields, keyword lists, and very low facts", () => {
  const result = validateBlogSeoDraft({
    ...validDraft,
    title: "민속촌 공개 제보 현황",
    metaTitle: "민속촌 공개 제보 현황",
    h1: "민속촌 공개 제보 현황",
    bodyMd: "검색 의도: 정보 탐색\n키워드 목록: 민속촌 토토사이트, 민속촌 주소, 민속촌 도메인, 민속촌 먹튀",
    faq: [],
    internalLinks: [],
    facts: ["승인 리뷰 1건", "도메인 1개"],
  });

  assert.equal(result.seoReviewStatus, "failed");
  assert.ok(result.adminWarnings.some((warning) => warning.includes("AI 내부 분석 필드")));
  assert.ok(result.adminWarnings.some((warning) => warning.includes("키워드 나열")));
  assert.ok(result.adminWarnings.some((warning) => warning.includes("3개 미만")));
  assert.deepEqual(result.keywordChecks.forbiddenPublicBodyTerms.map((match) => match.term), [
    "검색 의도",
  ]);
});

test("reviewBlogDuplicateRisk fails drafts with 80 percent body similarity", () => {
  const result = reviewBlogDuplicateRisk({
    siteName: "민속촌",
    title: "민속촌 토토사이트 검증 리포트",
    bodyMd: validBody,
    h2Headings: ["민속촌 주소 확인", "민속촌 먹튀 제보 현황"],
    facts: validDraft.facts,
    comparisonPosts: [
      {
        slug: "previous-post",
        siteName: "민속촌",
        title: "민속촌 토토사이트 검증 리포트",
        bodyMd: validBody,
        h2Headings: ["민속촌 주소 확인", "민속촌 먹튀 제보 현황"],
      },
    ],
  });

  assert.equal(result.duplicateRisk, "failed");
  assert.ok(result.maxBodySimilarity >= 0.8);
  assert.equal(result.mostSimilarPostSlug, "previous-post");
});

test("reviewBlogDuplicateRisk raises medium for repeated title and H2 patterns", () => {
  const comparisonPosts = Array.from({ length: 5 }, (_, index) => ({
    slug: `post-${index}`,
    siteName: "민속촌",
    title: "민속촌 토토사이트 검증 리포트",
    bodyMd: `완전히 다른 본문 ${index} 승인 데이터와 DNS 관측값을 설명합니다.`,
    h2Headings: ["민속촌 주소 확인", "민속촌 먹튀 제보 현황"],
  }));
  const result = reviewBlogDuplicateRisk({
    siteName: "민속촌",
    title: "민속촌 토토사이트 검증 리포트",
    bodyMd: validBody,
    h2Headings: ["민속촌 주소 확인", "민속촌 먹튀 제보 현황"],
    facts: validDraft.facts,
    comparisonPosts,
  });

  assert.equal(result.duplicateRisk, "medium");
  assert.equal(result.titlePatternCount, 5);
  assert.equal(result.h2PatternCount, 5);
  assert.ok(
    result.adminWarnings.some((warning) => warning.includes("title pattern")),
  );
});

test("reviewBlogDuplicateRisk applies unique fact score risk thresholds", () => {
  assert.equal(
    reviewBlogDuplicateRisk({
      siteName: "민속촌",
      title: "민속촌 토토사이트 검증 리포트",
      bodyMd: validBody,
      h2Headings: ["민속촌 주소 확인"],
      facts: ["리뷰 1건", "도메인 1개"],
      comparisonPosts: [],
    }).duplicateRisk,
    "failed",
  );

  assert.equal(
    reviewBlogDuplicateRisk({
      siteName: "민속촌",
      title: "민속촌 토토사이트 검증 리포트",
      bodyMd: validBody,
      h2Headings: ["민속촌 주소 확인"],
      facts: ["리뷰 1건", "도메인 1개", "DNS 확인", "WHOIS 확인"],
      comparisonPosts: [],
    }).duplicateRisk,
    "medium",
  );
});
