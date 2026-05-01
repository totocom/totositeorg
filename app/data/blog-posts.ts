import type { BlogVerificationSummary } from "@/app/data/blog-verification";

export type BlogContentPillar = {
  name: string;
  description: string;
  targetKeywords: string[];
  sampleTitles: string[];
  internalGoal: string;
};

export type BlogTitlePattern = {
  name: string;
  formula: string;
  example: string;
};

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

export type BlogContentFingerprint = {
  id: string;
  postId: string;
  siteId: string;
  titlePattern: string;
  h2Pattern: string;
  contentHash: string;
  normalizedContentHash: string;
  uniqueFactScore: number;
  similarityScore: number;
  createdAt: string;
};

export type BlogCategorySlug =
  | "site-reports"
  | "domain-dns"
  | "scam-reports"
  | "user-reviews"
  | "change-history"
  | "verification-guide"
  | "checklists"
  | "announcements";

export type BlogCategory = {
  name: string;
  slug: BlogCategorySlug;
  description: string;
  purpose: string;
  is_active: boolean;
};

export type BlogPostSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPostExternalReference = {
  title: string;
  url: string;
  publisher?: string;
  evidenceType?: string;
};

export type BlogPost = {
  slug: string;
  status?: string;
  legalReviewStatus?: string;
  category: string;
  primaryCategory?: BlogCategorySlug;
  secondaryCategories?: BlogCategorySlug[];
  sourceSite?: {
    name: string;
    href: string;
  } | null;
  tags?: string[];
  priority: "상" | "중" | "하";
  title: string;
  h1?: string;
  metaTitle: string;
  metaDescription?: string;
  description: string;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  featuredImageCapturedAt?: string | null;
  siteLogoUrl?: string | null;
  siteLogoAlt?: string | null;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seoReviewStatus?: BlogSeoReviewStatus;
  duplicateRisk?: BlogDuplicateRisk;
  uniqueFactScore?: number;
  contentAngle?: string;
  normalizedTitlePattern?: string;
  normalizedH2Pattern?: string;
  searchIntent: string;
  readerQuestion: string;
  recommendedTitlePattern: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  internalLinks: Array<{
    href: string;
    label: string;
    placement?: string;
    purpose?: string;
  }>;
  sections: BlogPostSection[];
  checklist: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  externalReferences?: BlogPostExternalReference[];
  adminWarnings?: string[];
  verificationSummary?: BlogVerificationSummary | null;
};

export type PublicBlogPost = Omit<
  BlogPost,
  | "primaryKeyword"
  | "secondaryKeywords"
  | "seoReviewStatus"
  | "duplicateRisk"
  | "uniqueFactScore"
  | "contentAngle"
  | "normalizedTitlePattern"
  | "normalizedH2Pattern"
  | "searchIntent"
  | "readerQuestion"
  | "recommendedTitlePattern"
>;

export const blogCategories: BlogCategory[] = [
  {
    name: "토토사이트 정보 리포트",
    slug: "site-reports",
    description:
      "이 카테고리는 개별 사이트의 도메인, DNS, WHOIS, 승인된 리뷰와 먹튀 피해 제보 현황을 종합 정리한 정보 리포트를 모아둔 페이지입니다.",
    purpose: "개별 사이트 종합 정보 글",
    is_active: true,
  },
  {
    name: "도메인·DNS 분석",
    slug: "domain-dns",
    description:
      "도메인, DNS 레코드, WHOIS 등록 정보, 네임서버, IP 관측값처럼 기술적으로 확인 가능한 데이터를 기준으로 사이트별 변화를 정리합니다.",
    purpose: "도메인, DNS, WHOIS 중심 글",
    is_active: true,
  },
  {
    name: "먹튀 제보 현황",
    slug: "scam-reports",
    description:
      "승인된 먹튀 피해 제보와 관련 집계, 피해 유형, 접수 시점 정보를 모아 사이트 이용 전 확인할 수 있는 제보 현황을 정리합니다.",
    purpose: "승인된 먹튀 제보 요약 글",
    is_active: true,
  },
  {
    name: "이용자 리뷰 요약",
    slug: "user-reviews",
    description:
      "승인된 이용자 리뷰를 바탕으로 결제, 고객지원, 계정 제한, 앱 사용성 등 실제 이용 경험에서 반복되는 신호를 카테고리별로 요약합니다.",
    purpose: "승인된 이용자 리뷰 중심 글",
    is_active: true,
  },
  {
    name: "변경 이력 리포트",
    slug: "change-history",
    description:
      "도메인 추가, DNS/WHOIS 갱신, 승인 리뷰와 먹튀 제보 증가처럼 사이트 정보가 바뀐 항목을 시간순으로 추적해 변화 흐름을 정리합니다.",
    purpose: "도메인, DNS, 리뷰, 먹튀 제보 변경 사항 정리",
    is_active: true,
  },
  {
    name: "검증 기준 안내",
    slug: "verification-guide",
    description:
      "리뷰 승인 기준, 먹튀 피해 제보 검토 방식, DNS/WHOIS 조회 기준 등 서비스가 확인 데이터를 수집하고 해석하는 운영 원칙을 안내합니다.",
    purpose: "검증 방식, 점수 기준, 제보 승인 기준 안내",
    is_active: true,
  },
  {
    name: "이용 전 체크리스트",
    slug: "checklists",
    description:
      "사이트 이용 전 확인할 도메인, DNS, WHOIS, 승인 리뷰, 먹튀 피해 제보 항목을 단계별 체크리스트로 정리해 사전 확인 흐름을 제공합니다.",
    purpose: "정보 확인 체크리스트형 글",
    is_active: true,
  },
  {
    name: "공지 및 운영 안내",
    slug: "announcements",
    description:
      "서비스 운영 정책, 기능 업데이트, 검토 기준 변경과 같은 공지성 내용을 모아 이용자가 중요한 변경 사항을 빠르게 확인하도록 안내합니다.",
    purpose: "서비스 공지, 정책 변경, 운영 기준",
    is_active: true,
  },
];

export const blogCategorySlugs = blogCategories.map(
  (category) => category.slug,
) as BlogCategorySlug[];

const legacyBlogCategoryLabels = ["검증 기준", "피해 예방", "후기 해석", "운영 정보"];

export function getBlogCategoryBySlug(slug: string) {
  return blogCategories.find((category) => category.slug === slug) ?? null;
}

export function getBlogCategoryLabel(slug: string) {
  return getBlogCategoryBySlug(slug)?.name ?? "토토사이트 정보 리포트";
}

export function canIndexBlogCategory(
  category: BlogCategory,
  publishedPostCount: number,
) {
  return (
    category.is_active &&
    publishedPostCount >= 3 &&
    category.description.length >= 80
  );
}

export function isBlogCategoryValue(value: string) {
  const normalized = value.trim();
  const normalizedSlug = normalized.toLowerCase();

  return (
    legacyBlogCategoryLabels.includes(normalized) ||
    blogCategories.some(
      (category) =>
        category.slug === normalizedSlug || category.name === normalized,
    )
  );
}

export function getBlogPrimaryCategoryFromLabel(label: string): BlogCategorySlug {
  if (label === "검증 기준") return "verification-guide";
  if (label === "피해 예방") return "scam-reports";
  if (label === "후기 해석") return "user-reviews";
  if (label === "운영 정보") return "domain-dns";
  if (blogCategories.some((category) => category.name === label)) {
    return blogCategories.find((category) => category.name === label)?.slug ?? "site-reports";
  }

  return "site-reports";
}

export function getBlogTagSlug(tag: string) {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const blogContentPillars: BlogContentPillar[] = [
  {
    name: "검증 기준",
    description:
      "사이트 선택 전 확인해야 할 라이선스, 운영 이력, 도메인, 고객지원 기준을 설명합니다.",
    targetKeywords: [
      "안전한 토토사이트",
      "토토사이트 검증",
      "토토사이트 추천 기준",
    ],
    sampleTitles: [
      "안전한 토토사이트 고르는 법: 라이선스부터 먹튀 이력까지",
      "토토사이트 추천 순위 보기 전 확인해야 할 기준",
    ],
    internalGoal: "/sites와 각 사이트 상세 페이지로 자연스럽게 연결",
  },
  {
    name: "피해 예방",
    description:
      "먹튀 징후, 출금 지연, 사칭 도메인처럼 이용자가 검색하는 위험 상황을 정리합니다.",
    targetKeywords: [
      "먹튀사이트 확인",
      "토토사이트 출금 지연",
      "토토사이트 도메인 변경",
    ],
    sampleTitles: [
      "먹튀사이트 확인 방법: 가입 전 살펴볼 위험 신호",
      "토토사이트 출금 지연이 생겼을 때 확인할 체크리스트",
    ],
    internalGoal: "/scam-reports와 /submit-scam-report로 연결",
  },
  {
    name: "후기 해석",
    description:
      "실제 후기와 광고성 글을 구분하는 법, 만족도 평가를 읽는 기준을 안내합니다.",
    targetKeywords: [
      "토토사이트 후기",
      "토토사이트 리뷰",
      "토토사이트 만족도",
    ],
    sampleTitles: [
      "토토사이트 후기 보는 법: 좋은 후기와 광고성 글 구분하기",
      "토토사이트 만족도 평가에서 먼저 볼 항목",
    ],
    internalGoal: "/reviews와 리뷰 작성 페이지로 연결",
  },
  {
    name: "운영 정보",
    description:
      "라이선스, DNS, WHOIS, 파비콘, 스크린샷 등 이 사이트가 제공하는 데이터의 의미를 풀이합니다.",
    targetKeywords: [
      "토토사이트 라이선스",
      "토토사이트 WHOIS",
      "토토사이트 DNS",
    ],
    sampleTitles: [
      "토토사이트 라이선스 확인 가이드: MGA, UKGC, 퀴라소 차이",
      "토토사이트 도메인 정보에서 확인할 수 있는 것",
    ],
    internalGoal: "상세 페이지의 도메인 정보 탭과 신뢰 점수 설명 보강",
  },
];

export const blogTitlePatterns: BlogTitlePattern[] = [
  {
    name: "기준형",
    formula: "{중심 주제} 고르는 법: {주요 확인 항목}까지 한 번에 확인",
    example: "안전한 토토사이트 고르는 법: 라이선스부터 먹튀 이력까지",
  },
  {
    name: "위험 신호형",
    formula: "{문제 상황} 확인 방법: 가입 전 살펴볼 {숫자}가지 위험 신호",
    example: "먹튀사이트 확인 방법: 가입 전 살펴볼 위험 신호",
  },
  {
    name: "체크리스트형",
    formula: "{상황 키워드}이 생겼을 때 확인할 체크리스트",
    example: "토토사이트 출금 지연이 생겼을 때 확인할 체크리스트",
  },
  {
    name: "비교형",
    formula: "{A 키워드}와 {B 키워드} 차이: 선택 전 알아둘 기준",
    example: "토토사이트 리뷰와 광고성 후기 차이: 선택 전 알아둘 기준",
  },
  {
    name: "작성법형",
    formula: "{콘텐츠 유형} 작성법: {준비물}부터 {완료 기준}까지",
    example: "먹튀 피해 제보 작성법: 증거 정리부터 공개 기준까지",
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "safe-toto-site-checklist",
    category: "검증 기준",
    priority: "상",
    title: "안전한 토토사이트 고르는 법: 라이선스부터 먹튀 이력까지",
    metaTitle: "안전한 토토사이트 고르는 법 | 라이선스·후기·먹튀 이력 체크",
    description:
      "안전한 토토사이트를 찾기 전 확인해야 할 라이선스, 입출금 이력, 후기, 먹튀 제보 기준을 정리했습니다.",
    primaryKeyword: "안전한 토토사이트",
    secondaryKeywords: [
      "토토사이트 추천",
      "토토사이트 검증",
      "먹튀 없는 토토사이트",
      "토토사이트 순위",
    ],
    searchIntent: "가입 전 어떤 기준으로 사이트를 비교해야 하는지 알고 싶은 정보 탐색",
    readerQuestion: "어떤 토토사이트가 상대적으로 안전한지 어떻게 판단할 수 있을까?",
    recommendedTitlePattern: "기준형",
    summary:
      "이 글은 사이트 선택 단계에서 확인할 기준을 정리하는 핵심 허브 글입니다. 목록 페이지, 리뷰, 먹튀 제보로 내부 링크를 연결하기 좋습니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 5,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/reviews", label: "만족도 평가" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
      { href: "/submit-review", label: "만족도 평가 작성" },
    ],
    sections: [
      {
        heading: "첫 기준은 라이선스와 운영 정보입니다",
        paragraphs: [
          "안전한 토토사이트를 판단할 때 가장 먼저 볼 항목은 라이선스와 운영 정보입니다. 라이선스 기관명, 회사명, 약관, 고객센터 정보가 공개되어 있는지 확인해야 합니다.",
          "라이선스 표기가 있더라도 실제로 검증 가능한 정보인지 살펴보는 것이 중요합니다. 기관명만 적어 둔 페이지보다 등록 번호, 운영 주체, 연락 채널이 함께 있는 사이트가 비교에 유리합니다.",
        ],
        bullets: [
          "라이선스 기관명과 등록 정보가 함께 있는지 확인",
          "약관과 개인정보 처리방침이 빈 페이지가 아닌지 확인",
          "운영 주체, 고객센터, 도메인 정보가 서로 일관적인지 확인",
        ],
      },
      {
        heading: "후기와 제보는 같은 방향으로 읽어야 합니다",
        paragraphs: [
          "이용자 후기는 단독으로 판단하기보다 먹튀 제보, 출금 관련 경험, 고객센터 응답 기록과 함께 읽어야 합니다. 별점이 높아도 출금 지연 사례가 반복되면 주의가 필요합니다.",
          "반대로 단일 불만 글만으로 전체를 단정하기도 어렵습니다. 여러 사람이 비슷한 시점에 같은 문제를 말하는지, 제보에 구체적인 정황이 있는지 확인해야 합니다.",
        ],
      },
      {
        heading: "검색 순위보다 검증 기준을 먼저 보세요",
        paragraphs: [
          "검색 결과의 순위가 안전성을 보장하지는 않습니다. 광고성 문구가 많은 페이지보다 기준을 공개하고 이용자 제보를 함께 보여주는 페이지가 더 유용합니다.",
          "이 사이트에서는 사이트별 상세 정보, 만족도 평가, 먹튀 피해 제보를 나누어 확인할 수 있으므로 한 페이지에서 결론을 내리지 말고 여러 신호를 함께 보세요.",
        ],
      },
    ],
    checklist: [
      "공식 라이선스와 약관이 공개되어 있는가",
      "최근 출금 지연 또는 먹튀 제보가 반복되지 않는가",
      "후기가 구체적인 이용 경험을 담고 있는가",
      "도메인과 고객센터 정보가 일관적인가",
      "과도한 보너스 조건이나 불명확한 제한이 없는가",
    ],
    faqs: [
      {
        question: "안전한 토토사이트를 한 가지 기준으로 판단할 수 있나요?",
        answer:
          "어렵습니다. 라이선스, 입출금 이력, 후기, 제보, 도메인 정보가 함께 맞아야 상대적으로 신뢰도를 판단할 수 있습니다.",
      },
      {
        question: "후기가 많으면 무조건 안전한가요?",
        answer:
          "아닙니다. 후기 수보다 구체성, 작성 시점, 문제 제보와의 일관성을 함께 확인해야 합니다.",
      },
    ],
  },
  {
    slug: "toto-site-scam-signs",
    category: "피해 예방",
    priority: "상",
    title: "먹튀사이트 확인 방법: 가입 전 살펴볼 위험 신호",
    metaTitle: "먹튀사이트 확인 방법 | 가입 전 위험 신호 체크",
    description:
      "먹튀사이트를 피하기 위해 가입 전 확인해야 할 출금 지연, 약관, 고객센터, 도메인 변경 징후를 정리했습니다.",
    primaryKeyword: "먹튀사이트 확인",
    secondaryKeywords: [
      "먹튀검증",
      "먹튀 토토사이트",
      "토토사이트 먹튀",
      "먹튀 제보",
    ],
    searchIntent: "피해 가능성이 있는 사이트를 미리 걸러내려는 문제 해결형 검색",
    readerQuestion: "가입하기 전에 먹튀 가능성을 어떻게 확인할 수 있을까?",
    recommendedTitlePattern: "위험 신호형",
    summary:
      "먹튀 관련 검색 수요를 다루는 방어형 콘텐츠입니다. 먹튀 제보 목록과 제보 작성 페이지로 연결합니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/scam-reports", label: "먹튀 피해 제보" },
      { href: "/submit-scam-report", label: "먹튀 제보하기" },
      { href: "/sites", label: "사이트 목록" },
    ],
    sections: [
      {
        heading: "출금 관련 불만이 반복되는지 확인하세요",
        paragraphs: [
          "먹튀사이트에서 가장 자주 나타나는 신호는 출금 지연, 추가 인증 요구, 보너스 조건을 이유로 한 출금 거부입니다. 한두 건의 지연보다 같은 유형의 불만이 반복되는지가 더 중요합니다.",
          "특히 고객센터 답변이 계속 바뀌거나 처리 시점을 명확히 말하지 않는다면 주의해야 합니다. 먹튀 제보의 시점과 내용이 비슷한지도 함께 확인하세요.",
        ],
      },
      {
        heading: "약관이 모호하면 위험합니다",
        paragraphs: [
          "보너스나 이벤트 조건이 지나치게 복잡하거나, 운영자가 임의로 판단할 수 있다는 문구가 많으면 분쟁 가능성이 커집니다. 이용 제한과 출금 제한 기준이 명확해야 합니다.",
          "가입 전에는 이벤트 문구보다 약관의 예외 조건을 먼저 보는 것이 좋습니다. 혜택이 크더라도 출금 조건이 불투명하면 실질적인 위험이 커질 수 있습니다.",
        ],
      },
      {
        heading: "사칭 도메인과 급한 유도 문구도 살펴보세요",
        paragraphs: [
          "공식 주소가 자주 바뀌거나, 텔레그램 또는 메신저에서만 가입을 유도하는 경우 사칭 위험을 확인해야 합니다. 도메인 철자가 비슷한 가짜 주소도 흔한 위험 요소입니다.",
          "검증된 정보 페이지, 최근 후기, 먹튀 제보를 함께 비교하면 단순 홍보 페이지보다 더 현실적인 판단이 가능합니다.",
        ],
      },
    ],
    checklist: [
      "출금 지연 제보가 같은 패턴으로 반복되는가",
      "약관의 출금 제한 조건이 명확한가",
      "고객센터 연락 채널이 실제로 응답하는가",
      "공식 주소와 사칭 주소가 혼재되어 있지 않은가",
      "가입을 지나치게 급하게 유도하지 않는가",
    ],
    faqs: [
      {
        question: "먹튀 제보가 하나라도 있으면 피해야 하나요?",
        answer:
          "단일 제보만으로 단정하기보다 제보 내용의 구체성, 반복 여부, 사이트의 대응 여부를 함께 확인하는 것이 좋습니다.",
      },
      {
        question: "먹튀 피해를 겪었다면 어떤 내용을 기록해야 하나요?",
        answer:
          "이용 기간, 피해 일자, 입금 내역, 고객센터 대화, 출금 신청 기록처럼 시간순으로 확인 가능한 자료를 정리하는 것이 좋습니다.",
      },
    ],
  },
  {
    slug: "toto-site-review-how-to-read",
    category: "후기 해석",
    priority: "상",
    title: "토토사이트 후기 보는 법: 좋은 후기와 광고성 글 구분하기",
    metaTitle: "토토사이트 후기 보는 법 | 실제 후기와 광고성 글 구분",
    description:
      "토토사이트 후기를 읽을 때 별점보다 먼저 봐야 할 경험의 구체성, 작성 시점, 문제 제보와의 연결성을 설명합니다.",
    primaryKeyword: "토토사이트 후기",
    secondaryKeywords: [
      "토토사이트 리뷰",
      "토토사이트 만족도",
      "토토사이트 이용 후기",
    ],
    searchIntent: "사이트 이용 전 실제 후기의 신뢰도를 판단하려는 정보 탐색",
    readerQuestion: "후기 중에서 광고성 글과 실제 이용 경험을 어떻게 구분할 수 있을까?",
    recommendedTitlePattern: "비교형",
    summary:
      "리뷰 페이지의 검색 유입을 받는 글입니다. 이용자 만족도 평가의 신뢰도를 설명하고 리뷰 작성으로 연결합니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/reviews", label: "만족도 평가" },
      { href: "/submit-review", label: "만족도 평가 작성" },
      { href: "/sites", label: "사이트 목록" },
    ],
    sections: [
      {
        heading: "좋은 후기는 상황과 결과가 구체적입니다",
        paragraphs: [
          "실제 이용 후기는 가입 과정, 입출금 처리, 고객센터 응답, 불편했던 점처럼 경험의 맥락이 드러납니다. 반대로 장점만 나열하고 모든 표현이 과장되어 있으면 광고성 글일 수 있습니다.",
          "후기의 길이보다 중요한 것은 확인 가능한 내용입니다. 언제 어떤 문제가 있었고 어떻게 해결되었는지 적힌 글은 판단에 더 도움이 됩니다.",
        ],
      },
      {
        heading: "별점은 출발점일 뿐입니다",
        paragraphs: [
          "높은 별점은 참고가 되지만, 사이트 안정성을 보장하지는 않습니다. 별점과 함께 낮은 평가의 이유, 반복되는 불만, 최근 제보의 유무를 같이 확인해야 합니다.",
          "리뷰가 오래되었다면 현재 운영 상태와 다를 수 있습니다. 최근 리뷰와 최근 먹튀 제보를 나란히 보는 습관이 필요합니다.",
        ],
      },
      {
        heading: "후기를 남길 때도 구체성이 중요합니다",
        paragraphs: [
          "다른 이용자에게 도움이 되는 후기는 단순 추천보다 실제 경험을 담습니다. 장점과 단점을 함께 적으면 신뢰도가 높아집니다.",
          "개인정보나 민감한 계정 정보는 공개하지 말고, 사이트 선택에 필요한 범위에서 경험을 정리하는 것이 좋습니다.",
        ],
      },
    ],
    checklist: [
      "후기에 이용 상황과 처리 결과가 적혀 있는가",
      "장점만 과도하게 반복하지 않는가",
      "최근 후기와 오래된 후기를 구분했는가",
      "낮은 평가의 이유가 반복되는지 확인했는가",
      "먹튀 제보와 같은 방향의 문제가 있는가",
    ],
    faqs: [
      {
        question: "짧은 후기는 모두 의미가 없나요?",
        answer:
          "그렇지는 않습니다. 다만 짧더라도 어떤 경험에 대한 평가인지 드러나야 판단에 도움이 됩니다.",
      },
      {
        question: "광고성 후기를 완벽히 구분할 수 있나요?",
        answer:
          "완벽히 구분하기는 어렵지만 과장 표현, 동일 문구 반복, 구체성 부족을 보면 위험도를 낮출 수 있습니다.",
      },
    ],
  },
  {
    slug: "toto-site-ranking-guide",
    category: "검증 기준",
    priority: "중",
    title: "토토사이트 순위 보는 법: 점수보다 먼저 확인할 기준",
    metaTitle: "토토사이트 순위 보는 법 | 추천 순위보다 중요한 검증 기준",
    description:
      "토토사이트 순위를 볼 때 점수, 광고 문구보다 먼저 확인해야 할 후기, 피해 제보, 라이선스, 운영 정보 기준을 설명합니다.",
    primaryKeyword: "토토사이트 순위",
    secondaryKeywords: [
      "토토사이트 추천 순위",
      "안전한 토토사이트 순위",
      "먹튀검증 토토사이트",
    ],
    searchIntent: "여러 사이트를 비교하고 우선순위를 정하려는 탐색형 검색",
    readerQuestion: "순위 페이지를 볼 때 어떤 기준을 먼저 봐야 할까?",
    recommendedTitlePattern: "기준형",
    summary:
      "순위 키워드를 정보성으로 흡수합니다. 사이트 목록의 필터와 상세 페이지로 이동시키는 허브 글입니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/reviews", label: "만족도 평가" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
    ],
    sections: [
      {
        heading: "순위의 근거를 먼저 확인하세요",
        paragraphs: [
          "토토사이트 순위는 어떤 기준으로 계산했는지 공개되어야 의미가 있습니다. 단순히 1위, 2위로 나열된 페이지보다 평가 항목이 설명된 페이지가 더 신뢰할 수 있습니다.",
          "라이선스, 후기 수, 피해 제보, 운영 정보, 도메인 안정성처럼 비교 가능한 항목이 있어야 순위가 판단 도구가 됩니다.",
        ],
      },
      {
        heading: "높은 순위가 모든 이용자에게 맞지는 않습니다",
        paragraphs: [
          "어떤 이용자는 고객센터 응답을 중요하게 보고, 어떤 이용자는 입출금 처리나 후기의 안정성을 더 중요하게 볼 수 있습니다. 순위는 최종 결론이 아니라 비교를 시작하는 기준입니다.",
          "사이트 상세 페이지에서 본인에게 중요한 기준을 다시 확인해야 합니다.",
        ],
      },
      {
        heading: "순위와 피해 제보를 함께 봐야 합니다",
        paragraphs: [
          "순위가 높아도 최근 먹튀 피해 제보가 늘고 있다면 주의가 필요합니다. 반대로 리뷰가 적은 신규 사이트는 순위가 높더라도 검증 기간이 부족할 수 있습니다.",
          "이런 이유로 순위 페이지는 후기와 제보 페이지를 함께 연결해야 검색 유입 후 신뢰도를 높일 수 있습니다.",
        ],
      },
    ],
    checklist: [
      "순위 산정 기준이 공개되어 있는가",
      "후기와 피해 제보가 함께 반영되어 있는가",
      "최근 데이터인지 확인했는가",
      "사이트 상세 페이지로 검증할 수 있는가",
      "광고 문구와 객관 데이터가 구분되어 있는가",
    ],
    faqs: [
      {
        question: "1위 사이트가 항상 가장 안전한가요?",
        answer:
          "아닙니다. 순위는 참고 지표이며 최근 후기, 제보, 라이선스 정보를 함께 확인해야 합니다.",
      },
      {
        question: "신규 사이트도 순위에 넣어도 되나요?",
        answer:
          "가능하지만 검증 기간이 짧다는 점을 명확히 표시하고, 후기와 피해 제보가 충분한 사이트와 구분하는 것이 좋습니다.",
      },
    ],
  },
  {
    slug: "toto-site-license-guide",
    category: "운영 정보",
    priority: "중",
    title: "토토사이트 라이선스 확인 가이드: MGA, UKGC, 퀴라소 차이",
    metaTitle: "토토사이트 라이선스 확인 가이드 | MGA·UKGC·퀴라소",
    description:
      "토토사이트 라이선스를 볼 때 기관명, 등록 정보, 약관, 운영 주체를 어떻게 확인해야 하는지 정리했습니다.",
    primaryKeyword: "토토사이트 라이선스",
    secondaryKeywords: [
      "MGA 라이선스",
      "UKGC 라이선스",
      "퀴라소 라이선스",
      "토토사이트 검증",
    ],
    searchIntent: "라이선스 표기의 의미와 신뢰도를 이해하려는 정보 탐색",
    readerQuestion: "라이선스가 있다고 쓰여 있으면 어느 정도 신뢰할 수 있을까?",
    recommendedTitlePattern: "비교형",
    summary:
      "운영 정보형 콘텐츠입니다. 사이트 상세 페이지의 라이선스 정보와 도메인 정보 해석을 보강합니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 5,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/blog/safe-toto-site-checklist", label: "안전한 토토사이트 고르는 법" },
    ],
    sections: [
      {
        heading: "라이선스는 표기보다 확인 가능성이 중요합니다",
        paragraphs: [
          "토토사이트가 라이선스를 보유했다고 표기하더라도 기관명만 적힌 경우와 등록 정보까지 확인 가능한 경우는 다릅니다. 확인 가능한 번호, 운영 주체, 약관의 연결성이 중요합니다.",
          "라이선스는 안전성을 보장하는 절대 기준이 아니라 기본 검증 항목 중 하나입니다. 후기, 제보, 운영 이력과 함께 판단해야 합니다.",
        ],
      },
      {
        heading: "기관별 명칭은 혼동하지 말아야 합니다",
        paragraphs: [
          "MGA, UKGC, 퀴라소 등은 서로 다른 규제 체계와 확인 방식을 갖습니다. 이름이 익숙하다는 이유만으로 실제 등록 여부를 확인하지 않으면 의미가 약해집니다.",
          "사이트가 어떤 법인명으로 등록되어 있는지, 이용 약관의 운영 주체와 같은지 확인하는 것이 좋습니다.",
        ],
      },
      {
        heading: "라이선스가 없어도 위험, 있어도 추가 확인 필요",
        paragraphs: [
          "라이선스 정보가 전혀 없거나 허위로 보이면 위험 신호입니다. 하지만 라이선스가 있다고 해서 출금 처리, 고객 대응, 이용자 만족도가 자동으로 검증되는 것은 아닙니다.",
          "따라서 라이선스 글은 사이트 목록과 후기, 피해 제보 페이지로 연결해 종합 판단을 유도해야 합니다.",
        ],
      },
    ],
    checklist: [
      "라이선스 기관명과 등록 번호가 함께 있는가",
      "약관의 운영 법인과 라이선스 정보가 일치하는가",
      "라이선스 페이지가 실제 확인 가능한 형태인가",
      "후기와 피해 제보에서도 운영 안정성이 보이는가",
      "라이선스를 과장 홍보 문구로만 쓰지 않는가",
    ],
    faqs: [
      {
        question: "라이선스가 있으면 먹튀 위험이 없나요?",
        answer:
          "아닙니다. 라이선스는 중요한 참고 항목이지만 출금 이력, 후기, 피해 제보를 함께 확인해야 합니다.",
      },
      {
        question: "라이선스 정보가 없는 사이트는 어떻게 봐야 하나요?",
        answer:
          "운영 정보가 불투명한 것으로 보고 더 보수적으로 판단하는 것이 좋습니다.",
      },
    ],
  },
  {
    slug: "withdrawal-delay-checklist",
    category: "피해 예방",
    priority: "상",
    title: "토토사이트 출금 지연이 생겼을 때 확인할 체크리스트",
    metaTitle: "토토사이트 출금 지연 체크리스트 | 확인할 기록과 대응 기준",
    description:
      "토토사이트 출금 지연 상황에서 약관, 고객센터 답변, 입출금 기록, 피해 제보 작성 전 확인할 내용을 정리했습니다.",
    primaryKeyword: "토토사이트 출금 지연",
    secondaryKeywords: [
      "토토사이트 출금 거부",
      "먹튀 피해",
      "먹튀 제보",
      "출금 지연 대처",
    ],
    searchIntent: "출금 문제가 생긴 이용자가 확인할 절차를 찾는 문제 해결형 검색",
    readerQuestion: "출금이 늦어질 때 어떤 기록을 먼저 확인해야 할까?",
    recommendedTitlePattern: "체크리스트형",
    summary:
      "문제 상황 키워드를 받는 실용 글입니다. 피해 제보 작성으로 연결하기 좋습니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/submit-scam-report", label: "먹튀 제보하기" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
      { href: "/blog/toto-site-scam-signs", label: "먹튀사이트 확인 방법" },
    ],
    sections: [
      {
        heading: "먼저 약관과 신청 시간을 확인하세요",
        paragraphs: [
          "출금 지연이 발생하면 감정적으로 대응하기 전에 신청 시간, 약관상 처리 시간, 추가 인증 요구 여부를 확인해야 합니다. 처리 기준을 알아야 단순 지연과 위험 상황을 구분할 수 있습니다.",
          "약관에 없는 조건을 갑자기 요구하거나, 같은 질문에 답변이 계속 달라진다면 기록을 남겨 두는 것이 좋습니다.",
        ],
      },
      {
        heading: "고객센터 대화와 거래 기록을 보관하세요",
        paragraphs: [
          "피해 제보를 작성하려면 시간순 기록이 중요합니다. 입금 내역, 출금 신청 화면, 고객센터 답변, 계정 제한 안내가 있다면 캡처해 두세요.",
          "개인정보는 공개하지 않도록 가리고, 사건을 설명하는 데 필요한 범위의 기록만 정리하는 것이 안전합니다.",
        ],
      },
      {
        heading: "반복 지연이면 먹튀 제보를 확인하세요",
        paragraphs: [
          "동일 사이트에서 같은 시기에 유사한 출금 지연 제보가 많다면 개별 문제가 아닐 수 있습니다. 먹튀 제보 목록을 확인하면 위험도를 판단하는 데 도움이 됩니다.",
          "제보를 작성할 때는 과장보다 확인 가능한 사실을 중심으로 정리해야 다른 이용자에게 도움이 됩니다.",
        ],
      },
    ],
    checklist: [
      "출금 신청 일시와 약관상 처리 시간을 확인했다",
      "고객센터 답변을 시간순으로 보관했다",
      "추가 인증 또는 보너스 조건 요구가 약관에 있는지 확인했다",
      "입금 및 출금 신청 기록을 정리했다",
      "개인정보를 가린 뒤 제보 자료를 준비했다",
    ],
    faqs: [
      {
        question: "출금이 몇 시간 늦어지면 바로 먹튀인가요?",
        answer:
          "항상 그렇지는 않습니다. 약관상 처리 시간과 고객센터 답변, 반복 제보 여부를 함께 확인해야 합니다.",
      },
      {
        question: "제보에는 어떤 자료가 도움이 되나요?",
        answer:
          "입출금 기록, 고객센터 대화, 처리 지연 안내, 약관 캡처처럼 사건 흐름을 확인할 수 있는 자료가 도움이 됩니다.",
      },
    ],
  },
  {
    slug: "new-toto-site-verification",
    category: "검증 기준",
    priority: "중",
    title: "신규 토토사이트 검증 기준: 가입 전 확인해야 할 항목",
    metaTitle: "신규 토토사이트 검증 기준 | 가입 전 체크할 항목",
    description:
      "신규 토토사이트를 볼 때 검증 기간, 도메인 정보, 후기 부족, 보너스 조건, 고객센터 응답을 어떻게 판단할지 정리했습니다.",
    primaryKeyword: "신규 토토사이트",
    secondaryKeywords: [
      "신규 토토사이트 추천",
      "신규 토토사이트 검증",
      "토토사이트 가입 전 확인",
    ],
    searchIntent: "새로운 사이트를 발견한 이용자가 안전성을 판단하려는 탐색",
    readerQuestion: "신규 사이트는 어떤 기준으로 조심해서 봐야 할까?",
    recommendedTitlePattern: "기준형",
    summary:
      "신규 키워드를 안전 기준 중심으로 다루는 글입니다. 검증 부족의 한계를 명확히 설명합니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/site-registration", label: "사이트 등록" },
      { href: "/reviews", label: "만족도 평가" },
    ],
    sections: [
      {
        heading: "신규 사이트는 데이터가 부족합니다",
        paragraphs: [
          "신규 토토사이트는 후기가 적고 운영 기간이 짧아 판단 근거가 부족합니다. 이 점을 숨기지 않고 검증 기간이 필요하다는 전제를 두는 것이 중요합니다.",
          "초기 이벤트가 강하게 노출되더라도 운영 이력, 약관, 고객센터 응답을 먼저 확인해야 합니다.",
        ],
      },
      {
        heading: "도메인과 운영 정보의 일관성을 확인하세요",
        paragraphs: [
          "새 사이트일수록 도메인 생성 시기, 운영 주체, 라이선스 표기, 고객센터 주소가 일관적인지 확인해야 합니다. 정보가 서로 맞지 않으면 위험 신호로 볼 수 있습니다.",
          "사이트 상세 페이지에 도메인 정보와 운영 정보가 함께 있으면 초기 판단에 도움이 됩니다.",
        ],
      },
      {
        heading: "후기가 생길 때까지 보수적으로 판단하세요",
        paragraphs: [
          "신규 사이트는 긍정적 후기가 있더라도 표본이 적습니다. 리뷰와 피해 제보가 충분히 쌓이기 전까지는 높은 확신을 갖기 어렵습니다.",
          "검색 유입 글에서는 신규 추천보다 신규 검증 기준을 강조하는 편이 사이트 신뢰도에도 유리합니다.",
        ],
      },
    ],
    checklist: [
      "운영 기간과 도메인 생성 시기를 확인했다",
      "라이선스와 약관 정보가 공개되어 있다",
      "후기 수가 적다는 한계를 인지했다",
      "보너스 조건이 과도하거나 불명확하지 않다",
      "고객센터 응답 방식이 정상적이다",
    ],
    faqs: [
      {
        question: "신규 토토사이트는 무조건 위험한가요?",
        answer:
          "무조건 위험하다고 단정할 수는 없지만 검증 데이터가 부족하므로 더 보수적으로 확인해야 합니다.",
      },
      {
        question: "신규 사이트 글은 어떤 제목이 좋나요?",
        answer:
          "추천을 단정하기보다 '검증 기준', '가입 전 확인 항목'처럼 정보 탐색형 제목이 안전합니다.",
      },
    ],
  },
  {
    slug: "toto-site-domain-change",
    category: "피해 예방",
    priority: "중",
    title: "토토사이트 도메인 변경 확인법: 공식 주소와 사칭 주소 구분",
    metaTitle: "토토사이트 도메인 변경 확인법 | 공식 주소와 사칭 주소 구분",
    description:
      "토토사이트 도메인 변경 시 공식 주소, 사칭 주소, 유사 도메인, 고객센터 안내를 확인하는 방법을 정리했습니다.",
    primaryKeyword: "토토사이트 도메인 변경",
    secondaryKeywords: [
      "토토사이트 주소",
      "토토사이트 공식 주소",
      "토토사이트 사칭",
      "도메인 변경 확인",
    ],
    searchIntent: "접속 주소가 바뀌었을 때 공식 주소인지 확인하려는 문제 해결형 검색",
    readerQuestion: "새 주소가 진짜 공식 주소인지 어떻게 확인할 수 있을까?",
    recommendedTitlePattern: "체크리스트형",
    summary:
      "주소 변경과 사칭 위험 키워드를 흡수합니다. 상세 페이지의 도메인 정보와 잘 연결됩니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/blog/toto-site-scam-signs", label: "먹튀사이트 확인 방법" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
    ],
    sections: [
      {
        heading: "도메인 변경은 공식 안내 경로를 확인해야 합니다",
        paragraphs: [
          "토토사이트 주소가 변경되었다는 안내를 받았다면 먼저 공식 고객센터, 기존 공지, 검증 페이지의 주소가 일치하는지 확인해야 합니다. 메신저로 받은 단일 링크만 믿는 것은 위험합니다.",
          "사칭 주소는 철자 하나만 다르게 만들거나 비슷한 도메인 확장자를 쓰는 경우가 많습니다.",
        ],
      },
      {
        heading: "도메인 정보와 사이트 정보가 맞는지 보세요",
        paragraphs: [
          "도메인 생성 시기나 DNS 정보가 갑자기 바뀐 경우에는 왜 변경되었는지 살펴볼 필요가 있습니다. 도메인 변경 자체가 위험은 아니지만 설명 없이 반복되면 신뢰도가 낮아질 수 있습니다.",
          "상세 페이지의 등록 도메인 목록과 현재 접속 주소를 비교하면 사칭 가능성을 줄일 수 있습니다.",
        ],
      },
      {
        heading: "주소 변경 글은 내부 링크 역할이 큽니다",
        paragraphs: [
          "주소 키워드 검색자는 빠르게 확인 가능한 목록을 원합니다. 따라서 글 안에서 사이트 목록과 상세 페이지로 이동할 수 있게 구성하는 것이 좋습니다.",
          "다만 공식 주소를 단정하기보다 등록된 도메인과 최근 제보를 함께 확인하도록 안내해야 합니다.",
        ],
      },
    ],
    checklist: [
      "기존 공지와 새 주소 안내가 일치하는가",
      "고객센터가 공식 채널에서 같은 주소를 안내하는가",
      "철자가 비슷한 사칭 도메인이 아닌가",
      "도메인 정보가 상세 페이지와 일치하는가",
      "주소 변경 직후 피해 제보가 늘지 않았는가",
    ],
    faqs: [
      {
        question: "도메인이 바뀌면 무조건 위험한가요?",
        answer:
          "항상 그렇지는 않지만 공식 안내 경로, 도메인 정보, 최근 제보를 함께 확인해야 합니다.",
      },
      {
        question: "사칭 도메인은 어떻게 구분하나요?",
        answer:
          "철자, 도메인 확장자, 고객센터 안내 경로, 등록된 도메인 목록과의 일치 여부를 비교해야 합니다.",
      },
    ],
  },
  {
    slug: "scam-report-write-guide",
    category: "피해 예방",
    priority: "중",
    title: "먹튀 피해 제보 작성법: 증거 정리부터 공개 기준까지",
    metaTitle: "먹튀 피해 제보 작성법 | 증거 정리와 공개 기준",
    description:
      "먹튀 피해 제보를 작성할 때 필요한 사건 정보, 피해 금액, 증거 자료, 개인정보 보호 기준을 설명합니다.",
    primaryKeyword: "먹튀 피해 제보",
    secondaryKeywords: [
      "먹튀 신고",
      "토토사이트 피해 제보",
      "먹튀 증거",
      "먹튀 제보 작성",
    ],
    searchIntent: "피해 경험을 정리해 먹튀 제보를 작성하려는 문제 해결형 검색",
    readerQuestion: "먹튀 제보에는 어떤 내용을 어떻게 적어야 할까?",
    recommendedTitlePattern: "작성법형",
    summary:
      "제보 작성 전환을 만드는 글입니다. 양식 작성 페이지와 먹튀 제보 목록으로 연결합니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 4,
    internalLinks: [
      { href: "/submit-scam-report", label: "먹튀 제보하기" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
      { href: "/sites", label: "사이트 목록" },
    ],
    sections: [
      {
        heading: "사건 흐름을 시간순으로 정리하세요",
        paragraphs: [
          "먹튀 피해 제보는 감정적인 표현보다 시간순 기록이 중요합니다. 가입일, 입금일, 출금 신청일, 고객센터 답변 시점이 정리되어 있으면 검토가 쉬워집니다.",
          "피해 금액을 모르는 경우에도 어떤 상황에서 문제가 생겼는지 구체적으로 적으면 다른 이용자에게 도움이 됩니다.",
        ],
      },
      {
        heading: "증거는 필요한 범위만 공개해야 합니다",
        paragraphs: [
          "입금 기록, 출금 신청 화면, 고객센터 대화는 유용한 자료입니다. 하지만 계좌번호, 실명, 연락처처럼 민감한 정보는 공개하지 않도록 가려야 합니다.",
          "제보자는 사실 확인이 가능한 자료를 중심으로 정리하고, 사이트 운영자나 제3자의 개인정보가 노출되지 않도록 주의해야 합니다.",
        ],
      },
      {
        heading: "공개 기준은 신뢰도를 위해 필요합니다",
        paragraphs: [
          "모든 제보를 바로 공개하면 허위 제보나 개인정보 노출 위험이 생길 수 있습니다. 관리자 검토를 거친 공개 방식은 커뮤니티 신뢰도를 지키는 데 중요합니다.",
          "제보 글에는 사실과 의견을 구분해 적는 것이 좋습니다. 확인 가능한 사실이 많을수록 검색 이용자에게 더 가치 있는 콘텐츠가 됩니다.",
        ],
      },
    ],
    checklist: [
      "사이트명과 도메인을 정확히 적었다",
      "피해 일자와 이용 기간을 정리했다",
      "피해 유형과 금액을 가능한 범위에서 적었다",
      "증거 이미지의 개인정보를 가렸다",
      "사실과 추측을 구분해 작성했다",
    ],
    faqs: [
      {
        question: "피해 금액을 정확히 모르면 제보할 수 없나요?",
        answer:
          "정확한 금액을 모르는 경우에도 피해 유형과 상황 설명을 구체적으로 적으면 제보할 수 있습니다.",
      },
      {
        question: "제보가 바로 공개되나요?",
        answer:
          "공개 전 관리자 검토를 거쳐 개인정보 노출이나 허위 정보 위험을 줄이는 방식이 좋습니다.",
      },
    ],
  },
  {
    slug: "responsible-use-guide",
    category: "운영 정보",
    priority: "중",
    title: "토토사이트 이용 전 책임 있는 이용 기준",
    metaTitle: "토토사이트 이용 전 책임 있는 이용 기준 | 19세 이상·과몰입 예방",
    description:
      "토토사이트 관련 정보를 볼 때 19세 이상 이용, 과몰입 예방, 손실 한도, 도움 요청 기준을 함께 확인해야 하는 이유를 설명합니다.",
    primaryKeyword: "토토사이트 이용 주의사항",
    secondaryKeywords: [
      "책임 있는 이용",
      "도박 중독 예방",
      "토토사이트 주의사항",
      "19세 이상 토토사이트",
    ],
    searchIntent: "이용 전 주의사항과 책임 있는 이용 기준을 확인하려는 정보 탐색",
    readerQuestion: "사이트 정보를 볼 때 어떤 이용 기준을 함께 정해야 할까?",
    recommendedTitlePattern: "기준형",
    summary:
      "전체 사이트의 책임 있는 이용 안내를 보강하는 신뢰 콘텐츠입니다. 푸터 안내와 함께 쓰기 좋습니다.",
    publishedAt: "2026-04-30",
    updatedAt: "2026-04-30",
    readingMinutes: 3,
    internalLinks: [
      { href: "/sites", label: "사이트 목록" },
      { href: "/reviews", label: "만족도 평가" },
      { href: "/scam-reports", label: "먹튀 피해 제보" },
    ],
    sections: [
      {
        heading: "정보 확인과 이용 결정은 분리해야 합니다",
        paragraphs: [
          "토토사이트 관련 정보는 사이트를 비교하고 위험을 줄이기 위한 참고 자료입니다. 검색 결과나 후기만 보고 즉시 이용을 결정하기보다 본인의 상황과 법적 기준을 먼저 확인해야 합니다.",
          "19세 미만은 이용할 수 없으며, 거주 지역의 관련 법과 규정을 확인해야 합니다.",
        ],
      },
      {
        heading: "한도와 중단 기준을 먼저 정하세요",
        paragraphs: [
          "이용 전에는 시간과 금액 한도를 정하고, 손실을 만회하려는 행동이 반복되면 즉시 중단해야 합니다. 과몰입은 판단력을 떨어뜨리고 피해를 키울 수 있습니다.",
          "사이트 선택 기준만큼 중요한 것은 이용하지 않을 기준입니다. 불안하거나 통제가 어렵다면 도움을 요청해야 합니다.",
        ],
      },
      {
        heading: "책임 있는 이용 안내는 신뢰 신호입니다",
        paragraphs: [
          "검색 유입 콘텐츠에도 책임 있는 이용 기준을 포함하면 사이트가 단순 홍보가 아니라 정보 제공 플랫폼이라는 인상을 줄 수 있습니다.",
          "검증, 후기, 피해 제보 콘텐츠와 함께 책임 있는 이용 안내를 반복적으로 연결하는 것이 좋습니다.",
        ],
      },
    ],
    checklist: [
      "19세 이상 및 관련 법규를 확인했다",
      "시간과 금액 한도를 정했다",
      "손실 만회 목적의 이용을 중단할 기준을 정했다",
      "과몰입 징후가 있으면 도움을 요청한다",
      "사이트 정보는 참고 자료로만 사용한다",
    ],
    faqs: [
      {
        question: "책임 있는 이용 글도 SEO에 도움이 되나요?",
        answer:
          "직접 전환 키워드는 아니지만 신뢰도, 체류 시간, 내부 링크 구조를 보강하는 역할을 합니다.",
      },
      {
        question: "도움이 필요할 때 어디에 연락해야 하나요?",
        answer:
          "도박 문제로 어려움이 있으면 한국도박문제예방치유원 상담 서비스 등 전문 지원 기관에 도움을 요청하는 것이 좋습니다.",
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export function getBlogPostsByCategory(category: string) {
  const categorySlug = blogCategorySlugs.includes(category as BlogCategorySlug)
    ? (category as BlogCategorySlug)
    : getBlogPrimaryCategoryFromLabel(category);

  return blogPosts.filter((post) => {
    const primaryCategory =
      post.primaryCategory ?? getBlogPrimaryCategoryFromLabel(post.category);

    return (
      primaryCategory === categorySlug ||
      (post.secondaryCategories ?? []).includes(categorySlug)
    );
  });
}
