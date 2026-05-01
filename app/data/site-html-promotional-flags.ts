export const siteObservationPromotionalTerms = [
  "프로모션 코드",
  "가입하기",
  "최신 주소",
  "우회 주소",
  "프로모션",
  "바로가기",
  "보너스",
  "이벤트",
  "추천",
  "쿠폰",
  "첫충",
  "매충",
  "가입",
  "입금",
  "충전",
  "환전",
] as const;

export type SiteObservationPromotionalTerm =
  (typeof siteObservationPromotionalTerms)[number];

export type SiteObservationPromotionalFlag = {
  term: SiteObservationPromotionalTerm;
  count: number;
  contexts: string[];
};

export type SiteObservationPromotionalFlagsJson = {
  has_promotional_terms: boolean;
  found_terms: SiteObservationPromotionalFlag[];
};

export function classifySiteObservationPromotionalFlags(
  values: string | Array<string | null | undefined>,
): SiteObservationPromotionalFlagsJson {
  const contexts = (Array.isArray(values) ? values : [values])
    .map((value) => normalizeObservationText(value ?? ""))
    .filter(Boolean);

  const foundTerms = siteObservationPromotionalTerms
    .map((term) => {
      const matchedContexts = contexts
        .filter((context) => context.includes(term))
        .slice(0, 5)
        .map((context) => clipContext(context));
      const count = contexts.reduce(
        (sum, context) => sum + countTermOccurrences(context, term),
        0,
      );

      return {
        term,
        count,
        contexts: matchedContexts,
      };
    })
    .filter((flag) => flag.count > 0);

  return {
    has_promotional_terms: foundTerms.length > 0,
    found_terms: foundTerms,
  };
}

export function getExcludedSiteObservationTerms(
  values: string | Array<string | null | undefined>,
) {
  return classifySiteObservationPromotionalFlags(values).found_terms.map(
    (flag) => flag.term,
  );
}

export function containsSiteObservationPromotionalTerm(value: string) {
  const normalizedValue = normalizeObservationText(value);

  return siteObservationPromotionalTerms.some((term) =>
    normalizedValue.includes(term),
  );
}

export function omitSiteObservationPromotionalText(values: string[]) {
  return values.filter((value) => !containsSiteObservationPromotionalTerm(value));
}

function countTermOccurrences(value: string, term: string) {
  if (!value || !term) return 0;

  return value.split(term).length - 1;
}

function clipContext(value: string) {
  const normalizedValue = normalizeObservationText(value);

  return normalizedValue.length > 120
    ? `${normalizedValue.slice(0, 117)}...`
    : normalizedValue;
}

function normalizeObservationText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
