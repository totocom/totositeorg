import { sanitizePublicSiteName } from "./public-display";
import type { ReviewTarget } from "./sites";

export type SiteNameFormatInput =
  | string
  | Pick<
      ReviewTarget,
      "siteName" | "siteNameKo" | "siteNameEn" | "includeEnglishAliasInTitle"
    >;

type SiteNameFormatOptions = {
  includeEnglishAliasInTitle?: boolean;
};

export type SiteNameFormats = {
  koreanName: string;
  englishAlias: string;
  displayName: string;
  titleName: string;
  bodyName: string;
  includeEnglishAliasInTitle: boolean;
};

const koreanCharacterPattern = /[가-힣]/;

export function buildSiteNameFormats(
  input: SiteNameFormatInput,
  options: SiteNameFormatOptions = {},
): SiteNameFormats {
  const rawSiteName = getRawSiteName(input);
  const parsedName = parseParenthesizedAlias(rawSiteName);
  const hasParsedAlias = Boolean(parsedName.alias);
  const explicitKoreanName =
    typeof input === "string" || hasParsedAlias
      ? ""
      : normalizeNamePart(input.siteNameKo);
  const explicitEnglishAlias =
    typeof input === "string" ? "" : normalizeNamePart(input.siteNameEn);
  const primaryName = normalizeNamePart(parsedName.primary || rawSiteName);
  const parsedAlias = normalizeNamePart(parsedName.alias);
  const koreanName =
    explicitKoreanName || (hasKorean(primaryName) ? primaryName : "");
  const englishAlias = getEnglishAlias({
    koreanName,
    primaryName,
    parsedAlias,
    explicitEnglishAlias,
  });
  const fallbackName = koreanName || primaryName || englishAlias || "해당 사이트";
  const displayName =
    fallbackName && englishAlias && !isSameName(fallbackName, englishAlias)
      ? `${fallbackName} (${englishAlias})`
      : fallbackName;
  const bodyName =
    fallbackName && englishAlias && !isSameName(fallbackName, englishAlias)
      ? `${fallbackName}(${englishAlias})`
      : fallbackName;
  const includeEnglishAliasInTitle =
    options.includeEnglishAliasInTitle ??
    (typeof input === "string" ? false : (input.includeEnglishAliasInTitle ?? false));
  const titleName =
    includeEnglishAliasInTitle && bodyName ? bodyName : koreanName || fallbackName;

  return {
    koreanName,
    englishAlias,
    displayName,
    titleName,
    bodyName,
    includeEnglishAliasInTitle,
  };
}

export function getSiteTitleName(
  input: SiteNameFormatInput,
  options: SiteNameFormatOptions = {},
) {
  return buildSiteNameFormats(input, options).titleName;
}

export function getSiteDisplayName(input: SiteNameFormatInput) {
  return buildSiteNameFormats(input).displayName;
}

export function getSiteBodyName(input: SiteNameFormatInput) {
  return buildSiteNameFormats(input).bodyName;
}

function getRawSiteName(input: SiteNameFormatInput) {
  return typeof input === "string" ? input : input.siteName;
}

function parseParenthesizedAlias(value: string) {
  const normalized = normalizeNamePart(value);
  const match = normalized.match(/^(.*?)\s*\(([^)]*[A-Za-z0-9][^)]*)\)\s*$/);

  if (!match) {
    return {
      primary: normalized,
      alias: "",
    };
  }

  return {
    primary: match[1]?.trim() ?? normalized,
    alias: match[2]?.trim() ?? "",
  };
}

function normalizeNamePart(value: string | null | undefined) {
  const normalized = sanitizePublicSiteName(value)
    .replace(/(?:\s*토토사이트\s*정보)+$/g, "")
    .replace(/(?:\s*토토사이트)+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized === "해당 사이트" ? "" : normalized;
}

function getEnglishAlias({
  koreanName,
  primaryName,
  parsedAlias,
  explicitEnglishAlias,
}: {
  koreanName: string;
  primaryName: string;
  parsedAlias: string;
  explicitEnglishAlias: string;
}) {
  const alias = parsedAlias || explicitEnglishAlias;

  if (alias && !isSameName(koreanName || primaryName, alias)) {
    return alias;
  }

  if (!koreanName && primaryName && !hasKorean(primaryName)) {
    return primaryName;
  }

  return "";
}

function hasKorean(value: string) {
  return koreanCharacterPattern.test(value);
}

function isSameName(a: string, b: string) {
  return normalizeComparableName(a) === normalizeComparableName(b);
}

function normalizeComparableName(value: string) {
  return value.replace(/[^A-Za-z0-9가-힣]/g, "").toLowerCase();
}
