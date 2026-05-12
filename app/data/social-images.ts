import { siteUrl } from "../../lib/config";

export const reportOgImageSize = {
  width: 1200,
  height: 630,
} as const;

export const reportOgImages = {
  default: {
    path: "/og/totosite-report-default.webp",
    alt: "후기, 먹튀 제보, 주소·도메인 기록을 정리한 토토사이트 정보 리포트 이미지",
  },
  reviews: {
    path: "/og/totosite-report-reviews.webp",
    alt: "토토사이트 후기와 이용자 만족도 평가를 정리한 데이터 리포트 이미지",
  },
  scamReports: {
    path: "/og/totosite-report-scam.webp",
    alt: "먹튀 제보와 피해 유형을 정리한 정보 리포트 이미지",
  },
  domains: {
    path: "/og/totosite-report-domains.webp",
    alt: "토토사이트 주소와 도메인 변경 이력을 정리한 정보 리포트 이미지",
  },
  siteDetail: {
    path: "/og/totosite-report-site.webp",
    alt: "사이트별 후기, 먹튀 제보, 도메인 정보를 비교하는 검증 리포트 이미지",
  },
} as const;

export type ReportOgImageKey = keyof typeof reportOgImages;

export function getAbsoluteReportOgImageUrl(key: ReportOgImageKey) {
  return new URL(reportOgImages[key].path, siteUrl).toString();
}

export function getReportOpenGraphImage(key: ReportOgImageKey) {
  const image = reportOgImages[key];

  return {
    url: getAbsoluteReportOgImageUrl(key),
    width: reportOgImageSize.width,
    height: reportOgImageSize.height,
    alt: image.alt,
    type: "image/webp",
  };
}

export function getReportTwitterImage(key: ReportOgImageKey) {
  const image = reportOgImages[key];

  return {
    url: getAbsoluteReportOgImageUrl(key),
    alt: image.alt,
  };
}
