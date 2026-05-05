export const siteDescriptionNoticeText =
  "해당 사이트에 직접 접속해서 확인한 스크린샷과 HTML 내용을 정리해 올립니다. 가입하거나 이용하라고 쓴 글은 아니고, 화면이 어떻게 생겼는지 보여드리려고 정리한 겁니다.";

export function buildSiteDescriptionNoticeText(siteName: string) {
  const normalizedSiteName = siteName
    .replace(/\s+/g, " ")
    .replace(/\s+\(/g, "(")
    .replace(/\)\s+/g, ") ")
    .trim();
  const subject = normalizedSiteName
    ? normalizedSiteName.endsWith("사이트")
      ? normalizedSiteName
      : `${normalizedSiteName} 사이트`
    : "해당 사이트";

  return `${subject}에 직접 접속해서 확인한 스크린샷과 HTML 내용을 정리해 올립니다. 가입하거나 이용하라고 쓴 글은 아니고, 화면이 어떻게 생겼는지 보여드리려고 정리한 겁니다.`;
}
