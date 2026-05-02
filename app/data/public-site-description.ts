export type SafeMarkdownInline =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "strong";
      text: string;
    }
  | {
      type: "emphasis";
      text: string;
    }
  | {
      type: "code";
      text: string;
    }
  | {
      type: "link";
      text: string;
      href: string;
    };

export type SafeMarkdownBlock =
  | {
      type: "paragraph";
      inlines: SafeMarkdownInline[];
      text: string;
    }
  | {
      type: "heading";
      level: 2 | 3 | 4;
      inlines: SafeMarkdownInline[];
      text: string;
    }
  | {
      type: "list";
      items: Array<{
        inlines: SafeMarkdownInline[];
        text: string;
      }>;
    };

type SafeMarkdownOptions = {
  includeHeadings?: boolean;
  includeLists?: boolean;
  maxBlocks?: number;
};

export function normalizePublicSiteDescription(value: string) {
  return stripUnsafeHtml(value)
    .replace(/본\s*설명\s*초안은|설명\s*초안은|본\s*초안은|이\s*초안은/g, "이 설명은")
    .replace(/초안/g, "설명")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function getSafeMarkdownBlocks(
  value: string,
  {
    includeHeadings = true,
    includeLists = true,
    maxBlocks = Number.POSITIVE_INFINITY,
  }: SafeMarkdownOptions = {},
): SafeMarkdownBlock[] {
  const normalizedDescription = normalizePublicSiteDescription(value);
  const blocks: SafeMarkdownBlock[] = [];

  for (const rawBlock of normalizedDescription.split(/\n{2,}/)) {
    if (blocks.length >= maxBlocks) break;

    const block = rawBlock.trim();
    if (!block) continue;
    if (isReviewMemoBlock(block)) continue;

    const heading = block.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      if (!includeHeadings) continue;

      const text = getPlainTextFromInlines(parseSafeMarkdownInlines(heading[2]));
      if (!text || isLowValueOverviewText(text)) continue;

      blocks.push({
        type: "heading",
        level: Math.min(4, Math.max(2, heading[1].length)) as 2 | 3 | 4,
        text,
        inlines: parseSafeMarkdownInlines(heading[2]),
      });
      continue;
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const listItems = lines
      .map((line) => line.match(/^(?:[-*+]|\d+\.)\s+(.+)$/)?.[1] ?? "")
      .filter(Boolean);

    if (listItems.length === lines.length && listItems.length > 0) {
      if (!includeLists) continue;

      const items = listItems
        .map((item) => getPlainTextFromInlines(parseSafeMarkdownInlines(item)))
        .filter((item) => item && !isLowValueOverviewText(item))
        .map((item) => ({
          text: item,
          inlines: parseSafeMarkdownInlines(item),
        }));

      if (items.length > 0) {
        blocks.push({ type: "list", items });
      }
      continue;
    }

    const paragraphSource = lines.join(" ");
    const text = getPlainTextFromInlines(parseSafeMarkdownInlines(paragraphSource));
    if (!text || isLowValueOverviewText(text)) continue;

    blocks.push({
      type: "paragraph",
      text,
      inlines: parseSafeMarkdownInlines(paragraphSource),
    });
  }

  return blocks;
}

export function getSiteOverviewMarkdownBlocks(value: string) {
  return getSafeMarkdownBlocks(value, {
    includeHeadings: false,
    includeLists: false,
    maxBlocks: 5,
  });
}

export function normalizePublicSiteDomains(values: string[]) {
  const normalizedDomains = values.flatMap(splitPossiblyConcatenatedDomains);

  return Array.from(new Set(normalizedDomains));
}

export function parseSafeMarkdownInlines(value: string): SafeMarkdownInline[] {
  const inlines: SafeMarkdownInline[] = [];
  const pattern =
    /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      inlines.push({
        type: "text",
        text: value.slice(lastIndex, match.index),
      });
    }

    if (match[2]) {
      inlines.push({ type: "strong", text: normalizePlainText(match[2]) });
    } else if (match[3]) {
      inlines.push({ type: "emphasis", text: normalizePlainText(match[3]) });
    } else if (match[4]) {
      inlines.push({ type: "code", text: normalizePlainText(match[4]) });
    } else {
      const text = normalizePlainText(match[5] ?? "");
      const href = normalizeSafeMarkdownHref(match[6] ?? "");

      inlines.push(href ? { type: "link", text, href } : { type: "text", text });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    inlines.push({ type: "text", text: value.slice(lastIndex) });
  }

  return inlines.filter((inline) => inline.text.length > 0);
}

function stripUnsafeHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, "");
}

function normalizePlainText(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getPlainTextFromInlines(inlines: SafeMarkdownInline[]) {
  return normalizePlainText(inlines.map((inline) => inline.text).join(""));
}

function normalizeSafeMarkdownHref(value: string) {
  const href = value.trim();

  if (/^https?:\/\//i.test(href) || href.startsWith("/")) return href;

  return "";
}

function splitPossiblyConcatenatedDomains(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const urlMatches = Array.from(trimmed.matchAll(/https?:\/\/.*?(?=https?:\/\/|$)/gi))
    .map((match) => match[0].trim())
    .filter(Boolean);

  if (urlMatches.length > 0) return urlMatches;

  return trimmed
    .split(/[\s,]+/)
    .map((domain) => domain.trim())
    .filter(Boolean);
}

function isReviewMemoBlock(value: string) {
  return /검수\s*메모|원본\s*URL|HTML\s*해시|화면\s*텍스트\s*해시|외부\s*이미지\s*후보/.test(
    value,
  );
}

function isLowValueOverviewText(value: string) {
  return /^(관측된 화면 구성|화면 구조|검수 메모|사이트 개요)$/i.test(value);
}
