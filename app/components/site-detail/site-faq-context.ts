import { formatDisplayDomain } from "@/app/data/domain-display";
import {
  formatKoreanDateCriterion,
  sanitizePublicSiteName,
} from "@/app/data/public-display";
import { getDomainAge } from "@/app/data/public-site-detail";
import type { ReviewTarget } from "@/app/data/sites";

export type SiteFaqContext = {
  siteName: string;
  representativeDomain: string;
  domainCount: number;
  operatingPeriod: string;
  reviewCount: number;
  scamReportCount: number;
  latestObservationDate: string | null;
};

export function buildSiteFaqContext(site: ReviewTarget): SiteFaqContext {
  const visibleDomains = new Set(
    [site.siteUrl, ...site.domains]
      .map(formatDisplayDomain)
      .map((domain) => domain.trim())
      .filter(Boolean),
  );

  return {
    siteName: sanitizePublicSiteName(site.siteName),
    representativeDomain: formatDisplayDomain(site.siteUrl) || "확인 불가",
    domainCount: visibleDomains.size,
    operatingPeriod: getDomainAge(site.oldestDomainCreationDate),
    reviewCount: site.reviewCount,
    scamReportCount: site.scamReportCount ?? 0,
    latestObservationDate: formatKoreanDateCriterion(site.dnsCheckedAt),
  };
}
