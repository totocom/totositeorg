export type ModerationStatus = "pending" | "approved" | "rejected";

export type SiteStatus =
  | "운영 중"
  | "일부 지역에서만 이용 가능"
  | "확인 필요"
  | "리뷰 대기";

export type IssueType =
  | "general"
  | "payment"
  | "kyc"
  | "support"
  | "app_ux"
  | "bonus_terms"
  | "account_limit"
  | "other";

export type ReviewTarget = {
  id: string;
  slug: string;
  siteName: string;
  siteNameKo?: string | null;
  siteNameEn?: string | null;
  siteUrl: string;
  domains: string[];
  screenshotUrl: string | null;
  screenshotThumbUrl?: string | null;
  faviconUrl?: string | null;
  category: string;
  availableStates: string[];
  licenseInfo: string;
  status: SiteStatus;
  moderationStatus: ModerationStatus;
  shortDescription: string;
  averageRating: number;
  reviewCount: number;
  scamReportCount?: number;
  scamDamageAmount?: number;
  scamDamageAmountUnknownCount?: number;
  resolvedIps?: string[];
  dnsCheckedAt?: string | null;
  domainSearchText?: string;
  oldestDomainCreationDate?: string;
  trustScore?: SiteTrustScore;
};

export type SiteTrustScore = {
  total: number;
  rawTotal: number;
  scamRisk: number;
  domainAge: number;
  userExperience: number;
  summary: string;
};

export type SiteReview = {
  id: string;
  siteId: string;
  authorNickname?: string | null;
  rating: number;
  title: string;
  experience: string;
  issueType: IssueType;
  createdAt: string;
  status: ModerationStatus;
};

export type ScamReport = {
  id: string;
  siteId: string;
  authorNickname?: string | null;
  incidentDate: string;
  usagePeriod: string;
  mainCategory: string;
  categoryItems: string[];
  categoryEtcText: string | null;
  damageTypes: string[];
  damageTypeEtcText: string | null;
  damageAmount: number | null;
  damageAmountUnknown: boolean;
  situationDescription: string;
  depositBankName: string | null;
  depositAccountNumber: string | null;
  depositAccountHolder: string | null;
  depositAmount: number | null;
  depositDate: string | null;
  evidenceImageUrls: string[];
  evidenceNote: string | null;
  reviewStatus: ModerationStatus;
  isPublished: boolean;
  createdAt: string;
};

export const moderationStatusLabels: Record<ModerationStatus, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "거절됨",
};

export const issueTypeLabels: Record<IssueType, string> = {
  general: "일반 이용 후기",
  payment: "입출금 경험",
  kyc: "계정 인증/KYC",
  support: "고객지원",
  app_ux: "앱/UX",
  bonus_terms: "보너스 조건 관련",
  account_limit: "계정 제한",
  other: "기타",
};

export function formatRatingScore(rating: number) {
  const score = Math.round(rating * 20);
  return `${score}/100`;
}

export function formatTrustScore(score: SiteTrustScore | undefined) {
  return `${score?.total ?? 0}/100`;
}

export function getTrustScoreTone(score: number) {
  if (score <= 33) return "danger";
  if (score <= 67) return "warning";
  return "safe";
}

function getDomainAgeMonths(oldestDomainCreationDate?: string) {
  if (!oldestDomainCreationDate) return null;

  const createdAt = new Date(oldestDomainCreationDate);
  const now = new Date();

  if (!Number.isFinite(createdAt.getTime()) || createdAt > now) {
    return null;
  }

  return (
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth()
  );
}

function calculateScamRiskScore(
  scamReportCount = 0,
  scamDamageAmount = 0,
  scamDamageAmountUnknownCount = 0,
) {
  let score = 100;

  if (scamReportCount >= 4) {
    score = 10;
  } else if (scamReportCount >= 2) {
    score = 40;
  } else if (scamReportCount === 1) {
    score = 70;
  }

  if (scamDamageAmount >= 10_000_000) {
    score -= 30;
  } else if (scamDamageAmount >= 5_000_000) {
    score -= 20;
  } else if (scamDamageAmount >= 1_000_000) {
    score -= 10;
  }

  if (scamDamageAmountUnknownCount > 0) {
    score -= 6;
  }

  return Math.max(0, Math.round(score));
}

function calculateDomainAgeScore(oldestDomainCreationDate?: string) {
  const ageMonths = getDomainAgeMonths(oldestDomainCreationDate);

  if (ageMonths === null) return 24;
  if (ageMonths >= 60) return 100;
  if (ageMonths >= 36) return 80;
  if (ageMonths >= 12) return 56;
  if (ageMonths >= 6) return 32;
  return 16;
}

function calculateUserExperienceScore(averageRating = 0, reviewCount = 0) {
  if (reviewCount <= 0) return 40;

  const base = Math.max(0, Math.min(5, averageRating)) * 20;
  const reviewWeight = reviewCount >= 5 ? 1 : reviewCount >= 2 ? 0.85 : 0.7;

  return Math.round(base * reviewWeight);
}

function getTrustScoreSummary(
  scamReportCount: number,
  oldestDomainCreationDate: string | undefined,
  reviewCount: number,
) {
  const parts = [
    scamReportCount > 0 ? `먹튀 ${scamReportCount}건 반영` : "먹튀 제보 없음",
    oldestDomainCreationDate ? "도메인 이력 반영" : "도메인 이력 확인 불가",
    reviewCount > 0 ? `이용자 평가 ${reviewCount}건 반영` : "이용자 평가 대기",
  ];

  return parts.join(" · ");
}

export function calculateSiteTrustScore(params: {
  averageRating: number;
  reviewCount: number;
  scamReportCount?: number;
  scamDamageAmount?: number;
  scamDamageAmountUnknownCount?: number;
  oldestDomainCreationDate?: string;
}): SiteTrustScore {
  const scamReportCount = params.scamReportCount ?? 0;
  const scamDamageAmount = params.scamDamageAmount ?? 0;
  const scamDamageAmountUnknownCount = params.scamDamageAmountUnknownCount ?? 0;
  const scamRisk = calculateScamRiskScore(
    scamReportCount,
    scamDamageAmount,
    scamDamageAmountUnknownCount,
  );
  const domainAge = calculateDomainAgeScore(params.oldestDomainCreationDate);
  const userExperience = calculateUserExperienceScore(
    params.averageRating,
    params.reviewCount,
  );
  const rawTotal = Math.max(0, Math.min(300, scamRisk + domainAge + userExperience));

  return {
    total: Math.round(rawTotal / 3),
    rawTotal,
    scamRisk,
    domainAge,
    userExperience,
    summary: getTrustScoreSummary(
      scamReportCount,
      params.oldestDomainCreationDate,
      params.reviewCount,
    ),
  };
}

export const responsibleUseNotice = [
  "본 사이트는 이용자의 경험 공유와 정보 제공을 위한 플랫폼입니다.",
  "본 사이트는 도박 참여를 권장하지 않습니다.",
  "실제 이용 가능 여부와 최신 조건은 각 공식 사이트 및 관련 법령을 반드시 확인해야 합니다.",
  "19세 이상 이용자를 대상으로 합니다.",
  "도박 문제가 있다면 한국도박문제관리센터(1336)에 도움을 요청하세요.",
];

export const koreanRegions = [
  "서울",
  "부산",
  "대구",
  "인천",
  "광주",
  "대전",
  "울산",
  "세종",
  "경기",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

export const siteCategories = [
  "스포츠베팅",
  "카지노베팅",
  "슬롯베팅",
  "미니게임베팅",
  "기타 베팅",
];

export const sites: ReviewTarget[] = [
  {
    id: "kbet-sports",
    slug: "kbet-sports",
    siteName: "K벳 스포츠",
    siteUrl: "https://kbetsports.example",
    domains: ["https://kbetsports.example"],
    screenshotUrl: null,
    faviconUrl: null,
    category: "스포츠토토",
    availableStates: ["서울", "부산", "경기", "인천"],
    licenseInfo:
      "공식 사이트에 국내 관련 법령 준수 및 이용 약관이 명시되어 있으나 실제 라이선스 취득 여부는 이용자가 직접 확인해야 합니다.",
    status: "일부 지역에서만 이용 가능",
    moderationStatus: "approved",
    shortDescription:
      "국내 주요 스포츠 경기를 대상으로 베팅 서비스를 제공하는 온라인 스포츠토토 사이트입니다.",
    averageRating: 3.8,
    reviewCount: 42,
  },
  {
    id: "royal-casino-kr",
    slug: "royal-casino-kr",
    siteName: "로열 카지노 KR",
    siteUrl: "https://royalcasinokr.example",
    domains: ["https://royalcasinokr.example"],
    screenshotUrl: null,
    faviconUrl: null,
    category: "온라인카지노",
    availableStates: ["서울", "부산", "대구", "경기", "제주"],
    licenseInfo:
      "슬롯 및 테이블 게임 서비스에 대한 이용 약관이 공식 사이트에 게시되어 있습니다. 이용 전 관련 법령 확인을 권장합니다.",
    status: "운영 중",
    moderationStatus: "approved",
    shortDescription:
      "슬롯과 라이브 딜러 테이블 게임을 제공하는 온라인 카지노 서비스입니다.",
    averageRating: 3.6,
    reviewCount: 57,
  },
  {
    id: "hangang-poker",
    slug: "hangang-poker",
    siteName: "한강 포커",
    siteUrl: "https://hangangpoker.example",
    domains: ["https://hangangpoker.example"],
    screenshotUrl: null,
    faviconUrl: null,
    category: "포커",
    availableStates: ["서울", "경기", "인천"],
    licenseInfo:
      "포커 서비스 이용 조건과 계정 인증 절차가 공식 사이트에 안내되어 있습니다. 이용 전 약관 확인이 필요합니다.",
    status: "확인 필요",
    moderationStatus: "approved",
    shortDescription:
      "온라인 포커 이용 경험과 계정 인증 절차에 대한 리뷰가 모이는 사이트입니다.",
    averageRating: 3.2,
    reviewCount: 24,
  },
  {
    id: "esports-bet-kr",
    slug: "esports-bet-kr",
    siteName: "e스포츠 벳 KR",
    siteUrl: "https://esportsbetkr.example",
    domains: ["https://esportsbetkr.example"],
    screenshotUrl: null,
    faviconUrl: null,
    category: "e스포츠 베팅",
    availableStates: ["서울", "부산", "대전", "광주"],
    licenseInfo:
      "e스포츠 베팅 관련 서비스 약관 확인이 필요합니다. 커뮤니티 검토 대기 중입니다.",
    status: "리뷰 대기",
    moderationStatus: "pending",
    shortDescription:
      "국내외 e스포츠 경기를 대상으로 베팅 서비스를 제공하는 플랫폼으로, 커뮤니티 검토를 기다리고 있습니다.",
    averageRating: 0,
    reviewCount: 0,
  },
];

export const reviews: SiteReview[] = [
  {
    id: "review-kbet-1",
    siteId: "kbet-sports",
    rating: 4,
    title: "본인 확인 절차가 비교적 명확했습니다",
    experience:
      "서울에서 이용했습니다. 가입 시 본인 확인이 요구되었지만 안내 문구는 이해하기 쉬웠고, 이용 가능 지역 안내를 다시 확인할 수 있었습니다.",
    issueType: "general",
    createdAt: "2026-04-18",
    status: "approved",
  },
  {
    id: "review-casino-1",
    siteId: "royal-casino-kr",
    rating: 3,
    title: "입금은 빠른 편이었고 출금 안내는 더 자세했으면 합니다",
    experience:
      "부산에서 이용했습니다. 입금 처리 과정은 명확했지만, 출금 예상 시간과 추가 확인 단계에 대한 안내는 조금 부족하게 느껴졌습니다.",
    issueType: "payment",
    createdAt: "2026-04-20",
    status: "approved",
  },
  {
    id: "review-poker-1",
    siteId: "hangang-poker",
    rating: 2,
    title: "KYC 검토 시간이 예상보다 길었습니다",
    experience:
      "경기에서 계정 인증을 진행했습니다. 제출 서류 안내는 있었지만 검토 지연 시 현재 상태를 확인하기 어려웠습니다.",
    issueType: "kyc",
    createdAt: "2026-04-22",
    status: "pending",
  },
  {
    id: "review-esports-1",
    siteId: "esports-bet-kr",
    rating: 3,
    title: "보너스 조건 문구 확인이 필요했습니다",
    experience:
      "서울에서 이용 가능 여부와 프로모션 조건을 확인했습니다. 조건 설명이 길어 핵심 제한 사항을 따로 확인해야 했습니다.",
    issueType: "bonus_terms",
    createdAt: "2026-04-23",
    status: "pending",
  },
];

export function getApprovedSites() {
  return sites.filter((site) => site.moderationStatus === "approved");
}

export function getApprovedSiteCategories() {
  return Array.from(
    new Set(getApprovedSites().map((site) => site.category)),
  ).sort();
}

export function getApprovedSiteRegions() {
  return Array.from(
    new Set(getApprovedSites().flatMap((site) => site.availableStates)),
  ).sort();
}

export function getSiteById(id: string) {
  return sites.find((site) => site.id === id);
}

export function getApprovedReviewsBySiteId(siteId: string) {
  return reviews.filter(
    (review) => review.siteId === siteId && review.status === "approved",
  );
}

export function getPendingSites() {
  return sites.filter((site) => site.moderationStatus === "pending");
}

export function getPendingReviews() {
  return reviews.filter((review) => review.status === "pending");
}
