import { createHash } from "node:crypto";
import {
  decodeHtmlEntities,
  extractHtmlAttributes,
  extractSiteHtmlImageCandidates,
  type SiteHtmlImageCandidates,
} from "./site-html-image-candidates";
import {
  classifySiteObservationPromotionalFlags,
  containsSiteObservationPromotionalTerm,
  getExcludedSiteObservationTerms,
  omitSiteObservationPromotionalText,
  type SiteObservationPromotionalFlagsJson,
} from "./site-html-promotional-flags";

export type SiteHtmlObservation = {
  page_title: string | null;
  meta_description: string | null;
  h1: string | null;
  observed_menu_labels: string[];
  observed_account_features: string[];
  observed_betting_features: string[];
  observed_payment_flags: string[];
  observed_notice_items: string[];
  observed_event_items: string[];
  observed_footer_text: string[];
  observed_badges: string[];
  image_candidates_json: SiteHtmlImageCandidates;
  favicon_candidates_json: string[];
  logo_candidates_json: string[];
  promotional_flags_json: SiteObservationPromotionalFlagsJson;
  excluded_terms_json: string[];
  public_observation_summary: string[];
  visible_text: string;
  html_hash: string;
  visible_text_hash: string;
  html_sha256: string;
  visible_text_sha256: string;
};

const accountKeywords = [
  "로그인",
  "회원가입",
  "가입",
  "마이페이지",
  "고객센터",
  "아이디",
  "비밀번호",
];

const bettingKeywords = [
  "스포츠",
  "스포츠북",
  "카지노",
  "슬롯",
  "라이브카지노",
  "게임",
  "배당",
  "경기",
  "베팅",
];

const paymentKeywords = [
  "입금",
  "출금",
  "충전",
  "환전",
  "결제",
  "계좌",
  "포인트",
  "머니",
];

const noticeKeywords = ["공지", "안내"];
const eventKeywords = ["이벤트", "프로모션", "보너스", "쿠폰", "혜택"];

export function extractSiteHtmlObservation({
  html,
  sourceUrl,
}: {
  html: string;
  sourceUrl?: string | null;
}): SiteHtmlObservation {
  const rawHtml = html || "";
  const analysisHtml = removeExcludedHtmlElements(rawHtml);
  const visibleText = htmlToVisibleText(analysisHtml);
  const textChunks = extractTextChunks(analysisHtml, visibleText);
  const imageCandidates = extractSiteHtmlImageCandidates({
    html: analysisHtml,
    baseUrl: sourceUrl,
  });
  const htmlHash = sha256(rawHtml);
  const visibleTextHash = sha256(visibleText);

  const observation = {
    page_title: extractPageTitle(analysisHtml),
    meta_description: extractMetaContent(analysisHtml, ["description"]),
    h1: extractFirstTagText(analysisHtml, "h1"),
    observed_menu_labels: extractMenuLabels(analysisHtml),
    observed_account_features: filterByKeywords(textChunks, accountKeywords),
    observed_betting_features: filterByKeywords(textChunks, bettingKeywords),
    observed_payment_flags: filterByKeywords(textChunks, paymentKeywords),
    observed_notice_items: filterByKeywords(textChunks, noticeKeywords),
    observed_event_items: filterByKeywords(textChunks, eventKeywords),
    observed_footer_text: extractFooterText(analysisHtml, visibleText),
    observed_badges: extractBadgeText(analysisHtml, textChunks),
    image_candidates_json: imageCandidates,
    favicon_candidates_json: imageCandidates.favicon_candidates,
    logo_candidates_json: imageCandidates.logo_candidates,
    promotional_flags_json: classifySiteObservationPromotionalFlags(textChunks),
    excluded_terms_json: getExcludedSiteObservationTerms(textChunks),
    visible_text: visibleText,
    html_hash: htmlHash,
    visible_text_hash: visibleTextHash,
    html_sha256: htmlHash,
    visible_text_sha256: visibleTextHash,
  };

  return {
    ...observation,
    public_observation_summary: buildPublicObservationSummary(observation),
  };
}

export function removeExcludedHtmlElements(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<(script|style|iframe|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      " ",
    )
    .replace(/<(script|style|iframe|noscript)\b[^>]*\/\s*>/gi, " ");
}

function buildPublicObservationSummary({
  page_title,
  h1,
  observed_menu_labels,
  observed_account_features,
  observed_betting_features,
  observed_payment_flags,
  observed_notice_items,
  observed_event_items,
}: Omit<
  SiteHtmlObservation,
  "public_observation_summary"
>): string[] {
  const summary: string[] = [];

  if (page_title && !containsSiteObservationPromotionalTerm(page_title)) {
    summary.push(`페이지 제목: ${page_title}`);
  }

  if (h1 && h1 !== page_title && !containsSiteObservationPromotionalTerm(h1)) {
    summary.push(`대표 제목: ${h1}`);
  }

  const safeMenuLabels = omitSiteObservationPromotionalText(
    observed_menu_labels,
  ).slice(0, 8);

  if (safeMenuLabels.length > 0) {
    summary.push(`주요 메뉴 관측: ${safeMenuLabels.join(", ")}`);
  }

  if (observed_account_features.length > 0) {
    summary.push("계정 관련 화면 요소가 확인됩니다.");
  }

  if (observed_betting_features.length > 0) {
    summary.push("게임 및 경기 관련 화면 요소가 확인됩니다.");
  }

  if (observed_payment_flags.length > 0) {
    summary.push("결제 관련 화면 요소가 확인됩니다.");
  }

  if (observed_notice_items.length > 0 || observed_event_items.length > 0) {
    summary.push("공지성 또는 캠페인성 화면 요소가 확인됩니다.");
  }

  return summary.filter((item) => !containsSiteObservationPromotionalTerm(item));
}

function extractPageTitle(html: string) {
  return extractFirstTagText(html, "title");
}

function extractMetaContent(html: string, keys: string[]) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = extractHtmlAttributes(tag);
    const key = normalizeText(attrs.name || attrs.property || attrs.itemprop || "")
      .toLowerCase();

    if (normalizedKeys.has(key) && attrs.content) {
      return normalizeText(attrs.content);
    }
  }

  return null;
}

function extractMenuLabels(html: string) {
  const labels: string[] = [];

  for (const block of extractTagBlocks(html, ["nav", "header"])) {
    labels.push(
      ...extractTagTexts(block, ["a", "button", "li", "span"]).filter(
        isMenuLabel,
      ),
    );
  }

  labels.push(...extractTagTexts(html, ["a", "button"]).filter(isMenuLabel));

  return uniqueStrings(labels).slice(0, 40);
}

function extractFooterText(html: string, visibleText: string) {
  const footerTexts = extractTagBlocks(html, ["footer"]).flatMap((block) => [
    ...extractTagTexts(block, ["p", "span", "li", "div", "small"]),
    htmlToVisibleText(block),
  ]);
  const matchedVisibleLines = splitObservationText(visibleText).filter((line) =>
    /copyright|©|all rights reserved|개인정보|이용약관|회사|고객센터/i.test(line),
  );

  return uniqueStrings([...footerTexts, ...matchedVisibleLines])
    .filter((value) => value.length >= 2)
    .slice(0, 20);
}

function extractBadgeText(html: string, chunks: string[]) {
  const badgeTexts = extractTags(html)
    .filter((tag) => {
      const attrs = extractHtmlAttributes(tag);
      const hint = [
        attrs.class,
        attrs.id,
        attrs.role,
        attrs.title,
        attrs["aria-label"],
      ]
        .map((value) => value || "")
        .join(" ");

      return /badge|label|tag|ribbon|seal|verified|인증|공식|보증/i.test(hint);
    })
    .map((tag) => htmlToVisibleText(tag));

  return uniqueStrings([
    ...badgeTexts,
    ...chunks.filter((chunk) => /인증|공식|보증|verified|license/i.test(chunk)),
  ]).slice(0, 20);
}

function extractTextChunks(html: string, visibleText: string) {
  const elementTexts = extractTagTexts(html, [
    "a",
    "button",
    "li",
    "p",
    "span",
    "div",
    "strong",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "td",
    "th",
    "small",
  ]);

  return uniqueStrings([
    ...elementTexts,
    ...splitObservationText(visibleText),
  ]).filter((value) => value.length >= 2 && value.length <= 120);
}

function filterByKeywords(values: string[], keywords: string[]) {
  return uniqueStrings(
    values.filter((value) => keywords.some((keyword) => value.includes(keyword))),
  ).slice(0, 30);
}

function extractFirstTagText(html: string, tagName: string) {
  const pattern = new RegExp(
    `<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(
      tagName,
    )}\\s*>`,
    "i",
  );
  const match = pattern.exec(html);

  return match ? normalizeText(htmlToVisibleText(match[1])) || null : null;
}

function extractTagBlocks(html: string, tagNames: string[]) {
  return tagNames.flatMap((tagName) => {
    const pattern = new RegExp(
      `<${escapeRegExp(tagName)}\\b[^>]*>[\\s\\S]*?<\\/${escapeRegExp(
        tagName,
      )}\\s*>`,
      "gi",
    );

    return html.match(pattern) ?? [];
  });
}

function extractTagTexts(html: string, tagNames: string[]) {
  return tagNames.flatMap((tagName) =>
    extractTagBlocks(html, [tagName]).map(htmlToVisibleText).filter(Boolean),
  );
}

function extractTags(html: string) {
  return html.match(/<[a-z0-9:-]+\b[^>]*>[\s\S]*?<\/[a-z0-9:-]+\s*>/gi) ?? [];
}

function htmlToVisibleText(html: string) {
  return normalizeText(
    decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|header|footer|nav)>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function splitObservationText(value: string) {
  return value
    .split(/[\n\r|•·]+/)
    .map(normalizeText)
    .flatMap((line) => line.split(/\s{2,}/).map(normalizeText))
    .filter(Boolean);
}

function isMenuLabel(value: string) {
  return (
    value.length >= 1 &&
    value.length <= 40 &&
    !/^https?:\/\//i.test(value) &&
    /[a-z0-9가-힣]/i.test(value)
  );
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
