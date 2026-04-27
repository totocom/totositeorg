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
};

type WhoisRawResponse = {
  domain?: unknown;
  registrar?: unknown;
  whois_server?: unknown;
  updated_date?: unknown;
  creation_date?: unknown;
  expiration_date?: unknown;
  name_servers?: unknown;
  dnssec?: unknown;
  registrant_name?: unknown;
  registrant_email?: unknown;
  registrant_organization?: unknown;
  registrant_org?: unknown;
  emails?: unknown;
  error?: unknown;
};

function extractDomain(value: string) {
  try {
    const url = new URL(
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`,
    );

    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function firstString(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : "";
  }
  return "";
}

function timestampToIso(value: unknown) {
  const timestamp = Array.isArray(value) ? value[0] : value;
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
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function getPublicWhoisInfo(
  siteUrl: string,
): Promise<PublicWhoisInfo | null> {
  const apiKey = process.env.API_NINJAS_KEY;
  const domain = extractDomain(siteUrl);

  if (!apiKey || !domain) {
    return null;
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
    const result = (await response.json().catch(() => null)) as
      | WhoisRawResponse
      | null;

    if (!response.ok || !result) {
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
        errorMessage:
          firstString(result?.error) || "WHOIS 정보를 조회하지 못했습니다.",
      };
    }

    return {
      domain: firstString(result.domain) || domain,
      registrar: firstString(result.registrar),
      whoisServer: firstString(result.whois_server),
      updatedDate: timestampToIso(result.updated_date),
      creationDate: timestampToIso(result.creation_date),
      expirationDate: timestampToIso(result.expiration_date),
      nameServers: stringArray(result.name_servers),
      dnssec: firstString(result.dnssec),
      registrantName: firstString(result.registrant_name),
      registrantEmail:
        firstString(result.registrant_email) || firstString(result.emails),
      registrantOrganization:
        firstString(result.registrant_organization) ||
        firstString(result.registrant_org),
      errorMessage: "",
    };
  } catch {
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
      errorMessage: "WHOIS 정보를 조회하지 못했습니다.",
    };
  }
}
