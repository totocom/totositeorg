import {
  sanitizePublicGeneratedText,
  sanitizePublicSiteName,
  sanitizePublicUserText,
} from "./public-display";

export type ReviewSurveyPayload = {
  type?: string;
  answers?: Record<string, string | string[]>;
  comment?: string | null;
};

export type ScamReportSeoInput = {
  damageTypes?: string[] | null;
  mainCategory?: string | null;
  categoryItems?: string[] | null;
};

export type ReviewSeoInput = {
  experience?: string | null;
};

const excludedExactValues = new Set([
  "",
  "기타",
  "기타 베팅",
  "없음",
  "미확인",
  "잘 모르겠음",
  "이용 안 함",
  "금액 미상",
]);

const excludedValueFragments = [
  "미확인",
  "확인 불가",
  "알 수 없음",
  "잘 모르",
  "없음",
];

const unsafeSeoFragments = [
  "먹튀 확정",
  "위험 사이트 확정",
  "안전 보장",
  "검증 완료",
  "추천",
  "가입",
  "바로가기",
  "접속하기",
  "계좌",
  "예금주",
  "은행",
  "지갑",
  "전화",
  "연락처",
  "텔레그램",
  "카카오",
  "카톡",
  "사용자 ID",
  "아이디",
  "user_agent",
  "관리자 메모",
  "reject_reason",
  "증빙",
  "파일 경로",
];

const reviewDetailCategoryIds = [
  "sports_betting",
  "casino_betting",
  "slot_betting",
  "mini_game_betting",
  "other_betting",
];

const reviewEvaluationTopicRules = [
  {
    label: "환전 처리",
    ids: [
      "withdraw_speed",
      "withdraw_stability",
      "deposit_speed",
      "deposit_stability",
    ],
  },
  {
    label: "고객센터 응답",
    ids: ["cs_response_speed", "cs_accuracy", "cs_kindness"],
  },
  {
    label: "모바일 사용성",
    ids: ["mobile_usability", "access_speed", "screen_layout", "error_lag"],
  },
  {
    label: "이벤트",
    ids: ["event_satisfaction", "event_difficulty", "event_reward"],
  },
  {
    label: "이용자 체감 평가",
    ids: [
      "overall_safety",
      "site_trust",
      "transaction_stability",
      "privacy_satisfaction",
    ],
  },
  {
    label: "전체 만족도",
    ids: ["overall_satisfaction"],
  },
] as const;

const reviewMetaTopicLabels = new Map([
  ["환전 처리", "환전"],
  ["고객센터 응답", "고객센터"],
  ["전체 만족도", "만족도"],
  ["모바일 사용성", "모바일 사용성"],
  ["이벤트", "이벤트"],
]);

const publicReviewAnswerReplacements = new Map([
  ["지인 추천", "지인 소개"],
  ["적극 추천", "매우 긍정"],
  ["추천", "긍정"],
  ["비추천", "부정"],
  ["반드시 이용", "강한 재이용 의향"],
  ["이용할 것 같음", "재이용 가능성 있음"],
  ["안전하다고 느낌", "긍정 체감"],
  ["매우 신뢰", "매우 신뢰한다고 응답"],
  ["신뢰", "신뢰한다고 응답"],
  ["안정적", "안정적으로 느꼈다고 응답"],
]);

function normalizeSeoValue(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function hasSensitivePattern(value: string) {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value) ||
    /@[a-z0-9_]{4,32}/i.test(value) ||
    /\b(?:0x)?[a-f0-9]{32,}\b/i.test(value) ||
    /\+?\d[\d\s-]{7,}\d/.test(value) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value)
  );
}

export function isSeoSelectionValue(value: string | null | undefined) {
  const normalized = normalizeSeoValue(value);

  if (!normalized) return false;
  if (excludedExactValues.has(normalized)) return false;
  if (normalized.startsWith("기타")) return false;
  if (excludedValueFragments.some((fragment) => normalized.includes(fragment))) {
    return false;
  }
  if (unsafeSeoFragments.some((fragment) => normalized.includes(fragment))) {
    return false;
  }
  if (hasSensitivePattern(normalized)) return false;

  return true;
}

export function getSeoSelectionValues(
  values: Array<string | null | undefined>,
  limit = 2,
) {
  const seen = new Set<string>();
  const selected: string[] = [];

  for (const value of values) {
    const normalized = normalizeSeoValue(value);

    if (!isSeoSelectionValue(normalized) || seen.has(normalized)) continue;

    seen.add(normalized);
    selected.push(normalized);

    if (selected.length >= limit) break;
  }

  return selected;
}

function answerValues(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function publicReviewAnswerText(value: string | string[] | undefined) {
  if (!value) return "";

  return answerValues(value)
    .map((item) => {
      const trimmed = item.trim();

      return publicReviewAnswerReplacements.get(trimmed) ?? trimmed;
    })
    .filter(Boolean)
    .join(", ");
}

export function parseReviewSurveyPayload(
  experience: string | null | undefined,
): ReviewSurveyPayload | null {
  if (!experience) return null;

  try {
    const parsed = JSON.parse(experience) as ReviewSurveyPayload;
    if (parsed?.type !== "site_satisfaction_survey" || !parsed.answers) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getScamReportDamageLabels(
  report: ScamReportSeoInput,
  limit = 2,
) {
  return getSeoSelectionValues(report.damageTypes ?? [], limit);
}

export function getScamReportCategoryLabel(report: ScamReportSeoInput) {
  return getSeoSelectionValues([report.mainCategory], 1)[0] ?? "";
}

export function getScamReportActivityLabel(
  report: ScamReportSeoInput,
  preferDetail = false,
) {
  const detail = getSeoSelectionValues(report.categoryItems ?? [], 1)[0] ?? "";
  const category = getScamReportCategoryLabel(report);

  return preferDetail ? detail || category : category || detail;
}

export function buildScamReportCardTitle(report: ScamReportSeoInput) {
  const damageText = getScamReportDamageLabels(report, 2).join("·");
  const category = getScamReportCategoryLabel(report);
  const title = [damageText, category].filter(Boolean).join(" · ");

  return sanitizePublicGeneratedText(title ? `${title} 제보` : "승인 제보");
}

export function buildScamReportSelectionSummary(
  report: ScamReportSeoInput,
  siteName?: string,
) {
  const targetSite = sanitizePublicSiteName(siteName);
  const activity = getScamReportActivityLabel(report, true);
  const damageText = getScamReportDamageLabels(report, 2).join("·");
  const activityClause = activity ? `${activity} 관련 ` : "";
  const damageClause = damageText ? `${damageText} 피해` : "피해 관련 내용";

  return sanitizePublicGeneratedText(
    `승인된 공개 제보 기준으로, 작성자는 ${targetSite} 이용 중 ${activityClause}${damageClause}를 주장했습니다.`,
  );
}

export function buildScamReportsMetaDescription(
  siteName: string,
  scamReports: ScamReportSeoInput[] = [],
) {
  const displayName = sanitizePublicSiteName(siteName).replace(/\s+\(/g, "(");
  const reportCount = scamReports.length;

  if (reportCount <= 0) {
    return sanitizePublicGeneratedText(
      `${displayName}의 먹튀 제보 0건 현황을 정리했습니다. 공개 제보 없음은 사이트 상태의 사실 확정을 의미하지 않습니다.`,
    );
  }

  const damageText = getSeoSelectionValues(
    scamReports.flatMap((report) => report.damageTypes ?? []),
    1,
  )[0];
  const categoryItemText = getPrimaryScamReportCategoryItem(scamReports);
  const focusText = [categoryItemText, damageText].filter(Boolean).join(" ");
  const caseText = focusText ? `${focusText} 사례` : "제보 내용";

  return sanitizePublicGeneratedText(
    `${displayName}의 먹튀 제보 ${reportCount}건과 ${caseText}를 정리했습니다. 제보는 참고 자료이며 사실 확정이 아닙니다.`,
  );
}

function getPrimaryScamReportCategoryItem(scamReports: ScamReportSeoInput[]) {
  const categoryItems = getSeoSelectionValues(
    scamReports.flatMap((report) => report.categoryItems ?? []),
    2,
  );

  return categoryItems.length === 1 ? categoryItems[0] : "";
}

export function getReviewPrimaryCategory(
  answers: Record<string, string | string[]>,
) {
  return (
    getSeoSelectionValues(answerValues(answers.betting_category), 1)[0] ??
    getSeoSelectionValues(
      reviewDetailCategoryIds.flatMap((id) => answerValues(answers[id])),
      1,
    )[0] ??
    ""
  );
}

function getReviewActivityLabels(answers: Record<string, string | string[]>) {
  const category =
    getSeoSelectionValues(answerValues(answers.betting_category), 1)[0] ?? "";
  const detail =
    getSeoSelectionValues(
      reviewDetailCategoryIds.flatMap((id) => answerValues(answers[id])),
      1,
    )[0] ?? "";

  return {
    category: category || detail,
    detail: category && detail && category !== detail ? detail : "",
  };
}

export function getReviewEvaluationTopics(
  answers: Record<string, string | string[]>,
  limit = 2,
) {
  return reviewEvaluationTopicRules
    .filter((rule) =>
      rule.ids.some((id) =>
        getSeoSelectionValues(answerValues(answers[id]), 1).length > 0,
      ),
    )
    .map((rule) => rule.label)
    .slice(0, limit);
}

export function buildReviewCardTitle(
  experience: string | null | undefined,
  fallbackTitle = "이용자 만족도 평가",
) {
  const payload = parseReviewSurveyPayload(experience);

  if (payload?.answers) {
    const category = getReviewPrimaryCategory(payload.answers);
    const satisfaction =
      getSeoSelectionValues(
        [publicReviewAnswerText(payload.answers.overall_satisfaction)],
        1,
      )[0] ?? "";

    if (category && satisfaction) {
      return sanitizePublicGeneratedText(
        `${category} 이용 ${satisfaction} 평가`,
      );
    }

    if (satisfaction) {
      return sanitizePublicGeneratedText(`이용 ${satisfaction} 평가`);
    }

    if (category) {
      return sanitizePublicGeneratedText(`${category} 이용자 평가`);
    }
  }

  return sanitizePublicGeneratedText(sanitizePublicUserText(fallbackTitle));
}

export function buildReviewSelectionSummary(
  siteName: string,
  payload: ReviewSurveyPayload,
) {
  const answers = payload.answers ?? {};
  const { category, detail } = getReviewActivityLabels(answers);
  const topics = getReviewEvaluationTopics(answers, 2);
  const activityClause =
    category && detail
      ? `${category}과 ${detail} 경험`
      : category
        ? `${category} 경험`
        : "서비스 이용 경험";
  const topicClause =
    topics.length > 0
      ? `${joinKoreanList(topics)}에 대한 평가`
      : "이용자 평가";

  return sanitizePublicGeneratedText(
    `승인된 후기 기준으로, 작성자는 ${sanitizePublicSiteName(siteName)} 이용 중 ${activityClause}, ${topicClause}를 남겼습니다.`,
  );
}

export function buildReviewsMetaDescription(
  siteName: string,
  reviews: ReviewSeoInput[] = [],
) {
  const displayName = sanitizePublicSiteName(siteName).replace(/\s+\(/g, "(");
  const reviewCount = reviews.length;
  const payloads = reviews.flatMap((review) => {
    const payload = parseReviewSurveyPayload(review.experience);

    return payload?.answers ? [payload] : [];
  });
  const category =
    payloads
      .map((payload) => getReviewPrimaryCategory(payload.answers ?? {}))
      .find(Boolean) ?? "";
  const topicValues = getSeoSelectionValues(
    payloads
      .flatMap((payload) => getReviewEvaluationTopics(payload.answers ?? {}, 2))
      .filter((topic) => topic !== "이용자 체감 평가")
      .map((topic) => reviewMetaTopicLabels.get(topic) ?? topic),
    2,
  );
  const focusText = [category, ...topicValues].filter(Boolean).join("·");

  if (focusText) {
    return sanitizePublicGeneratedText(
      `${displayName}의 후기 ${reviewCount}건과 ${focusText} 평가를 작성자 응답 기준으로 정리했습니다. 후기는 참고 자료이며 단정 근거가 아닙니다.`,
    );
  }

  return sanitizePublicGeneratedText(
    `${displayName}의 후기 ${reviewCount}건과 만족도 평가를 작성자 응답 기준으로 정리했습니다. 후기는 참고 자료이며 사이트 전체 상태를 단정하지 않습니다.`,
  );
}

function joinKoreanList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";

  return `${values.slice(0, -1).join(", ")}와 ${values.at(-1)}`;
}
