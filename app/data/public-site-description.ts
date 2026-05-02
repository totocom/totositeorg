import { siteDescriptionNoticeText } from "./site-description-notice";

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

export type ObservationDescriptionFormatResult = {
  description: string;
  warnings: string[];
};

const legacyObservationDisclosureText =
  "이 설명은 조회 시점 기준 관리자가 제공한 공개 HTML과 스크린샷을 바탕으로 작성되었습니다. 화면에 표시된 정보만 요약한 것이며, 가입이나 이용을 권유하는 내용은 아닙니다.";

export function normalizePublicSiteDescription(value: string) {
  return formatObservationDescriptionForPublic(value).description;
}

export function formatObservationDescriptionForPublic(
  value: string,
): ObservationDescriptionFormatResult {
  const normalizedDescription = normalizeObservationDescriptionText(value);
  const warnings = getObservationDescriptionFormatWarnings(normalizedDescription);
  const paragraphs = normalizedDescription
    .split(/\n{2,}/)
    .map(formatObservationDescriptionParagraph)
    .filter(Boolean);

  return {
    description: paragraphs.join("\n\n").trim(),
    warnings,
  };
}

function normalizeObservationDescriptionText(value: string) {
  return stripUnsafeHtml(value)
    .replace(/본\s*설명\s*초안은|설명\s*초안은|본\s*초안은|이\s*초안은/g, "이 설명은")
    .replace(/초안/g, "설명")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function formatObservationDescriptionParagraph(value: string) {
  const sentences = splitDescriptionSentences(value)
    .filter((sentence) => !isNoticeSentence(sentence))
    .filter((sentence) => !isInternalExtractionSentence(sentence));

  return sentences.join(" ").replace(/\s+/g, " ").trim();
}

function splitDescriptionSentences(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  return normalized
    .replace(/([.!?。！？])\s+/g, "$1\n")
    .split(/\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isNoticeSentence(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return (
    normalized === siteDescriptionNoticeText ||
    normalized === legacyObservationDisclosureText ||
    (/^본\s*설명은/.test(normalized) &&
      /공개\s*HTML|HTML\s*자료|스크린샷/.test(normalized)) ||
    (/^이\s*설명은/.test(normalized) &&
      /공개\s*HTML|HTML\s*자료|스크린샷/.test(normalized)) ||
    /가입이나\s*이용을\s*권유하는\s*내용은\s*아닙니다/.test(normalized) ||
    /가입\s*또는\s*이용을\s*권장하거나\s*유도하는\s*내용이\s*아닙니다/.test(normalized) ||
    (/^이\s*설명은\s*조회\s*시점\s*기준/.test(normalized) &&
      /공개\s*HTML|스크린샷|관측/.test(normalized))
  );
}

function isInternalExtractionSentence(value: string) {
  return /문서\s*제목은|페이지\s*제목은|메타\s*설명(?:에는|은)|대표\s*제목\s*영역(?:에는|은)|\bpage_title\b|\bmeta_description\b|\bh1\b|h1\s*(?:에는|은)/i.test(
    value,
  );
}

function getObservationDescriptionFormatWarnings(value: string) {
  const warnings: string[] = [];
  const plainText = value.replace(/\s+/g, " ").trim();

  if (countOccurrences(plainText, "관측되었습니다") >= 3) {
    warnings.push("'관측되었습니다' 표현이 3회 이상 반복됩니다.");
  }

  if (countOccurrences(plainText, "공개 화면") >= 3) {
    warnings.push("'공개 화면' 표현이 3회 이상 반복됩니다.");
  }

  if (countOccurrences(plainText, "조회 시점 기준") >= 2) {
    warnings.push("'조회 시점 기준' 표현이 2회 이상 반복됩니다.");
  }

  if (countOccurrences(plainText, "공개 HTML") >= 2) {
    warnings.push("'공개 HTML' 표현이 2회 이상 반복됩니다.");
  }

  if (isInternalExtractionSentence(plainText)) {
    warnings.push("page_title, meta_description, h1 같은 내부 추출 설명이 포함되어 있습니다.");
  }

  if (/https?:\/\/\S+|www\.[^\s)]+/i.test(plainText)) {
    warnings.push("URL은 사이트 설명 본문보다 주소·도메인 섹션에서 표시하는 것이 좋습니다.");
  }

  if (/^\s{0,3}(?:#{1,6}|[-*+]|\d+\.)\s/m.test(value)) {
    warnings.push("사이트 설명에 제목 또는 bullet/list 형식이 포함되어 있습니다.");
  }

  if (plainText.length > 700) {
    warnings.push("사이트 설명이 700자를 초과합니다.");
  }

  if (hasLongMenuLikeEnumeration(plainText)) {
    warnings.push("메뉴명이나 세부 항목이 과도하게 나열된 문장이 있습니다.");
  }

  return Array.from(new Set(warnings));
}

function hasLongMenuLikeEnumeration(value: string) {
  return value
    .split(/[.!?。！？]\s*/)
    .some((sentence) => {
      const items = sentence
        .split(/\s*(?:,|，|、|·|ㆍ|\/|\|)\s*/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 1 && item.length <= 18);

      return items.length >= 8;
    });
}

function countOccurrences(value: string, phrase: string) {
  return value.split(phrase).length - 1;
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
    maxBlocks: 3,
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
  return (
    /^(관측된 화면 구성|화면 구조|검수 메모|사이트 개요)$/i.test(value) ||
    /(?:주요\s*메뉴|계정\s*관련\s*요소|게임\/경기\s*관련\s*요소|푸터\/저작권|이미지\s*(?:alt|대체\s*텍스트)|관측\s*배지|배지성\s*표시)\s*[:：]/i.test(
      value,
    )
  );
}
