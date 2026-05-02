export const requiredBlogReportSectionLabels = [
  "토토사이트 정보 요약",
  "원본 사이트 관측 정보",
  "주소와 도메인 현황",
  "도메인 DNS·WHOIS 조회 결과",
  "화면 구성에서 관측된 주요 요소",
  "계정·게임·결제 관련 관측 정보",
  "먹튀 제보 현황",
  "후기 데이터 현황",
  "확인되지 않은 항목과 해석상 한계",
  "이용 전 확인할 체크리스트",
  "토토사이트 FAQ",
] as const;

export type RequiredBlogReportSectionLabel =
  (typeof requiredBlogReportSectionLabels)[number];

export type RequiredBlogReportSectionCoverage = {
  expectedHeadings: string[];
  presentHeadings: string[];
  missingHeadings: string[];
  hasObservationSection: boolean;
  hasDnsWhoisSection: boolean;
  hasScamReportSection: boolean;
  hasReviewSection: boolean;
};

export function getRequiredBlogReportHeadings(siteName: string) {
  const normalizedSiteName = normalizeText(siteName) || "{사이트명}";

  return requiredBlogReportSectionLabels.map((label) =>
    label === "확인되지 않은 항목과 해석상 한계"
      ? label
      : `${normalizedSiteName} ${label}`,
  );
}

export function formatRequiredBlogReportHeadings(siteName: string) {
  return getRequiredBlogReportHeadings(siteName)
    .map((heading) => `## ${heading}`)
    .join("\n");
}

export function extractMarkdownH2Headings(bodyMd: string) {
  return Array.from(bodyMd.matchAll(/^##\s+(.+)$/gm))
    .map((match) => normalizeText(match[1] ?? ""))
    .filter(Boolean);
}

export function validateRequiredBlogReportSectionCoverage({
  siteName,
  bodyMd,
}: {
  siteName: string;
  bodyMd: string;
}): RequiredBlogReportSectionCoverage {
  const expectedHeadings = getRequiredBlogReportHeadings(siteName);
  const actualHeadings = extractMarkdownH2Headings(bodyMd);
  const actualSet = new Set(actualHeadings.map(normalizeComparableHeading));
  const presentHeadings = expectedHeadings.filter((heading) =>
    actualSet.has(normalizeComparableHeading(heading)),
  );
  const missingHeadings = expectedHeadings.filter(
    (heading) => !actualSet.has(normalizeComparableHeading(heading)),
  );

  return {
    expectedHeadings,
    presentHeadings,
    missingHeadings,
    hasObservationSection: presentHeadings.some((heading) =>
      heading.includes("원본 사이트 관측 정보"),
    ),
    hasDnsWhoisSection: presentHeadings.some((heading) =>
      heading.includes("DNS·WHOIS"),
    ),
    hasScamReportSection: presentHeadings.some((heading) =>
      heading.includes("먹튀 제보 현황"),
    ),
    hasReviewSection: presentHeadings.some((heading) =>
      heading.includes("후기 데이터 현황"),
    ),
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeComparableHeading(value: string) {
  return normalizeText(value).toLowerCase();
}
