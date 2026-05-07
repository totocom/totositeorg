import type { ReviewTarget } from "@/app/data/sites";
import { sanitizePublicSiteName } from "@/app/data/public-display";

export type SiteFaqItem = {
  question: string;
  answer: string;
};

export function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
    />
  );
}

export function buildSiteWebPageJsonLd({
  site,
  canonical,
  title,
  description,
  pageType = "WebPage",
}: {
  site: ReviewTarget;
  canonical: string;
  title: string;
  description: string;
  pageType?: "WebPage" | "CollectionPage";
}) {
  return {
    "@context": "https://schema.org",
    "@type": pageType,
    name: title,
    url: canonical,
    description,
    about: {
      "@type": "Thing",
      name: sanitizePublicSiteName(site.siteName),
    },
  };
}

export function buildAggregateRatingJsonLd(site: ReviewTarget) {
  if (site.reviewCount < 2 || site.averageRating <= 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: {
      "@type": "WebSite",
      name: site.siteName,
    },
    ratingValue: site.averageRating.toFixed(1),
    reviewCount: site.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export function buildSiteBreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFaqPageJsonLd(items: SiteFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
