import { formatDisplayDomain } from "@/app/data/domain-display";
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
  return {
    siteName: site.siteName,
    representativeDomain: formatDisplayDomain(site.siteUrl),
    domainCount: Math.max(1, new Set([site.siteUrl, ...site.domains]).size),
    operatingPeriod: getDomainAge(site.oldestDomainCreationDate),
    reviewCount: site.reviewCount,
    scamReportCount: site.scamReportCount ?? 0,
    latestObservationDate: site.dnsCheckedAt ?? null,
  };
}
