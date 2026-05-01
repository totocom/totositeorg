import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type ActiveWhoisProvider = "api-ninjas" | "apilayer";
export type WhoisProvider = ActiveWhoisProvider | "auto";

export type PublicWhoisInfo = {
  domain: string;
  registrar: string;
  whoisServer: string;
  updatedDate: string;
  creationDate: string;
  expirationDate: string;
  nameServers: string[];
  dnssec: string;
  registrantName: string;
  registrantEmail: string;
  registrantOrganization: string;
  errorMessage: string;
  provider?: ActiveWhoisProvider;
};

type WhoisRawResponse = {
  domain?: unknown;
  domain_name?: unknown;
  name?: unknown;
  registrar?: unknown;
  whois_server?: unknown;
  whoisserver?: unknown;
  ask_whois?: unknown;
  server?: unknown;
  updated_date?: unknown;
  updatedDate?: unknown;
  changed?: unknown;
  creation_date?: unknown;
  created?: unknown;
  createdDate?: unknown;
  expiration_date?: unknown;
  expires?: unknown;
  expiresDate?: unknown;
  name_servers?: unknown;
  nameserver?: unknown;
  dnssec?: unknown;
  registrant_name?: unknown;
  registrant_email?: unknown;
  registrant_organization?: unknown;
  registrant_org?: unknown;
  emails?: unknown;
  error?: unknown;
  message?: unknown;
};

type WhoisCacheRow = {
  payload: unknown;
  expires_at: string;
};

export function normalizeWhoisProvider(value: unknown): WhoisProvider {
  return value === "api-ninjas" || value === "apilayer" || value === "auto"
    ? value
    : "auto";
}

export function extractDomain(value: string) {
  try {
    const url = new URL(
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`,
    );

    const hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");

    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname) ? hostname : "";
  } catch {
    return "";
  }
}

function getConfiguredWhoisProvider() {
  return normalizeWhoisProvider(process.env.WHOIS_PROVIDER);
}

function getApiNinjasKey() {
  return process.env.API_NINJAS_KEY || process.env.API_NINJAS_API_KEY || "";
}

function getApiLayerKey() {
  return process.env.APILAYER_WHOIS_API_KEY || process.env.APILAYER_API_KEY || "";
}

function firstString(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : "";
  }
  return "";
}

function firstNestedString(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const nested = value as Record<string, unknown>;
  return firstString(nested[key]);
}

function firstOf(...values: unknown[]) {
  for (const value of values) {
    const result = firstString(value);
    if (result) return result;
  }

  return "";
}

function firstDateValue(...values: unknown[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }

  return "";
}

function timestampToIso(value: unknown) {
  const timestamp = Array.isArray(value) ? value[0] : value;

  if (typeof timestamp === "string" && Number.isNaN(Number(timestamp))) {
    const milliseconds = Date.parse(timestamp);
    return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : "";
  }

  const numberValue =
    typeof timestamp === "number"
      ? timestamp
      : typeof timestamp === "string"
        ? Number(timestamp)
        : NaN;

  if (!Number.isFinite(numberValue)) return "";

  const milliseconds =
    numberValue > 10_000_000_000 ? numberValue : numberValue * 1000;
  return new Date(milliseconds).toISOString();
}

function stringArray(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isPublicWhoisInfo(value: unknown): value is PublicWhoisInfo {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<Record<keyof PublicWhoisInfo, unknown>>;

  return (
    typeof payload.domain === "string" &&
    typeof payload.registrar === "string" &&
    typeof payload.whoisServer === "string" &&
    typeof payload.updatedDate === "string" &&
    typeof payload.creationDate === "string" &&
    typeof payload.expirationDate === "string" &&
    Array.isArray(payload.nameServers) &&
    payload.nameServers.every((item) => typeof item === "string") &&
    typeof payload.dnssec === "string"
  );
}

function toPublicWhoisInfo(
  result: WhoisRawResponse,
  domain: string,
  provider: ActiveWhoisProvider,
): PublicWhoisInfo {
  const nameServers = stringArray(result.name_servers);
  const providerDomain = extractDomain(
    firstOf(result.domain, result.domain_name, result.name),
  );

  return {
    domain: providerDomain || domain,
    registrar:
      firstString(result.registrar) ||
      firstNestedString(result.registrar, "name"),
    whoisServer: firstOf(
      result.whois_server,
      result.whoisserver,
      result.ask_whois,
      result.server,
    ),
    updatedDate: timestampToIso(
      firstDateValue(result.updated_date, result.updatedDate, result.changed),
    ),
    creationDate: timestampToIso(
      firstDateValue(result.creation_date, result.createdDate, result.created),
    ),
    expirationDate: timestampToIso(
      firstDateValue(result.expiration_date, result.expiresDate, result.expires),
    ),
    nameServers: nameServers.length ? nameServers : stringArray(result.nameserver),
    dnssec: firstString(result.dnssec),
    registrantName: firstString(result.registrant_name),
    registrantEmail:
      firstString(result.registrant_email) || firstString(result.emails),
    registrantOrganization:
      firstString(result.registrant_organization) ||
      firstString(result.registrant_org),
    errorMessage: "",
    provider,
  };
}

function getLookupError(
  domain: string,
  errorMessage = "WHOIS 정보를 조회하지 못했습니다.",
): PublicWhoisInfo {
  return {
    domain,
    registrar: "",
    whoisServer: "",
    updatedDate: "",
    creationDate: "",
    expirationDate: "",
    nameServers: [],
    dnssec: "",
    registrantName: "",
    registrantEmail: "",
    registrantOrganization: "",
    errorMessage,
  };
}

function unwrapWhoisResult(payload: unknown): WhoisRawResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const objectPayload = payload as Record<string, unknown>;

  if (objectPayload.result && typeof objectPayload.result === "object") {
    return objectPayload.result as WhoisRawResponse;
  }

  if (objectPayload.data && typeof objectPayload.data === "object") {
    return objectPayload.data as WhoisRawResponse;
  }

  return objectPayload as WhoisRawResponse;
}

function getCacheClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getCachedWhois(domain: string) {
  const supabase = getCacheClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("domain_whois_cache")
    .select("payload, expires_at")
    .eq("domain", domain)
    .maybeSingle<WhoisCacheRow>();

  if (error || !data || new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }

  if (!isPublicWhoisInfo(data.payload)) {
    return null;
  }

  return {
    ...data.payload,
    registrantName: data.payload.registrantName ?? "",
    registrantEmail: data.payload.registrantEmail ?? "",
    registrantOrganization: data.payload.registrantOrganization ?? "",
    errorMessage: data.payload.errorMessage ?? "",
  };
}

async function saveCachedWhois(domain: string, payload: PublicWhoisInfo) {
  const supabase = getCacheClient();

  if (!supabase) {
    return;
  }

  await supabase.from("domain_whois_cache").upsert(
    {
      domain,
      payload,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "domain" },
  );
}

async function fetchApiNinjasWhois(domain: string) {
  const apiKey = getApiNinjasKey();

  if (!apiKey) {
    return getLookupError(domain, "API_NINJAS_KEY 환경변수가 설정되지 않았습니다.");
  }

  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/whois?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          "X-Api-Key": apiKey,
          accept: "application/json",
        },
        next: { revalidate: 86_400 },
      },
    );
    const payload = await response.json().catch(() => null);
    const result = unwrapWhoisResult(payload);

    if (!response.ok || !result) {
      return getLookupError(
        domain,
        firstOf(result?.error, result?.message) ||
          "API-Ninjas WHOIS 조회에 실패했습니다.",
      );
    }

    return toPublicWhoisInfo(result, domain, "api-ninjas");
  } catch {
    return getLookupError(domain, "API-Ninjas WHOIS 조회에 실패했습니다.");
  }
}

async function fetchApiLayerWhois(domain: string) {
  const apiKey = getApiLayerKey();

  if (!apiKey) {
    return getLookupError(
      domain,
      "APILAYER_WHOIS_API_KEY 환경변수가 설정되지 않았습니다.",
    );
  }

  try {
    const response = await fetch(
      `https://api.apilayer.com/whois/query?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          apikey: apiKey,
          accept: "application/json",
        },
        next: { revalidate: 86_400 },
      },
    );
    const payload = await response.json().catch(() => null);
    const result = unwrapWhoisResult(payload);

    if (!response.ok || !result) {
      return getLookupError(
        domain,
        firstOf(result?.error, result?.message) ||
          "APILayer WHOIS 조회에 실패했습니다.",
      );
    }

    return toPublicWhoisInfo(result, domain, "apilayer");
  } catch {
    return getLookupError(domain, "APILayer WHOIS 조회에 실패했습니다.");
  }
}

async function fetchWhoisWithProvider(domain: string, provider: WhoisProvider) {
  if (provider === "api-ninjas") {
    return fetchApiNinjasWhois(domain);
  }

  if (provider === "apilayer") {
    return fetchApiLayerWhois(domain);
  }

  if (getApiNinjasKey()) {
    const apiNinjasResult = await fetchApiNinjasWhois(domain);

    if (!apiNinjasResult.errorMessage) {
      return apiNinjasResult;
    }
  }

  if (getApiLayerKey()) {
    return fetchApiLayerWhois(domain);
  }

  return getLookupError(
    domain,
    "API_NINJAS_KEY 또는 APILAYER_WHOIS_API_KEY 환경변수가 필요합니다.",
  );
}

export async function getWhoisInfoForDomain(
  domain: string,
  options: { provider?: WhoisProvider; bypassCache?: boolean } = {},
): Promise<PublicWhoisInfo> {
  const provider = options.provider ?? getConfiguredWhoisProvider();

  if (!options.bypassCache) {
    const cachedWhois = await getCachedWhois(domain);

    if (cachedWhois) {
      return cachedWhois;
    }
  }

  const whoisInfo = await fetchWhoisWithProvider(domain, provider);

  if (!whoisInfo.errorMessage) {
    await saveCachedWhois(domain, whoisInfo);
  }

  return whoisInfo;
}

async function getBatchDomainCreationDateEntriesUncached(
  domains: string[],
): Promise<Array<[string, string]>> {
  if (domains.length === 0) return [];

  const supabase = getCacheClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("domain_whois_cache")
    .select("domain, payload")
    .in("domain", domains);

  if (error || !data) return [];

  const result: Array<[string, string]> = [];
  for (const row of data) {
    if (isPublicWhoisInfo(row.payload) && row.payload.creationDate) {
      result.push([row.domain as string, row.payload.creationDate]);
    }
  }
  return result;
}

const getCachedBatchDomainCreationDateEntries = unstable_cache(
  getBatchDomainCreationDateEntriesUncached,
  ["batch-domain-creation-dates"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);

export async function getBatchDomainCreationDates(
  domains: string[],
): Promise<Map<string, string>> {
  const uniqueDomains = Array.from(new Set(domains)).sort();
  const entries = await getCachedBatchDomainCreationDateEntries(uniqueDomains);

  return new Map(entries);
}

export async function getPublicWhoisInfo(
  siteUrl: string,
): Promise<PublicWhoisInfo | null> {
  const domain = extractDomain(siteUrl);

  if (!domain) {
    return null;
  }

  const cachedWhois = await getCachedWhois(domain);

  if (cachedWhois) {
    return cachedWhois;
  }

  if (process.env.ENABLE_PUBLIC_WHOIS !== "true") {
    return null;
  }

  return getWhoisInfoForDomain(domain);
}
