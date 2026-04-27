import { resolve4, resolve6, resolveCname, resolveMx, resolveNs, resolveSoa, resolveTxt } from "node:dns/promises";

export type PublicDnsInfo = {
  domain: string;
  a: string[];
  aaaa: string[];
  cname: string[];
  mx: string[];
  ns: string[];
  txt: string[];
  soa: string;
  errorMessage: string;
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

async function resolveList<T>(
  resolver: () => Promise<T[]>,
  formatter: (value: T) => string = String,
) {
  try {
    const values = await resolver();
    return values.map(formatter).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getPublicDnsInfo(
  siteUrl: string,
): Promise<PublicDnsInfo | null> {
  const domain = extractDomain(siteUrl);

  if (!domain) {
    return null;
  }

  const [a, aaaa, cname, mx, ns, txt, soaResult] = await Promise.all([
    resolveList(() => resolve4(domain)),
    resolveList(() => resolve6(domain)),
    resolveList(() => resolveCname(domain)),
    resolveList(
      () => resolveMx(domain),
      (record) => `${record.exchange} (${record.priority})`,
    ),
    resolveList(() => resolveNs(domain)),
    resolveList(
      () => resolveTxt(domain),
      (record) => record.join(""),
    ),
    resolveSoa(domain)
      .then(
        (record) =>
          `${record.nsname} / ${record.hostmaster} / serial ${record.serial}`,
      )
      .catch(() => ""),
  ]);

  const hasAnyRecord =
    a.length > 0 ||
    aaaa.length > 0 ||
    cname.length > 0 ||
    mx.length > 0 ||
    ns.length > 0 ||
    txt.length > 0 ||
    Boolean(soaResult);

  return {
    domain,
    a,
    aaaa,
    cname,
    mx,
    ns,
    txt,
    soa: soaResult,
    errorMessage: hasAnyRecord ? "" : "DNS 레코드를 조회하지 못했습니다.",
  };
}
