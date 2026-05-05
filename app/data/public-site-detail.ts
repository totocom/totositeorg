import { formatDisplayDomain } from "@/app/data/domain-display";
import { extractDomain } from "@/app/data/domain-whois";
import {
  getPublicSiteDetail,
  type PublicDomainCreationDate,
  type PublicSiteDetailResult,
  type PublicSiteDnsRecord,
} from "@/app/data/public-sites";
import type { PublicSiteObservationSnapshot } from "@/app/data/public-site-observation-snapshot";
import type { PublicSiteRelatedBlogReport } from "@/app/data/related-blog-report";
import type {
  ReviewTarget,
  ScamReport,
  SiteReview,
  SiteTrustScore,
} from "@/app/data/sites";

export type PublicSource = "supabase" | "fallback" | "none";

export type SiteDomainSummary = {
  domainUrl: string;
  domain: string;
  displayDomain: string;
  creationDate: string | null;
  domainAge: string;
};

export type SiteCommonHeaderResult = {
  site: ReviewTarget | null;
  tabCounts: {
    scamReports: number;
    reviews: number;
    domains: number;
  };
  trustScore: SiteTrustScore | null;
  source: PublicSource;
  errorMessage: string;
};

export type SiteMainDetailResult = {
  common: SiteCommonHeaderResult;
  observationSnapshot: PublicSiteObservationSnapshot | null;
  relatedBlogReport: PublicSiteRelatedBlogReport | null;
  scamReportSummary: ScamReport[];
  reviewSummary: SiteReview[];
  domainSummary: SiteDomainSummary[];
  domainCreationDates: PublicDomainCreationDate[];
};

export type SiteScamReportsDetailResult = {
  common: SiteCommonHeaderResult;
  scamReports: ScamReport[];
};

export type SiteReviewsDetailResult = {
  common: SiteCommonHeaderResult;
  reviews: SiteReview[];
};

export type SiteDomainsDetailResult = {
  common: SiteCommonHeaderResult;
  domains: SiteDomainSummary[];
  dnsRecords: PublicSiteDnsRecord[];
};

export async function getSiteCommonHeader(
  slug: string,
): Promise<SiteCommonHeaderResult> {
  const detail = await getPublicSiteDetail(slug);

  return buildCommonHeader(detail);
}

export async function getSiteMainDetail(
  slug: string,
): Promise<SiteMainDetailResult> {
  const detail = await getPublicSiteDetail(slug);

  return {
    common: buildCommonHeader(detail),
    observationSnapshot: detail.observationSnapshot,
    relatedBlogReport: detail.relatedBlogReport,
    scamReportSummary: detail.scamReports.slice(0, 3),
    reviewSummary: detail.reviews.slice(0, 3),
    domainSummary: buildDomainSummary(detail.site, detail.domainCreationDates),
    domainCreationDates: detail.domainCreationDates,
  };
}

export async function getSiteScamReportsDetail(
  slug: string,
): Promise<SiteScamReportsDetailResult> {
  const detail = await getPublicSiteDetail(slug);

  return {
    common: buildCommonHeader(detail),
    scamReports: detail.scamReports,
  };
}

export async function getSiteReviewsDetail(
  slug: string,
): Promise<SiteReviewsDetailResult> {
  const detail = await getPublicSiteDetail(slug);

  return {
    common: buildCommonHeader(detail),
    reviews: detail.reviews,
  };
}

export async function getSiteDomainsDetail(
  slug: string,
): Promise<SiteDomainsDetailResult> {
  const detail = await getPublicSiteDetail(slug);

  return {
    common: buildCommonHeader(detail),
    domains: buildDomainSummary(detail.site, detail.domainCreationDates),
    dnsRecords: detail.dnsRecords,
  };
}

export function getDomainAge(value: string | null | undefined) {
  if (!value) return "확인 불가";

  const createdAt = new Date(value);
  const now = new Date();
  const monthDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    now.getMonth() -
    createdAt.getMonth();

  if (!Number.isFinite(monthDiff) || monthDiff < 0) return "확인 불가";

  const years = Math.floor(monthDiff / 12);
  const months = monthDiff % 12;

  if (years <= 0) return `${months}개월`;
  if (months === 0) return `${years}년`;
  return `${years}년 ${months}개월`;
}

function buildCommonHeader(
  detail: PublicSiteDetailResult,
): SiteCommonHeaderResult {
  const domains = buildDomainSummary(detail.site, detail.domainCreationDates);

  return {
    site: detail.site,
    tabCounts: {
      scamReports: detail.scamReports.length,
      reviews: detail.reviews.length,
      domains: domains.length,
    },
    trustScore: detail.site?.trustScore ?? null,
    source: detail.source,
    errorMessage: detail.errorMessage,
  };
}

function buildDomainSummary(
  site: ReviewTarget | null,
  domainCreationDates: PublicDomainCreationDate[],
): SiteDomainSummary[] {
  if (!site) return [];

  const creationDateByDomain = new Map(
    domainCreationDates.map(({ domain, creationDate }) => [
      domain.toLowerCase(),
      creationDate,
    ]),
  );
  const seenDomains = new Set<string>();

  return [site.siteUrl, ...site.domains].flatMap((domainUrl) => {
    const domain = extractDomain(domainUrl)?.toLowerCase();

    if (!domain || seenDomains.has(domain)) return [];
    seenDomains.add(domain);

    const creationDate = creationDateByDomain.get(domain) ?? null;

    return [
      {
        domainUrl,
        domain,
        displayDomain: formatDisplayDomain(domainUrl),
        creationDate,
        domainAge: getDomainAge(creationDate),
      },
    ];
  });
}
