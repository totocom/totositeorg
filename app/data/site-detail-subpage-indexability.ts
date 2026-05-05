import type { ReviewTarget } from "./sites";

export type SiteDetailSubpageKind = "main" | "scam-reports" | "reviews" | "domains";

export type SiteDetailSubpageIndexabilityResult = {
  shouldIndex: boolean;
  robots: "index,follow" | "noindex,follow";
  reason: string;
};

export function calculateSiteDetailSubpageIndexability({
  site,
  kind,
  itemCount = 0,
}: {
  site: ReviewTarget | null;
  kind: SiteDetailSubpageKind;
  itemCount?: number;
}): SiteDetailSubpageIndexabilityResult {
  if (!site) {
    return buildResult(false, "site_missing");
  }

  if (kind === "reviews") {
    return buildResult(itemCount > 0, itemCount > 0 ? "reviews_present" : "reviews_empty");
  }

  if (kind === "scam-reports") {
    return buildResult(
      itemCount > 0,
      itemCount > 0 ? "scam_reports_present" : "scam_reports_empty",
    );
  }

  return buildResult(true, `${kind}_site_present`);
}

function buildResult(shouldIndex: boolean, reason: string) {
  return {
    shouldIndex,
    robots: shouldIndex ? "index,follow" : "noindex,follow",
    reason,
  } satisfies SiteDetailSubpageIndexabilityResult;
}
