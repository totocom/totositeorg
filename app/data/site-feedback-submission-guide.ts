export type SiteFeedbackSubmissionGuideAction = {
  href: string;
  label: string;
  kind: "review" | "scam-report";
};

export type SiteFeedbackSubmissionGuideModel = {
  title: string;
  paragraphs: [string, string];
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
    title: `${normalizedSiteName} 후기 및 먹튀 제보 등록 안내`,
    paragraphs: [
      `${normalizedSiteName} 토토사이트에 대한 실제 이용 경험이 있는 분은 리뷰를 남기거나 먹튀 피해 제보를 등록할 수 있습니다. 등록된 후기와 피해 제보는 관리자 검토를 거쳐 공개될 수 있으며, 다른 이용자가 사이트의 주소, 도메인, ${normalizedSiteName} 후기, ${normalizedSiteName} 먹튀 제보 현황을 함께 확인하는 데 참고 자료로 활용됩니다.`,
      "허위 제보, 광고성 후기, 개인정보가 포함된 내용은 승인되지 않을 수 있습니다. 피해 제보를 등록할 때는 가능한 한 날짜, 상황, 금액, 대화 내용 등 확인 가능한 정보를 구체적으로 작성해 주세요.",
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
