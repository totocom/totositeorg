export type BlogPostRedirectMap = Record<string, string>;

// Add old-slug -> current-slug entries here when an indexed blog post is
// merged into a replacement post.
export const blogPostRedirects = {} satisfies BlogPostRedirectMap;

export function normalizeBlogSlug(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function getBlogPostRedirect(
  slug: string,
  redirects: BlogPostRedirectMap = blogPostRedirects,
) {
  const sourceSlug = normalizeBlogSlug(slug);
  const destinationSlug = normalizeBlogSlug(redirects[sourceSlug] ?? "");

  if (!sourceSlug || !destinationSlug || sourceSlug === destinationSlug) {
    return null;
  }

  return {
    sourceSlug,
    destinationSlug,
    destinationPath: `/blog/${destinationSlug}`,
  };
}

export function resolveBlogInternalLinkHref(
  href: string,
  activeBlogSlugs: ReadonlySet<string>,
  redirects: BlogPostRedirectMap = blogPostRedirects,
) {
  const blogSlug = getBlogDetailSlugFromHref(href);

  if (!blogSlug) return href;

  const redirectedPost = getBlogPostRedirect(blogSlug, redirects);

  if (redirectedPost && activeBlogSlugs.has(redirectedPost.destinationSlug)) {
    return redirectedPost.destinationPath;
  }

  if (activeBlogSlugs.has(blogSlug)) {
    return `/blog/${blogSlug}`;
  }

  return null;
}

function getBlogDetailSlugFromHref(href: string) {
  const path = href.trim().split(/[?#]/, 1)[0] ?? "";
  const match = path.match(/^\/blog\/([^/]+)\/?$/);

  return match ? normalizeBlogSlug(decodeURIComponentSafe(match[1])) : null;
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
