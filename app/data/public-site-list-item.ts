import { formatDisplayDomain } from "@/app/data/domain-display";
import type { ReviewTarget, SiteTrustScore } from "@/app/data/sites";

export type PublicSiteListItem = {
  id: string;
  slug: string;
  siteName: string;
  siteNameKo?: string | null;
  siteNameEn?: string | null;
  representativeDomain: string;
  domains: string[];
  faviconUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  scamReportCount?: number;
  scamDamageAmount?: number;
  scamDamageAmountUnknownCount?: number;
  resolvedIps?: string[];
  domainSearchText: string;
  createdAt?: string;
  oldestDomainCreationDate?: string;
  trustScore?: SiteTrustScore;
};

function getDisplayDomains(site: ReviewTarget) {
  return Array.from(
    new Set(site.domains.length > 0 ? site.domains : [site.siteUrl]),
  )
    .map(formatDisplayDomain)
    .filter(Boolean);
}

export function toPublicSiteListItem(site: ReviewTarget): PublicSiteListItem {
  const domains = getDisplayDomains(site);
  const representativeDomain =
    domains[0] ?? formatDisplayDomain(site.siteUrl) ?? "";
  const searchParts = [
    site.siteName,
    site.siteNameKo ?? "",
    site.siteNameEn ?? "",
    representativeDomain,
    ...domains,
    ...(site.resolvedIps ?? []),
  ];

  return {
    id: site.id,
    slug: site.slug,
    siteName: site.siteName,
    siteNameKo: site.siteNameKo ?? null,
    siteNameEn: site.siteNameEn ?? null,
    representativeDomain,
    domains,
    faviconUrl: site.faviconUrl,
    averageRating: site.averageRating,
    reviewCount: site.reviewCount,
    scamReportCount: site.scamReportCount,
    scamDamageAmount: site.scamDamageAmount,
    scamDamageAmountUnknownCount: site.scamDamageAmountUnknownCount,
    resolvedIps: site.resolvedIps ?? [],
    domainSearchText: searchParts.join(" ").toLowerCase(),
    createdAt: site.createdAt,
    oldestDomainCreationDate: site.oldestDomainCreationDate,
    trustScore: site.trustScore,
  };
}
