export const automaticCrawlManualHtmlFallbackText =
  "수동 HTML 입력으로 관측 정보를 생성할 수 있습니다.";

export const automaticCrawlSupportGuideText =
  "자동 조회가 Cloudflare challenge 또는 접근 제한으로 실패할 수 있습니다. 이 경우 관리자가 브라우저에서 확인한 공개 HTML 또는 렌더링 HTML과 스크린샷을 제공해 관측 정보를 생성할 수 있습니다.";

export type AutomaticAccessChallengeInput = {
  statusCode?: number | null;
  headers?: Headers | Record<string, unknown> | null;
  title?: string | null;
  description?: string | null;
  bodyText?: string | null;
  explicitChallengeDetected?: boolean | null;
};

export type AutomaticCrawlFailureBody = {
  ok: false;
  error: string;
  challenge_detected: boolean;
  fallback_available: "manual_html";
  guidance: string;
};

export function detectAutomaticAccessChallenge({
  statusCode,
  headers,
  title,
  description,
  bodyText,
  explicitChallengeDetected,
}: AutomaticAccessChallengeInput) {
  if (explicitChallengeDetected) return true;

  const status = Number(statusCode ?? 0);
  const cfMitigated = getHeaderValue(headers, "cf-mitigated").toLowerCase();
  const server = getHeaderValue(headers, "server").toLowerCase();
  const cfRay = getHeaderValue(headers, "cf-ray");
  const combinedText = [title, description, bodyText]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    status === 403 ||
    cfMitigated === "challenge" ||
    Boolean(cfRay) ||
    server.includes("cloudflare") ||
    combinedText.includes("attention required") ||
    combinedText.includes("cf-chl") ||
    combinedText.includes("cloudflare challenge")
  );
}

export function buildAutomaticCrawlFailureBody(
  error: string,
  challengeDetected: boolean,
): AutomaticCrawlFailureBody {
  const trimmedError = error.trim() || "자동 조회에 실패했습니다.";
  const guide = `${automaticCrawlManualHtmlFallbackText} ${automaticCrawlSupportGuideText}`;

  return {
    ok: false,
    error: `${trimmedError} ${guide}`,
    challenge_detected: challengeDetected,
    fallback_available: "manual_html",
    guidance: automaticCrawlSupportGuideText,
  };
}

function getHeaderValue(
  headers: Headers | Record<string, unknown> | null | undefined,
  name: string,
) {
  if (!headers) return "";

  if (headers instanceof Headers) {
    return headers.get(name) ?? "";
  }

  const lowerName = name.toLowerCase();
  const matchingKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === lowerName,
  );
  const value = matchingKey ? headers[matchingKey] : "";

  return typeof value === "string" ? value : "";
}
