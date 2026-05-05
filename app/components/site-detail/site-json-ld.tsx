import type { ReviewTarget } from "@/app/data/sites";

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
}: {
  site: ReviewTarget;
  canonical: string;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: canonical,
    description,
    about: {
      "@type": "WebSite",
      name: site.siteName,
      url: site.siteUrl,
    },
  };
}

export function buildAggregateRatingJsonLd(site: ReviewTarget) {
  if (site.reviewCount <= 0 || site.averageRating <= 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: {
      "@type": "WebSite",
      name: site.siteName,
      url: site.siteUrl,
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
