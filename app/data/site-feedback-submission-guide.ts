export type SiteFeedbackSubmissionGuideAction = {
  href: string;
  label: string;
  kind: "review" | "scam-report";
};

export type SiteFeedbackSubmissionGuideModel = {
  title: string;
  paragraphs: string[];
  reviewHref: string;
  scamReportHref: string;
  actions: [SiteFeedbackSubmissionGuideAction, SiteFeedbackSubmissionGuideAction];
};

export const siteFeedbackSubmissionGuideForbiddenPhrases = [
  "바로가기",
  "접속하기",
  "최신 주소",
  "이용해보기",
  "추천하기",
  "안전한",
  "먹튀 없는",
] as const;

export function buildSiteFeedbackSubmissionGuide({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}): SiteFeedbackSubmissionGuideModel {
  const normalizedSiteName = normalizeSiteName(siteName);
  const encodedSiteId = encodeURIComponent(siteId.trim());
  const reviewHref = `/submit-review?siteId=${encodedSiteId}`;
  const scamReportHref = `/submit-scam-report?siteId=${encodedSiteId}`;

  return {
    title: "후기 및 제보 등록",
    paragraphs: [
      `${normalizedSiteName} 관련 승인 후기와 피해 제보는 관리자 검토 후 공개 정보에 반영됩니다.`,
      "허위 제보, 광고성 후기, 개인정보가 포함된 내용은 승인되지 않을 수 있습니다.",
    ],
    reviewHref,
    scamReportHref,
    actions: [
      {
        href: reviewHref,
        label: `${normalizedSiteName} 후기 남기기`,
        kind: "review",
      },
      {
        href: scamReportHref,
        label: `${normalizedSiteName} 먹튀 피해 제보하기`,
        kind: "scam-report",
      },
    ],
  };
}

function normalizeSiteName(siteName: string) {
  return siteName.replace(/\s+/g, " ").trim() || "해당 사이트";
}
