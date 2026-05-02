export type SiteDetailInternalAnchorKey =
  | "detail"
  | "domainHistory"
  | "dns"
  | "reports"
  | "reviews"
  | "blogReport";

export type SiteDetailInternalLink = {
  key: SiteDetailInternalAnchorKey;
  href: string;
  label: string;
};

export const siteDetailForbiddenAnchorPhrases = [
  "바로가기",
  "접속하기",
  "최신 주소",
  "추천",
  "먹튀 없음",
  "안전한",
];

export function getSiteDetailAllowedAnchorText(
  siteName: string,
  key: SiteDetailInternalAnchorKey,
) {
  const normalizedSiteName = normalizeSiteName(siteName);

  switch (key) {
    case "domainHistory":
      return `${normalizedSiteName} 주소·도메인 기록`;
    case "dns":
      return `${normalizedSiteName} DNS 조회 결과`;
    case "reports":
      return `${normalizedSiteName} 먹튀 제보 현황`;
    case "reviews":
      return `${normalizedSiteName} 후기 데이터`;
    case "blogReport":
      return `${normalizedSiteName} 토토사이트 정보 리포트`;
    case "detail":
    default:
      return `${normalizedSiteName} 상세 정보`;
  }
}

export function buildSiteDetailInternalLinks({
  siteName,
  includeDomainLinks = true,
}: {
  siteName: string;
  includeDomainLinks?: boolean;
}): SiteDetailInternalLink[] {
  const links: SiteDetailInternalLink[] = [
    {
      key: "detail",
      href: "#site-overview",
      label: getSiteDetailAllowedAnchorText(siteName, "detail"),
    },
  ];

  if (includeDomainLinks) {
    links.push(
      {
        key: "domainHistory",
        href: "#domain-history",
        label: getSiteDetailAllowedAnchorText(siteName, "domainHistory"),
      },
      {
        key: "dns",
        href: "#dns",
        label: getSiteDetailAllowedAnchorText(siteName, "dns"),
      },
    );
  }

  links.push(
    {
      key: "reports",
      href: "#reports",
      label: getSiteDetailAllowedAnchorText(siteName, "reports"),
    },
    {
      key: "reviews",
      href: "#reviews",
      label: getSiteDetailAllowedAnchorText(siteName, "reviews"),
    },
  );

  return links;
}

export function findDuplicateSiteDetailAnchorTexts(
  links: SiteDetailInternalLink[],
) {
  const counts = new Map<string, number>();

  for (const link of links) {
    counts.set(link.label, (counts.get(link.label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([anchor, count]) => ({ anchor, count }));
}

export function hasForbiddenSiteDetailAnchorText(anchor: string) {
  return siteDetailForbiddenAnchorPhrases.some((phrase) =>
    anchor.includes(phrase),
  );
}

function normalizeSiteName(siteName: string) {
  return siteName.replace(/\s+/g, " ").trim() || "해당 사이트";
}
