export type SiteHtmlImageCandidates = {
  og_images: string[];
  twitter_images: string[];
  favicon_candidates: string[];
  logo_candidates: string[];
  image_alts: string[];
};

export function createEmptySiteHtmlImageCandidates(): SiteHtmlImageCandidates {
  return {
    og_images: [],
    twitter_images: [],
    favicon_candidates: [],
    logo_candidates: [],
    image_alts: [],
  };
}

export function extractSiteHtmlImageCandidates({
  html,
  baseUrl,
}: {
  html: string;
  baseUrl?: string | null;
}): SiteHtmlImageCandidates {
  const candidates = createEmptySiteHtmlImageCandidates();

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = extractHtmlAttributes(tag);
    const key = normalizeAttr(attrs.property || attrs.name || attrs.itemprop);
    const content = attrs.content;

    if (!content) continue;

    if (key === "og:image" || key === "og:image:secure_url") {
      candidates.og_images.push(resolveImageUrl(content, baseUrl));
    }

    if (key === "twitter:image" || key === "twitter:image:src") {
      candidates.twitter_images.push(resolveImageUrl(content, baseUrl));
    }
  }

  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = extractHtmlAttributes(tag);
    const rel = normalizeAttr(attrs.rel);
    const href = attrs.href;

    if (!href) continue;

    if (/\b(?:icon|shortcut icon|apple-touch-icon|mask-icon)\b/i.test(rel)) {
      candidates.favicon_candidates.push(resolveImageUrl(href, baseUrl));
    }
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attrs = extractHtmlAttributes(tag);
    const alt = normalizeText(attrs.alt || attrs["aria-label"] || attrs.title || "");
    const srcValues = [
      attrs.src,
      ...extractSrcsetUrls(attrs.srcset),
      ...extractSrcsetUrls(attrs["data-srcset"]),
      attrs["data-src"],
    ].filter(Boolean);

    if (alt) {
      candidates.image_alts.push(alt);
    }

    const logoHint = [
      alt,
      attrs.src,
      attrs.class,
      attrs.id,
      attrs.role,
      attrs.itemprop,
      attrs.title,
    ]
      .map((value) => value || "")
      .join(" ");

    if (/logo|logotype|brand|로고/i.test(logoHint)) {
      for (const srcValue of srcValues) {
        candidates.logo_candidates.push(resolveImageUrl(srcValue, baseUrl));
      }
    }
  }

  return {
    og_images: uniqueStrings(candidates.og_images),
    twitter_images: uniqueStrings(candidates.twitter_images),
    favicon_candidates: uniqueStrings(candidates.favicon_candidates),
    logo_candidates: uniqueStrings(candidates.logo_candidates),
    image_alts: uniqueStrings(candidates.image_alts),
  };
}

export function extractHtmlAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrSource = tag
    .replace(/^<\s*\/?\s*[a-z0-9:-]+/i, "")
    .replace(/\/?\s*>$/, "");
  const attrPattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(attrSource))) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match;
    attrs[rawName.toLowerCase()] = decodeHtmlEntities(
      doubleQuoted ?? singleQuoted ?? unquoted ?? "",
    );
  }

  return attrs;
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function resolveImageUrl(value: string, baseUrl?: string | null) {
  const normalizedValue = value.trim();

  if (!normalizedValue || /^data:/i.test(normalizedValue)) return "";

  if (/^\/\//.test(normalizedValue)) {
    return `https:${normalizedValue}`;
  }

  if (/^https?:\/\//i.test(normalizedValue)) {
    return normalizedValue;
  }

  if (baseUrl) {
    try {
      return new URL(normalizedValue, baseUrl).toString();
    } catch {
      return normalizedValue;
    }
  }

  return normalizedValue;
}

function extractSrcsetUrls(srcset?: string) {
  if (!srcset) return [];

  return srcset
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean);
}

function normalizeAttr(value?: string) {
  return normalizeText(value || "").toLowerCase();
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
