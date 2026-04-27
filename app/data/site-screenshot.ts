export function buildSiteScreenshotUrl(siteUrl: string) {
  const trimmedUrl = siteUrl.trim();

  if (!trimmedUrl) {
    return "";
  }

  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(trimmedUrl)}?w=1200&h=800`;
}
