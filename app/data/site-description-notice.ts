export const siteDescriptionNoticeText =
  "이 설명은 관리자가 제공한 공개 HTML과 스크린샷을 기준으로 작성된 요약입니다. 가입이나 이용을 권유하는 내용은 아닙니다.";

export function buildSiteDescriptionNoticeText(siteName: string) {
  const normalizedSiteName = normalizeNoticeSiteName(siteName);

  return `본 설명은 ${normalizedSiteName} 토토사이트가 공개한 HTML 자료와 스크린샷을 기준으로 작성된 요약본이며, 해당 사이트의 가입 또는 이용을 권장하거나 유도하는 내용이 아닙니다.`;
}

function normalizeNoticeSiteName(siteName: string) {
  const normalized = siteName.replace(/\s+/g, " ").trim();
  const withoutCategorySuffix = normalized
    .replace(/(?:\s*토토사이트\s*정보)+$/g, "")
    .replace(/(?:\s*토토사이트)+$/g, "")
    .trim();

  return withoutCategorySuffix || normalized || "해당 사이트";
}
