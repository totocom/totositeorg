export function maskPublicAuthorName(
  value: string | null | undefined,
  fallback = "승인된 이용자",
) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized) return fallback;

  const characters = Array.from(normalized);

  if (characters.length <= 4) return fallback;
  if (characters.length <= 8) {
    return `${characters.slice(0, 2).join("")}****${characters
      .slice(-2)
      .join("")}`;
  }

  return `${characters.slice(0, 3).join("")}****${characters
    .slice(-4)
    .join("")}`;
}

const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function formatKoreanDate(
  value: string | null | undefined,
  fallback = "날짜 미확인",
) {
  if (!value) return fallback;

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;

  const parts = koreanDateFormatter
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  if (!parts.year || !parts.month || !parts.day) return fallback;

  return `${parts.year}년 ${Number(parts.month)}월 ${Number(parts.day)}일`;
}

export function formatKoreanDateCriterion(value: string | null | undefined) {
  const formatted = formatKoreanDate(value, "");

  return formatted ? `${formatted} 기준` : null;
}

const publicSiteNameUnsafeTerms = [
  "먹튀 사이트 확정",
  "먹튀사이트 확정",
  "위험 사이트 확정",
  "먹튀 확정",
  "위험 사이트",
  "안전한 사이트",
  "안전 사이트",
  "안전",
  "검증 완료",
  "100% 검증",
  "무조건 안전",
  "먹튀 없음",
  "추천 사이트",
  "추천",
  "가입 추천",
  "바로 가입",
  "최신 우회 주소",
  "우회 주소",
] as const;

export function sanitizePublicSiteName(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  const sanitized = publicSiteNameUnsafeTerms
    .reduce((result, term) => result.split(term).join(""), normalized)
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || "해당 사이트";
}

export function sanitizePublicUserText(value: string) {
  const normalized = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 비공개]")
    .replace(/@[a-z0-9_]{4,32}/gi, "[텔레그램 ID 비공개]")
    .replace(/\b(?:0x)?[a-f0-9]{32,}\b/gi, "[지갑 주소 비공개]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[연락처/계좌 비공개]")
    .replace(
      /(입금\s*은행|은행명|계좌|예금주|지갑|전화번호|연락처|텔레그램|카카오톡|카톡)\s*[:：]?\s*[^.\n]{0,80}/gi,
      "민감 정보 비공개",
    )
    .replace(/(시발|씨발|병신|개새끼|좆|ㅅㅂ|ㅂㅅ)/gi, "[표현 비공개]")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    return "공개 가능한 범위에서 제한적으로 표시합니다.";
  }

  return normalized;
}

const publicGeneratedClaimReplacements = [
  ["먹튀 사이트 확정", "먹튀 관련 제보 대상"],
  ["먹튀사이트 확정", "먹튀 관련 제보 대상"],
  ["먹튀 확정", "먹튀 관련 주장"],
  ["위험 사이트 확정", "피해 가능성 제보"],
  ["위험 사이트", "주의가 필요한 제보 대상"],
  ["안전한 사이트", "확인 필요 사이트"],
  ["안전 보장", "보장 불가"],
  ["검증 완료", "검토 대상"],
  ["100% 검증", "검토"],
  ["무조건 안전", "보장 불가"],
  ["먹튀 없음", "공개 제보 없음"],
  ["제보 없음 = 안전", "공개 제보 없음"],
  ["추천 사이트", "정보 확인 대상"],
  ["가입 추천", "가입 유도 제외"],
  ["바로 가입", "가입 유도 제외"],
  ["최신 우회 주소", "주소 정보"],
  ["우회 주소", "주소 정보"],
] as const;

export function sanitizePublicGeneratedText(value: string) {
  return publicGeneratedClaimReplacements
    .reduce(
      (result, [unsafeText, replacement]) =>
        result.split(unsafeText).join(replacement),
      value,
    )
    .replace(/\s+/g, " ")
    .trim();
}
