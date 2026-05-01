import {
  footerNavigationLinks,
  primaryNavigationLinks,
} from "./site-navigation";
import {
  reviewBlogImageSeo,
  type BlogImageSeoReview,
} from "./blog-visuals";

export type BlogSeoReviewStatus =
  | "not_reviewed"
  | "passed"
  | "warning"
  | "failed";

export type BlogDuplicateRisk =
  | "unknown"
  | "low"
  | "medium"
  | "high"
  | "failed";

export type BlogSeoDraftFaq = {
  question?: string | null;
  answer?: string | null;
};

export type BlogSeoDraftLink = {
  href?: string | null;
  url?: string | null;
  label?: string | null;
  anchor?: string | null;
  text?: string | null;
  placement?: string | null;
  purpose?: string | null;
};

export type BlogRenderedInternalAnchorSource =
  | "header_nav"
  | "breadcrumb"
  | "body_internal_links"
  | "related_posts"
  | "footer_links";

export type BlogRenderedInternalAnchor = {
  source: BlogRenderedInternalAnchorSource;
  href: string;
  label: string;
  setIndex?: number;
};

export type BlogRenderedHeaderNavSetDuplicate = {
  signature: string;
  count: number;
  setIndexes: number[];
  links: BlogSeoDraftLink[];
};

export type BlogRenderedInternalAnchorInput = {
  headerNavLinkSets?: BlogSeoDraftLink[][];
  breadcrumbLinks?: BlogSeoDraftLink[];
  bodyInternalLinks?: BlogSeoDraftLink[];
  relatedPostLinks?: BlogSeoDraftLink[];
  footerLinks?: BlogSeoDraftLink[];
  bodyMd?: string | null;
};

export type BlogRenderedInternalAnchorReview = {
  renderedAnchors: BlogRenderedInternalAnchor[];
  duplicateBodyAnchorTexts: DuplicateInternalAnchorText[];
  duplicateHeaderNavSets: BlogRenderedHeaderNavSetDuplicate[];
};

export type BlogSeoDraftInput = {
  siteName: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  bodyMd: string;
  faq: BlogSeoDraftFaq[];
  internalLinks: BlogSeoDraftLink[];
  externalLinks: BlogSeoDraftLink[];
  facts: unknown;
  renderedInternalAnchors?: BlogRenderedInternalAnchorInput;
  imageSeo?: {
    screenshots?: Array<string | null | undefined> | null;
    featuredImageUrl?: string | null;
    featuredImageAlt?: string | null;
    logoUrl?: string | null;
  };
};

export type BlogKeywordSet = {
  primaryKeyword: string;
  secondaryKeywords: string[];
};

export type ForbiddenPublicBodyTermMatch = {
  term: string;
  sample: string;
};

export type PromotionalBodyEmphasisMatch = {
  term: string;
  sample: string;
};

export type WeakSeoTermMatch = {
  field: "title" | "metaTitle" | "h1";
  term: string;
};

export type WeakSeoTermReview = {
  warnings: string[];
  missingPrimaryKeywordFields: Array<"title" | "metaTitle" | "h1">;
  weakTermMatches: WeakSeoTermMatch[];
};

export type KeywordStuffingReview = {
  hasKeywordStuffing: boolean;
  warnings: string[];
  matches: string[];
  primaryKeywordCount: number;
};

export type DuplicateInternalAnchorText = {
  anchor: string;
  count: number;
};

export type InternalAnchorPlacement =
  | "summary"
  | "address_domain_section"
  | "dns_section"
  | "reports_section"
  | "reviews_section"
  | "faq";

export type SecondaryKeywordCoverage = {
  missing: string[];
  present: string[];
  presentCount: number;
};

export type H2KeywordCoverage = {
  h2s: string[];
  coveredTypes: string[];
  missingTypes: string[];
  presentCount: number;
};

export type ExternalReferenceIssue = {
  href: string;
  label: string;
  reason: string;
};

export type ExternalReferenceReview = {
  linkCount: number;
  validCount: number;
  untrustedLinks: ExternalReferenceIssue[];
  disallowedLinks: ExternalReferenceIssue[];
};

export type SlugQualityReview = {
  slug: string;
  warnings: string[];
  isEmpty: boolean;
  isInternalIdLike: boolean;
  isTooLong: boolean;
  hasMeaningfulKeyword: boolean;
};

export type BlogKeywordChecks = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleHasPrimaryKeyword: boolean;
  metaTitleHasPrimaryKeyword: boolean;
  h1HasPrimaryKeyword: boolean;
  secondaryKeywordCoverage: SecondaryKeywordCoverage;
  h2KeywordCoverage: H2KeywordCoverage;
  duplicateInternalAnchorTexts: DuplicateInternalAnchorText[];
  renderedInternalAnchorReview: BlogRenderedInternalAnchorReview;
  imageSeoReview: BlogImageSeoReview;
  externalReferenceReview: ExternalReferenceReview;
  forbiddenPublicBodyTerms: ForbiddenPublicBodyTermMatch[];
  promotionalBodyEmphasis: PromotionalBodyEmphasisMatch[];
  weakSeoTerms: WeakSeoTermMatch[];
  keywordStuffing: KeywordStuffingReview;
  slugQuality: SlugQualityReview;
  averageWordsPerSentence: number;
};

export type BlogSeoDraftValidation = {
  seoReviewStatus: BlogSeoReviewStatus;
  adminWarnings: string[];
  uniqueFactScore: number;
  duplicateRiskHints: string[];
  keywordChecks: BlogKeywordChecks;
};

export type BlogDuplicateComparisonPost = {
  id?: string | null;
  slug?: string | null;
  siteName?: string | null;
  title?: string | null;
  bodyMd?: string | null;
  h2Headings?: string[] | null;
  normalizedTitlePattern?: string | null;
  normalizedH2Pattern?: string | null;
};

export type BlogDuplicateRiskReview = {
  duplicateRisk: BlogDuplicateRisk;
  adminWarnings: string[];
  duplicateRiskHints: string[];
  uniqueFactScore: number;
  maxBodySimilarity: number;
  mostSimilarPostSlug: string | null;
  titlePatternCount: number;
  h2PatternCount: number;
  normalizedTitlePattern: string;
  normalizedH2Pattern: string;
  normalizedBody: string;
};

const forbiddenPublicBodyTerms = [
  "핵심 키워드",
  "검색 의도",
  "이 글의 작성 방향",
  "확인된 사실",
  "추정:",
  "미확인 항목",
  "claim_map",
  "writing_brief",
  "Source Snapshot",
  "derived_facts",
  "sameIpSites",
  "lookup_status",
  "secondary_keywords",
  "primary_keyword",
];

const promotionalBodyEmphasisPatterns: Array<{
  term: string;
  pattern: RegExp;
}> = [
  { term: "가입", pattern: /가입\s*(?:하기|하세요|하시면|혜택|코드|페이지|링크)/g },
  { term: "입금", pattern: /입금\s*(?:보너스|혜택|이벤트|방법|링크|페이지|안내|추천)/g },
  { term: "충전", pattern: /충전\s*(?:보너스|혜택|이벤트|방법|링크|페이지|안내|추천)/g },
  { term: "환전", pattern: /환전\s*(?:보너스|혜택|이벤트|방법|링크|페이지|안내|추천)/g },
  { term: "보너스", pattern: /보너스\s*(?:혜택|지급|제공|소개|확인|받기|이벤트)?/g },
  { term: "이벤트", pattern: /이벤트\s*(?:혜택|지급|제공|소개|참여|확인|받기|진행|안내)?/g },
  { term: "추천", pattern: /추천(?:합니다|드립니다|목록|사이트|코드)?/g },
  { term: "바로가기", pattern: /바로\s*가기|바로가기/g },
  { term: "최신 주소", pattern: /최신\s*주소/g },
  { term: "우회 주소", pattern: /우회\s*주소/g },
  { term: "첫충", pattern: /첫충/g },
  { term: "매충", pattern: /매충/g },
  { term: "쿠폰", pattern: /쿠폰/g },
];

const weakImportantFieldTerms = [
  "공개 제보",
  "공개 피해",
  "공개 데이터",
  "공개 먹튀 제보",
];

const shortAverageSentenceWordThreshold = 7;

const duplicateInternalAnchorWarning =
  "본문 내부 링크에서 동일한 내부 링크 앵커 텍스트가 반복되고 있습니다. 같은 URL이라도 문맥에 맞는 다른 앵커를 사용하세요.";

const duplicateHeaderNavSetWarning =
  "블로그 상세 페이지의 상단 nav 링크 세트가 DOM에 2회 이상 렌더링될 수 있습니다. 모바일 메뉴는 열기 전 DOM에 렌더링하지 말고 header 안의 같은 nav 세트를 1회만 유지하세요.";

const imageSeoFailureWarning =
  "블로그 이미지 SEO 검수에서 실패 항목이 확인되었습니다.";

const missingExternalReferenceWarning =
  "참고 자료용 외부 링크가 없습니다. ICANN, DNS 설명 자료, 도박문제 상담 안내 등 신뢰 보강용 참고 링크를 1개 이상 추가하세요.";

const disallowedExternalReferenceWarning =
  "허용되지 않는 외부 참고 링크가 포함되어 있습니다. 외부 토토사이트, 가입 페이지, 이벤트 페이지, 충전 페이지, 우회 주소는 참고 자료 링크로 사용할 수 없습니다.";

const untrustedExternalReferenceWarning =
  "허용된 참고 자료 도메인이 아닌 외부 링크가 포함되어 있습니다. ICANN, Cloudflare DNS 설명, 한국도박문제예방치유원 1336 안내 등 신뢰 보강용 자료만 사용하세요.";

const secondaryKeywordMissingWarning =
  "일부 보조 키워드가 본문, FAQ 또는 내부 링크 앵커에 자연스럽게 포함되지 않았습니다.";

const secondaryKeywordMissingFailure =
  "보조 키워드가 본문, FAQ 또는 내부 링크 앵커에 포함되어 있지 않습니다.";

const h2KeywordCoverageWarning =
  "사이트명 기반 H2 유형이 4개 미만입니다. 토토사이트, 주소, 도메인, 먹튀, 후기, FAQ 관련 H2를 문맥에 맞게 보강하세요.";

const emptySlugFailure =
  "slug가 비어 있습니다. 검색 사용자가 이해할 수 있는 {사이트명}-totosite 형식의 slug가 필요합니다.";

const internalIdSlugWarning =
  "slug가 내부 ID 중심으로 보입니다. 검색 사용자가 이해할 수 있는 {사이트명}-totosite 형식의 slug를 권장합니다.";

const longSlugWarning =
  "slug가 너무 깁니다. 검색 결과와 공유 URL에서 읽기 쉬운 짧은 slug를 권장합니다.";

const maxRecommendedSlugLength = 80;

const uuidSlugPattern =
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

const meaningfulSlugTerms = [
  "totosite",
  "geomjeung",
  "domain",
  "review",
  "scam",
  "meoktwi",
];

const allowedExternalReferenceDomains = new Set([
  "lookup.icann.org",
  "icann.org",
  "www.icann.org",
  "developers.cloudflare.com",
  "cloudflare.com",
  "www.cloudflare.com",
  "kcgp.or.kr",
  "www.kcgp.or.kr",
]);

const disallowedExternalReferencePatterns = [
  /토토/i,
  /toto/i,
  /카지노/i,
  /casino/i,
  /sportsbook/i,
  /(?:^|[.-])bet(?:[.-]|$)/i,
  /가입/,
  /바로가기/,
  /접속/,
  /최신주소/,
  /최신\s*주소/,
  /우회주소/,
  /우회\s*주소/,
  /이벤트/,
  /충전/,
  /환전/,
  /보너스/,
  /첫충/,
  /쿠폰/,
  /추천/,
  /총판/,
  /파트너/,
  /우회/,
  /signup/i,
  /sign-up/i,
  /register/i,
  /join/i,
  /event/i,
  /bonus/i,
  /promo/i,
  /coupon/i,
  /deposit/i,
  /recharge/i,
  /cashier/i,
  /affiliate/i,
  /partner/i,
  /ref=/i,
  /code=/i,
];

export function buildBlogKeywords(siteName: string): BlogKeywordSet {
  const normalizedSiteName = normalizeWhitespace(siteName) || "{사이트명}";

  return {
    primaryKeyword: `${normalizedSiteName} 토토사이트`,
    secondaryKeywords: [
      `${normalizedSiteName} 토토사이트 검증`,
      `${normalizedSiteName} 주소`,
      `${normalizedSiteName} 도메인`,
      `${normalizedSiteName} 먹튀`,
      `${normalizedSiteName} 먹튀 제보`,
      `${normalizedSiteName} 후기`,
    ],
  };
}

export function normalizeTitlePattern(title: string, siteName: string) {
  const { primaryKeyword } = buildBlogKeywords(siteName);
  const normalizedSiteName = normalizeWhitespace(siteName);
  const normalizedTitle = normalizeWhitespace(title)
    .replace(/\d{4}[.-]\d{1,2}[.-]\d{1,2}/g, "{date}")
    .replace(/https?:\/\/[^\s)]+/gi, "{url}")
    .replace(/[a-z0-9.-]+\.[a-z]{2,}/gi, "{domain}")
    .replace(new RegExp(escapeRegExp(primaryKeyword), "gi"), "{사이트명} 토토사이트");

  return (normalizedSiteName
    ? normalizedTitle.replace(
        new RegExp(escapeRegExp(normalizedSiteName), "gi"),
        "{사이트명}",
      )
    : normalizedTitle)
    .replace(/\d+(?:\.\d+)?\s*(건|개|명|점|회|%)?/g, "{n}$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBodyForSimilarity(body: string, siteName: string) {
  const withoutCodeBlocks = body.replace(/```[\s\S]*?```/g, " ");
  const withoutMarkdownLinks = withoutCodeBlocks.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  return normalizeTitlePattern(withoutMarkdownLinks, siteName)
    .toLowerCase()
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>|~\-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s{}|가-힣]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeH2Pattern(headings: string[], siteName: string) {
  return headings
    .map((heading) => normalizeTitlePattern(heading, siteName))
    .filter(Boolean)
    .join(" | ");
}

export function calculateBodySimilarity(
  normalizedBodyA: string,
  normalizedBodyB: string,
) {
  const tokensA = toSimilarityTokens(normalizedBodyA);
  const tokensB = toSimilarityTokens(normalizedBodyB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const countsA = countTokens(tokensA);
  const countsB = countTokens(tokensB);
  let overlap = 0;

  for (const [token, countA] of countsA.entries()) {
    const countB = countsB.get(token) ?? 0;
    overlap += Math.min(countA, countB);
  }

  return roundToFourDecimals((overlap * 2) / (tokensA.length + tokensB.length));
}

export function calculateNormalizedBodySimilarity({
  bodyA,
  bodyB,
  siteNameA,
  siteNameB,
}: {
  bodyA: string;
  bodyB: string;
  siteNameA: string;
  siteNameB?: string | null;
}) {
  return calculateBodySimilarity(
    normalizeBodyForSimilarity(bodyA, siteNameA),
    normalizeBodyForSimilarity(bodyB, siteNameB || siteNameA),
  );
}

export function reviewBlogDuplicateRisk({
  siteName,
  title,
  bodyMd,
  h2Headings,
  facts,
  comparisonPosts,
}: {
  siteName: string;
  title: string;
  bodyMd: string;
  h2Headings: string[];
  facts: unknown;
  comparisonPosts: BlogDuplicateComparisonPost[];
}): BlogDuplicateRiskReview {
  const normalizedTitlePattern = normalizeTitlePattern(title, siteName);
  const normalizedH2Pattern = normalizeH2Pattern(h2Headings, siteName);
  const normalizedBody = normalizeBodyForSimilarity(bodyMd, siteName);
  const uniqueFactScore = calculateUniqueFactScore(facts);
  let maxBodySimilarity = 0;
  let mostSimilarPostSlug: string | null = null;
  let titlePatternCount = 0;
  let h2PatternCount = 0;

  for (const post of comparisonPosts) {
    const postSiteName = post.siteName || siteName;
    const postTitlePattern =
      normalizeWhitespace(post.normalizedTitlePattern ?? "") ||
      normalizeTitlePattern(post.title ?? "", postSiteName);
    const postH2Pattern =
      normalizeWhitespace(post.normalizedH2Pattern ?? "") ||
      normalizeH2Pattern(post.h2Headings ?? [], postSiteName);

    if (normalizedTitlePattern && postTitlePattern === normalizedTitlePattern) {
      titlePatternCount += 1;
    }

    if (normalizedH2Pattern && postH2Pattern === normalizedH2Pattern) {
      h2PatternCount += 1;
    }

    const similarity = calculateNormalizedBodySimilarity({
      bodyA: bodyMd,
      bodyB: post.bodyMd ?? "",
      siteNameA: siteName,
      siteNameB: postSiteName,
    });

    if (similarity > maxBodySimilarity) {
      maxBodySimilarity = similarity;
      mostSimilarPostSlug = post.slug ?? post.id ?? null;
    }
  }

  const adminWarnings: string[] = [];
  const duplicateRiskHints: string[] = [];
  let duplicateRisk: BlogDuplicateRisk = "low";

  if (maxBodySimilarity >= 0.8) {
    duplicateRisk = "failed";
    duplicateRiskHints.push("body_similarity_gte_80");
    adminWarnings.push(
      `기존 published 글과 본문 유사도가 ${formatPercent(
        maxBodySimilarity,
      )}입니다. duplicate_risk를 failed로 저장합니다.`,
    );
  } else if (maxBodySimilarity >= 0.65) {
    duplicateRisk = raiseDuplicateRisk(duplicateRisk, "high");
    duplicateRiskHints.push("body_similarity_gte_65");
    adminWarnings.push(
      `기존 published 글과 본문 유사도가 ${formatPercent(
        maxBodySimilarity,
      )}입니다. 관리자 검토가 필요합니다.`,
    );
  }

  if (titlePatternCount >= 5) {
    duplicateRisk = raiseDuplicateRisk(duplicateRisk, "medium");
    duplicateRiskHints.push("title_pattern_repeated_gte_5");
    adminWarnings.push("동일 title pattern이 published 글에서 5회 이상 반복됩니다.");
  }

  if (h2PatternCount >= 5) {
    duplicateRisk = raiseDuplicateRisk(duplicateRisk, "medium");
    duplicateRiskHints.push("h2_pattern_repeated_gte_5");
    adminWarnings.push("동일 H2 pattern이 published 글에서 5회 이상 반복됩니다.");
  }

  if (uniqueFactScore < 3) {
    duplicateRisk = "failed";
    duplicateRiskHints.push("unique_fact_score_lt_3");
    adminWarnings.push("사이트별 고유 데이터가 3개 미만입니다.");
  } else if (uniqueFactScore < 5) {
    duplicateRisk = raiseDuplicateRisk(duplicateRisk, "medium");
    duplicateRiskHints.push("unique_fact_score_lt_5");
    adminWarnings.push("사이트별 고유 데이터가 5개 미만입니다.");
  }

  if (duplicateRisk === "medium") {
    adminWarnings.push("duplicate_risk가 medium입니다. 관리자 화면에서 중복 경고를 확인하세요.");
  }

  if (duplicateRisk === "high") {
    adminWarnings.push("duplicate_risk가 high입니다. 관리자 검토가 필요합니다.");
  }

  return {
    duplicateRisk,
    adminWarnings: Array.from(new Set(adminWarnings)),
    duplicateRiskHints: Array.from(new Set(duplicateRiskHints)),
    uniqueFactScore,
    maxBodySimilarity,
    mostSimilarPostSlug,
    titlePatternCount,
    h2PatternCount,
    normalizedTitlePattern,
    normalizedH2Pattern,
    normalizedBody,
  };
}

export function detectForbiddenPublicBodyTerms(
  body: string,
): ForbiddenPublicBodyTermMatch[] {
  return forbiddenPublicBodyTerms
    .flatMap((term) => {
      const index = body.toLowerCase().indexOf(term.toLowerCase());

      if (index < 0) return [];

      return [
        {
          term,
          sample: getTextSample(body, index),
        },
      ];
    });
}

export function detectPromotionalBodyEmphasis(
  body: string,
): PromotionalBodyEmphasisMatch[] {
  return promotionalBodyEmphasisPatterns.flatMap(({ term, pattern }) => {
    pattern.lastIndex = 0;
    const match = pattern.exec(body);

    if (!match) return [];

    return [
      {
        term,
        sample: getTextSample(body, match.index),
      },
    ];
  });
}

export function detectWeakSeoTermsInImportantFields({
  title,
  metaTitle,
  h1,
  siteName,
}: {
  title: string;
  metaTitle: string;
  h1: string;
  siteName: string;
}): WeakSeoTermReview {
  const { primaryKeyword } = buildBlogKeywords(siteName);
  const fields = [
    { key: "title" as const, label: "title", value: title },
    { key: "metaTitle" as const, label: "meta_title", value: metaTitle },
    { key: "h1" as const, label: "h1", value: h1 },
  ];
  const missingPrimaryKeywordFields = fields
    .filter((field) => !containsKeyword(field.value, primaryKeyword))
    .map((field) => field.key);
  const weakTermMatches = fields.flatMap((field) =>
    weakImportantFieldTerms
      .filter((term) => field.value.includes(term))
      .map((term) => ({
        field: field.key,
        term,
      })),
  );
  const warnings = [
    ...missingPrimaryKeywordFields.map((field) => {
      const label = fields.find((item) => item.key === field)?.label ?? field;

      return `${label}에 "${primaryKeyword}"가 없습니다.`;
    }),
    ...weakTermMatches.map(
      (match) =>
        `${match.field}에 주요 SEO 영역에서 우선 사용하지 않는 표현 "${match.term}"이 있습니다.`,
    ),
  ];

  return {
    warnings,
    missingPrimaryKeywordFields,
    weakTermMatches,
  };
}

export function detectKeywordStuffing(
  body: string,
  siteName: string,
): KeywordStuffingReview {
  const { primaryKeyword, secondaryKeywords } = buildBlogKeywords(siteName);
  const allKeywords = [primaryKeyword, ...secondaryKeywords];
  const normalizedBody = normalizeWhitespace(body);
  const primaryKeywordCount = countOccurrences(normalizedBody, primaryKeyword);
  const matches: string[] = [];
  const warnings: string[] = [];

  const lines = body
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  for (const line of lines) {
    const keywordCountInLine = allKeywords.filter((keyword) =>
      containsKeyword(line, keyword),
    ).length;
    const looksLikeKeywordHeading = /키워드|검색어|keyword/i.test(line);

    if (keywordCountInLine >= 4) {
      matches.push(line);
    }

    if (looksLikeKeywordHeading && keywordCountInLine >= 2) {
      matches.push(line);
    }
  }

  if (
    /(?:키워드|검색어|keyword)\s*(?:목록|리스트|list)?\s*[:：]/i.test(
      normalizedBody,
    )
  ) {
    matches.push("키워드 나열 섹션 패턴");
  }

  if (primaryKeywordCount >= 12) {
    matches.push(`${primaryKeyword} 반복 ${primaryKeywordCount}회`);
  }

  if (matches.length > 0) {
    warnings.push("공개 본문에 키워드 나열 또는 과도한 반복 패턴이 있습니다.");
  }

  return {
    hasKeywordStuffing: matches.length > 0,
    warnings,
    matches: Array.from(new Set(matches)),
    primaryKeywordCount,
  };
}

export function detectDuplicateInternalAnchorTexts(
  internalLinks: BlogSeoDraftLink[],
): DuplicateInternalAnchorText[] {
  const counts = new Map<string, number>();

  for (const link of internalLinks) {
    const anchor = getLinkAnchorText(link);

    if (!anchor) continue;

    counts.set(anchor, (counts.get(anchor) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([anchor, count]) => ({ anchor, count }));
}

export function reviewRenderedBlogInternalAnchors({
  headerNavLinkSets = [primaryNavigationLinks],
  breadcrumbLinks = [],
  bodyInternalLinks = [],
  relatedPostLinks = [],
  footerLinks = footerNavigationLinks,
  bodyMd = "",
}: BlogRenderedInternalAnchorInput = {}): BlogRenderedInternalAnchorReview {
  const bodyLinks = [
    ...bodyInternalLinks,
    ...extractMarkdownInternalLinks(bodyMd ?? ""),
  ];
  const renderedAnchors = [
    ...headerNavLinkSets.flatMap((links, setIndex) =>
      toRenderedInternalAnchors("header_nav", links, setIndex),
    ),
    ...toRenderedInternalAnchors("breadcrumb", breadcrumbLinks),
    ...toRenderedInternalAnchors("body_internal_links", bodyLinks),
    ...toRenderedInternalAnchors("related_posts", relatedPostLinks),
    ...toRenderedInternalAnchors("footer_links", footerLinks),
  ];

  return {
    renderedAnchors,
    duplicateBodyAnchorTexts: detectDuplicateInternalAnchorTexts(bodyLinks),
    duplicateHeaderNavSets: detectDuplicateHeaderNavSets(headerNavLinkSets),
  };
}

export function getPlacementInternalAnchorText({
  siteName,
  placement,
}: {
  siteName: string;
  placement: InternalAnchorPlacement;
}) {
  const normalizedSiteName = normalizeWhitespace(siteName) || "{사이트명}";

  switch (placement) {
    case "address_domain_section":
      return `${normalizedSiteName} 주소·도메인 기록`;
    case "dns_section":
      return `${normalizedSiteName} DNS 조회 결과`;
    case "reports_section":
      return `${normalizedSiteName} 먹튀 제보 현황`;
    case "reviews_section":
      return `${normalizedSiteName} 후기 데이터`;
    case "faq":
      return `${normalizedSiteName} 자주 묻는 질문`;
    case "summary":
    default:
      return `${normalizedSiteName} 상세 정보`;
  }
}

export function normalizeInternalLinkAnchorTexts({
  siteName,
  internalLinks,
}: {
  siteName: string;
  internalLinks: BlogSeoDraftLink[];
}) {
  const usedAnchorsByHref = new Map<string, Set<string>>();

  return internalLinks.map((link, index) => {
    const href = getLinkHref(link);
    const anchor = getLinkAnchorText(link);

    if (!href.startsWith("/") || href.startsWith("//") || !anchor) {
      return link;
    }

    const hrefKey = normalizeInternalHrefForAnchorDeduplication(href);
    const usedAnchors = usedAnchorsByHref.get(hrefKey) ?? new Set<string>();
    const normalizedAnchor = normalizeAnchorForDeduplication(anchor);
    const placement = getInternalAnchorPlacement(link, href, index);
    let nextAnchor = anchor;

    if (usedAnchors.has(normalizedAnchor)) {
      nextAnchor = getPlacementInternalAnchorText({ siteName, placement });
    }

    let nextNormalizedAnchor = normalizeAnchorForDeduplication(nextAnchor);

    if (usedAnchors.has(nextNormalizedAnchor)) {
      nextAnchor = getFallbackInternalAnchorText({
        siteName,
        href,
        index,
      });
      nextNormalizedAnchor = normalizeAnchorForDeduplication(nextAnchor);
    }

    if (usedAnchors.has(nextNormalizedAnchor)) {
      nextAnchor = `${nextAnchor} ${usedAnchors.size + 1}`;
      nextNormalizedAnchor = normalizeAnchorForDeduplication(nextAnchor);
    }

    usedAnchors.add(nextNormalizedAnchor);
    usedAnchorsByHref.set(hrefKey, usedAnchors);

    return {
      ...link,
      label: nextAnchor,
    };
  });
}

export function extractMarkdownH2Headings(body: string) {
  return Array.from(body.matchAll(/^##\s+(.+)$/gm))
    .map((match) => normalizeWhitespace(match[1] ?? ""))
    .filter(Boolean);
}

export function validateSecondaryKeywordCoverage({
  siteName,
  title,
  metaTitle,
  metaDescription,
  h1,
  bodyMd,
  faq,
  internalLinks,
}: {
  siteName: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  bodyMd: string;
  faq: BlogSeoDraftFaq[];
  internalLinks: BlogSeoDraftLink[];
}): SecondaryKeywordCoverage {
  const { secondaryKeywords } = buildBlogKeywords(siteName);
  const faqText = faq
    .flatMap((item) => [item.question ?? "", item.answer ?? ""])
    .join("\n");
  const internalAnchorText = internalLinks.map(getLinkAnchorText).join("\n");
  const searchableText = normalizeWhitespace(
    [
      title,
      metaTitle,
      metaDescription,
      h1,
      bodyMd,
      faqText,
      internalAnchorText,
    ].join("\n"),
  );
  const missing = secondaryKeywords.filter(
    (keyword) => !containsKeyword(searchableText, keyword),
  );

  return {
    missing,
    present: secondaryKeywords.filter((keyword) => !missing.includes(keyword)),
    presentCount: secondaryKeywords.length - missing.length,
  };
}

export function validateH2KeywordCoverage({
  siteName,
  bodyMd,
}: {
  siteName: string;
  bodyMd: string;
}): H2KeywordCoverage {
  const h2s = extractMarkdownH2Headings(bodyMd);
  const checks = [
    {
      type: "토토사이트",
      isCovered: h2s.some((h2) =>
        containsKeyword(h2, `${siteName} 토토사이트`),
      ),
    },
    {
      type: "주소",
      isCovered: h2s.some(
        (h2) => containsKeyword(h2, siteName) && containsKeyword(h2, "주소"),
      ),
    },
    {
      type: "도메인",
      isCovered: h2s.some(
        (h2) => containsKeyword(h2, siteName) && containsKeyword(h2, "도메인"),
      ),
    },
    {
      type: "먹튀",
      isCovered: h2s.some(
        (h2) => containsKeyword(h2, siteName) && containsKeyword(h2, "먹튀"),
      ),
    },
    {
      type: "후기",
      isCovered: h2s.some(
        (h2) => containsKeyword(h2, siteName) && containsKeyword(h2, "후기"),
      ),
    },
    {
      type: "FAQ",
      isCovered: h2s.some((h2) => /faq|자주\s*묻는\s*질문/i.test(h2)),
    },
  ];
  const coveredTypes = checks
    .filter((check) => check.isCovered)
    .map((check) => check.type);

  return {
    h2s,
    coveredTypes,
    missingTypes: checks
      .filter((check) => !check.isCovered)
      .map((check) => check.type),
    presentCount: coveredTypes.length,
  };
}

export function validateExternalReferences(
  externalLinks: BlogSeoDraftLink[],
): ExternalReferenceReview {
  const links = externalLinks
    .map((link) => ({
      href: getLinkHref(link),
      label: getLinkAnchorText(link),
    }))
    .filter((link) => link.href.length > 0);
  const disallowedLinks = externalLinks.flatMap((link) => {
    const href = getLinkHref(link);
    const label = getLinkAnchorText(link);

    if (!href || !isDisallowedExternalReference(href, label)) return [];

    return [{ href, label, reason: "prohibited_reference_pattern" }];
  });
  const untrustedLinks = links.flatMap((link) => {
    if (isDisallowedExternalReference(link.href, link.label)) return [];
    if (isAllowlistedExternalReference(link.href)) return [];

    return [{ ...link, reason: "not_in_external_reference_allowlist" }];
  });

  return {
    linkCount: links.length,
    validCount: links.filter(
      (link) =>
        isAllowlistedExternalReference(link.href) &&
        !isDisallowedExternalReference(link.href, link.label),
    ).length,
    untrustedLinks,
    disallowedLinks,
  };
}

export function reviewExternalReferences(
  externalLinks: BlogSeoDraftLink[],
): ExternalReferenceReview {
  return validateExternalReferences(externalLinks);
}

export function validateSlugQuality(
  slug: string,
  siteName: string,
): SlugQualityReview {
  const normalizedSlug = normalizeSlugValue(slug);
  const isEmpty = normalizedSlug.length === 0;
  const slugTokens = normalizedSlug.split("-").filter(Boolean);
  const normalizedSiteName = normalizeSlugValue(siteName);
  const hasMeaningfulKeyword =
    meaningfulSlugTerms.some((term) => normalizedSlug.includes(term)) ||
    (normalizedSiteName.length > 0 && normalizedSlug.includes(normalizedSiteName));
  const hasRandomIdToken = slugTokens.some((token) =>
    isRandomIdLikeSlugToken(token),
  );
  const isInternalIdLike =
    !isEmpty &&
    (/^site-[a-z0-9-]+/i.test(normalizedSlug) ||
      uuidSlugPattern.test(normalizedSlug) ||
      hasRandomIdToken ||
      !hasMeaningfulKeyword);
  const isTooLong = normalizedSlug.length > maxRecommendedSlugLength;
  const warnings: string[] = [];

  if (isEmpty) {
    warnings.push(emptySlugFailure);
  } else {
    if (isInternalIdLike) {
      warnings.push(internalIdSlugWarning);
    }

    if (isTooLong) {
      warnings.push(longSlugWarning);
    }
  }

  return {
    slug: normalizedSlug,
    warnings,
    isEmpty,
    isInternalIdLike,
    isTooLong,
    hasMeaningfulKeyword,
  };
}

export function calculateUniqueFactScore(facts: unknown) {
  const factTexts = flattenFacts(facts)
    .map((fact) => normalizeWhitespace(fact))
    .filter((fact) => fact.length >= 3);

  return new Set(factTexts.map((fact) => fact.toLowerCase())).size;
}

export function calculateAverageWordsPerSentence(body: string) {
  const plainText = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = plainText
    .split(/(?<=[.!?。！？])\s+|(?<=다\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce(
    (sum, sentence) => sum + countSentenceWords(sentence),
    0,
  );

  return roundToOneDecimal(totalWords / sentences.length);
}

export function validateBlogSeoDraft(
  input: BlogSeoDraftInput,
): BlogSeoDraftValidation {
  const keywords = buildBlogKeywords(input.siteName);
  const slugQuality = validateSlugQuality(input.slug, input.siteName);
  const importantFieldReview = detectWeakSeoTermsInImportantFields({
    title: input.title,
    metaTitle: input.metaTitle,
    h1: input.h1,
    siteName: input.siteName,
  });
  const forbiddenPublicBodyTerms = detectForbiddenPublicBodyTerms(input.bodyMd);
  const promotionalBodyEmphasis = detectPromotionalBodyEmphasis(input.bodyMd);
  const keywordStuffing = detectKeywordStuffing(input.bodyMd, input.siteName);
  const renderedInternalAnchorReview = reviewRenderedBlogInternalAnchors({
    ...input.renderedInternalAnchors,
    bodyMd: input.bodyMd,
    bodyInternalLinks:
      input.renderedInternalAnchors?.bodyInternalLinks ?? input.internalLinks,
  });
  const imageSeoReview = reviewBlogImageSeo({
    siteName: input.siteName,
    screenshots: input.imageSeo?.screenshots,
    featuredImageUrl: input.imageSeo?.featuredImageUrl,
    featuredImageAlt: input.imageSeo?.featuredImageAlt,
    logoUrl: input.imageSeo?.logoUrl,
  });
  const duplicateInternalAnchorTexts =
    renderedInternalAnchorReview.duplicateBodyAnchorTexts;
  const secondaryKeywordCoverage = validateSecondaryKeywordCoverage({
    siteName: input.siteName,
    title: input.title,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    h1: input.h1,
    bodyMd: input.bodyMd,
    faq: input.faq,
    internalLinks: input.internalLinks,
  });
  const h2KeywordCoverage = validateH2KeywordCoverage({
    siteName: input.siteName,
    bodyMd: input.bodyMd,
  });
  const externalReferenceReview = validateExternalReferences(input.externalLinks);
  const uniqueFactScore = calculateUniqueFactScore(input.facts);
  const averageWordsPerSentence = calculateAverageWordsPerSentence(input.bodyMd);
  const adminWarnings = [...importantFieldReview.warnings];
  const duplicateRiskHints: string[] = [];
  let hasFailure = false;

  if (slugQuality.isEmpty) {
    hasFailure = true;
    adminWarnings.push(...slugQuality.warnings);
    duplicateRiskHints.push("slug_missing");
  } else {
    adminWarnings.push(...slugQuality.warnings);

    if (slugQuality.isInternalIdLike) {
      duplicateRiskHints.push("internal_id_like_slug");
    }

    if (slugQuality.isTooLong) {
      duplicateRiskHints.push("slug_too_long");
    }
  }

  if (forbiddenPublicBodyTerms.length > 0) {
    hasFailure = true;
    adminWarnings.push(
      `공개 body_md에 AI 내부 분석 필드가 포함되어 있습니다: ${forbiddenPublicBodyTerms
        .map((match) => match.term)
        .join(", ")}`,
    );
  }

  if (promotionalBodyEmphasis.length > 0) {
    hasFailure = true;
    adminWarnings.push(
      `공개 body_md에 원본 관측 정보의 홍보성 문구가 강조되어 있습니다: ${promotionalBodyEmphasis
        .map((match) => match.term)
        .join(", ")}`,
    );
    duplicateRiskHints.push("promotional_observation_terms_emphasized");
  }

  if (keywordStuffing.hasKeywordStuffing) {
    hasFailure = true;
    adminWarnings.push(...keywordStuffing.warnings);
    duplicateRiskHints.push("keyword_stuffing_or_keyword_list");
  }

  if (secondaryKeywordCoverage.presentCount === 0) {
    hasFailure = true;
    adminWarnings.push(secondaryKeywordMissingFailure);
    duplicateRiskHints.push("secondary_keywords_missing_all");
  } else if (secondaryKeywordCoverage.missing.length > 0) {
    adminWarnings.push(
      `${secondaryKeywordMissingWarning} 누락: ${secondaryKeywordCoverage.missing.join(", ")}`,
    );
    duplicateRiskHints.push("secondary_keywords_missing_some");
  }

  if (duplicateInternalAnchorTexts.length > 0) {
    adminWarnings.push(duplicateInternalAnchorWarning);
  }

  if (renderedInternalAnchorReview.duplicateHeaderNavSets.length > 0) {
    adminWarnings.push(duplicateHeaderNavSetWarning);
    duplicateRiskHints.push("duplicate_header_nav_set");
  }

  if (externalReferenceReview.linkCount === 0) {
    adminWarnings.push(missingExternalReferenceWarning);
  }

  adminWarnings.push(...imageSeoReview.warnings);

  if (imageSeoReview.failures.length > 0) {
    hasFailure = true;
    adminWarnings.push(imageSeoFailureWarning, ...imageSeoReview.failures);
    duplicateRiskHints.push("image_seo_failed");
  }

  if (externalReferenceReview.untrustedLinks.length > 0) {
    adminWarnings.push(untrustedExternalReferenceWarning);
    duplicateRiskHints.push("untrusted_external_reference");
  }

  if (externalReferenceReview.disallowedLinks.length > 0) {
    hasFailure = true;
    adminWarnings.push(disallowedExternalReferenceWarning);
    duplicateRiskHints.push("disallowed_external_reference");
  }

  if (h2KeywordCoverage.presentCount < 4) {
    adminWarnings.push(h2KeywordCoverageWarning);
    duplicateRiskHints.push("h2_keyword_coverage_lt_4");
  }

  if (uniqueFactScore < 3) {
    hasFailure = true;
    adminWarnings.push("사이트별 고유 데이터가 3개 미만입니다.");
    duplicateRiskHints.push("very_low_unique_fact_score");
  } else if (uniqueFactScore < 5) {
    adminWarnings.push("사이트별 고유 데이터가 5개 미만입니다.");
    duplicateRiskHints.push("low_unique_fact_score");
  }

  if (input.internalLinks.length < 3) {
    adminWarnings.push("내부 링크가 3개 미만입니다.");
  }

  if (input.faq.length < 4) {
    adminWarnings.push("FAQ가 4개 미만입니다.");
  }

  if (
    averageWordsPerSentence > 0 &&
    averageWordsPerSentence < shortAverageSentenceWordThreshold
  ) {
    adminWarnings.push("평균 문장 길이가 너무 짧아 템플릿성 문장으로 보일 수 있습니다.");
    duplicateRiskHints.push("short_average_sentence_length");
  }

  if (areSameImportantFields(input.title, input.metaTitle, input.h1)) {
    adminWarnings.push("title, meta_title, h1이 모두 동일합니다.");
    duplicateRiskHints.push("identical_title_meta_h1");
  }

  const seoReviewStatus: BlogSeoReviewStatus = hasFailure
    ? "failed"
    : adminWarnings.length > 0
      ? "warning"
      : "passed";

  return {
    seoReviewStatus,
    adminWarnings: Array.from(new Set(adminWarnings)),
    uniqueFactScore,
    duplicateRiskHints: Array.from(new Set(duplicateRiskHints)),
    keywordChecks: {
      primaryKeyword: keywords.primaryKeyword,
      secondaryKeywords: keywords.secondaryKeywords,
      titleHasPrimaryKeyword: containsKeyword(input.title, keywords.primaryKeyword),
      metaTitleHasPrimaryKeyword: containsKeyword(
        input.metaTitle,
        keywords.primaryKeyword,
      ),
      h1HasPrimaryKeyword: containsKeyword(input.h1, keywords.primaryKeyword),
      secondaryKeywordCoverage,
      h2KeywordCoverage,
      duplicateInternalAnchorTexts,
      renderedInternalAnchorReview,
      imageSeoReview,
      externalReferenceReview,
      forbiddenPublicBodyTerms,
      promotionalBodyEmphasis,
      weakSeoTerms: importantFieldReview.weakTermMatches,
      keywordStuffing,
      slugQuality,
      averageWordsPerSentence,
    },
  };
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSlugValue(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(value: string, keyword: string) {
  return normalizeWhitespace(value).includes(normalizeWhitespace(keyword));
}

function getLinkAnchorText(link: BlogSeoDraftLink) {
  return normalizeWhitespace(link.label ?? link.anchor ?? link.text ?? "");
}

function getLinkHref(link: BlogSeoDraftLink) {
  return normalizeWhitespace(link.href ?? link.url ?? "");
}

function getInternalAnchorPlacement(
  link: BlogSeoDraftLink,
  href: string,
  index: number,
): InternalAnchorPlacement {
  const placement = normalizeWhitespace(link.placement ?? "");
  const purpose = normalizeWhitespace(link.purpose ?? "");
  const hash = getInternalHrefHash(href);

  if (isInternalAnchorPlacement(placement)) return placement;
  if (purpose === "address_domain_detail") return "address_domain_section";
  if (purpose === "dns_detail") return "dns_section";
  if (purpose === "report_detail") return "reports_section";
  if (purpose === "review_detail") return "reviews_section";
  if (purpose === "source_detail") return "summary";
  if (hash === "reports" || hash === "scam-reports") return "reports_section";
  if (hash === "reviews") return "reviews_section";
  if (hash === "dns") return "dns_section";

  return index === 0 ? "summary" : "summary";
}

function isInternalAnchorPlacement(
  value: string,
): value is InternalAnchorPlacement {
  return (
    value === "summary" ||
    value === "address_domain_section" ||
    value === "dns_section" ||
    value === "reports_section" ||
    value === "reviews_section" ||
    value === "faq"
  );
}

function getInternalHrefHash(href: string) {
  return href.split("#")[1]?.trim().toLowerCase() ?? "";
}

function normalizeInternalHrefForAnchorDeduplication(href: string) {
  const normalizedHref = normalizeWhitespace(href);

  if (/^\/sites\/[^/?#]+(?:[?#].*)?$/i.test(normalizedHref)) {
    return normalizedHref.split("#")[0]?.split("?")[0] ?? normalizedHref;
  }

  return normalizedHref;
}

function normalizeAnchorForDeduplication(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function getFallbackInternalAnchorText({
  siteName,
  href,
  index,
}: {
  siteName: string;
  href: string;
  index: number;
}) {
  const placement = getInternalAnchorPlacement({}, href, index);

  return getPlacementInternalAnchorText({ siteName, placement });
}

function toRenderedInternalAnchors(
  source: BlogRenderedInternalAnchorSource,
  links: BlogSeoDraftLink[],
  setIndex?: number,
): BlogRenderedInternalAnchor[] {
  return links.flatMap((link) => {
    const href = getLinkHref(link);
    const label = getLinkAnchorText(link);

    if (!href.startsWith("/") || href.startsWith("//") || !label) {
      return [];
    }

    return [
      {
        source,
        href,
        label,
        ...(typeof setIndex === "number" ? { setIndex } : {}),
      },
    ];
  });
}

function detectDuplicateHeaderNavSets(
  headerNavLinkSets: BlogSeoDraftLink[][],
): BlogRenderedHeaderNavSetDuplicate[] {
  const navSetCounts = new Map<
    string,
    {
      count: number;
      setIndexes: number[];
      links: BlogSeoDraftLink[];
    }
  >();

  headerNavLinkSets.forEach((links, setIndex) => {
    const signature = getNavigationSetSignature(links);

    if (!signature) return;

    const current = navSetCounts.get(signature);

    if (current) {
      current.count += 1;
      current.setIndexes.push(setIndex);
    } else {
      navSetCounts.set(signature, {
        count: 1,
        setIndexes: [setIndex],
        links,
      });
    }
  });

  return Array.from(navSetCounts.entries())
    .filter(([, value]) => value.count >= 2)
    .map(([signature, value]) => ({
      signature,
      count: value.count,
      setIndexes: value.setIndexes,
      links: value.links,
    }));
}

function getNavigationSetSignature(links: BlogSeoDraftLink[]) {
  return toRenderedInternalAnchors("header_nav", links)
    .map((link) => `${link.href}\t${normalizeAnchorForDeduplication(link.label)}`)
    .join("\n");
}

function extractMarkdownInternalLinks(bodyMd: string): BlogSeoDraftLink[] {
  const markdownWithoutCodeBlocks = bodyMd.replace(/```[\s\S]*?```/g, "");
  const links: BlogSeoDraftLink[] = [];

  for (const match of markdownWithoutCodeBlocks.matchAll(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
  )) {
    const label = normalizeWhitespace(match[1] ?? "");
    const href = normalizeWhitespace(match[2] ?? "");

    if (!href.startsWith("/") || href.startsWith("//") || !label) {
      continue;
    }

    links.push({ href, label });
  }

  return links;
}

function isDisallowedExternalReference(href: string, label: string) {
  const value = `${href} ${label}`;

  return disallowedExternalReferencePatterns.some((pattern) =>
    pattern.test(value),
  );
}

function isAllowlistedExternalReference(href: string) {
  const domain = getExternalReferenceDomain(href);

  return domain.length > 0 && allowedExternalReferenceDomains.has(domain);
}

function getExternalReferenceDomain(href: string) {
  try {
    const url = new URL(href);

    if (url.protocol !== "http:" && url.protocol !== "https:") return "";

    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function isRandomIdLikeSlugToken(token: string) {
  if (token.length < 8) return false;

  const hasLetter = /[a-z]/i.test(token);
  const hasDigit = /\d/.test(token);
  const isHexLike = /^[a-f0-9]+$/i.test(token);

  return (hasLetter && hasDigit) || isHexLike;
}

function countOccurrences(value: string, keyword: string) {
  const normalizedValue = normalizeWhitespace(value);
  const normalizedKeyword = normalizeWhitespace(keyword);

  if (!normalizedKeyword) return 0;

  return normalizedValue.split(normalizedKeyword).length - 1;
}

function toSimilarityTokens(value: string) {
  return normalizeWhitespace(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function countTokens(tokens: string[]) {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

function raiseDuplicateRisk(
  current: BlogDuplicateRisk,
  minimum: BlogDuplicateRisk,
) {
  return duplicateRiskRank[current] >= duplicateRiskRank[minimum]
    ? current
    : minimum;
}

const duplicateRiskRank: Record<BlogDuplicateRisk, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
  failed: 4,
};

function getTextSample(value: string, index: number) {
  const start = Math.max(0, index - 24);
  const end = Math.min(value.length, index + 48);

  return normalizeWhitespace(value.slice(start, end));
}

function flattenFacts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(flattenFacts);
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, entry]) => {
    if (entry === null || entry === undefined || entry === "") return [];
    if (
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean"
    ) {
      return [`${key}: ${entry}`];
    }

    return flattenFacts(entry);
  });
}

function countSentenceWords(sentence: string) {
  const tokens = sentence
    .replace(/[^\p{L}\p{N}\s가-힣]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.length;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundToFourDecimals(value: number) {
  return Math.round(value * 10000) / 10000;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function areSameImportantFields(title: string, metaTitle: string, h1: string) {
  const normalizedTitle = normalizeWhitespace(title);
  const normalizedMetaTitle = normalizeWhitespace(metaTitle);
  const normalizedH1 = normalizeWhitespace(h1);

  return (
    normalizedTitle.length > 0 &&
    normalizedTitle === normalizedMetaTitle &&
    normalizedTitle === normalizedH1
  );
}
