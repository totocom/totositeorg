const defaultPilotSlug = "youtoobet-morjcswx-p7k7";

export function getSitePageSplitEnabledSlugs() {
  return (process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS ?? defaultPilotSlug)
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function isSitePageSplitEnabled(slug: string) {
  const normalizedSlug = slug.trim();
  const enabledSlugs = getSitePageSplitEnabledSlugs();

  return enabledSlugs.includes("*") || enabledSlugs.includes(normalizedSlug);
}
