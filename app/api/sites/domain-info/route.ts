import { NextResponse } from "next/server";
import { getPublicWhoisInfo } from "@/app/data/domain-whois";
import type { PublicDnsInfo } from "@/app/data/domain-dns";
import { supabase } from "@/lib/supabase/client";

type SiteRow = {
  id: string;
  url: string;
  domains?: string[] | null;
};

type DnsRecordRow = {
  domain: string;
  a_records: string[] | null;
  aaaa_records: string[] | null;
  cname_records: string[] | null;
  mx_records: string[] | null;
  ns_records: string[] | null;
  txt_records: string[] | null;
  soa_record: string | null;
  error_message: string | null;
};

function getSiteDomains(site: SiteRow) {
  return Array.isArray(site.domains) && site.domains.length > 0
    ? site.domains
    : [site.url];
}

function mapDnsRecordRow(row: DnsRecordRow): PublicDnsInfo {
  return {
    domain: row.domain,
    a: row.a_records ?? [],
    aaaa: row.aaaa_records ?? [],
    cname: row.cname_records ?? [],
    mx: row.mx_records ?? [],
    ns: row.ns_records ?? [],
    txt: row.txt_records ?? [],
    soa: row.soa_record ?? "",
    errorMessage: row.error_message ?? "",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId")?.trim() ?? "";
  const domainUrl = searchParams.get("domainUrl")?.trim() ?? "";

  if (!siteId || !domainUrl) {
    return NextResponse.json(
      { error: "사이트 ID와 도메인이 필요합니다." },
      { status: 400 },
    );
  }

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, url, domains")
    .eq("id", siteId)
    .eq("status", "approved")
    .maybeSingle<SiteRow>();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (!getSiteDomains(site).includes(domainUrl)) {
    return NextResponse.json(
      { error: "현재 사이트에 등록된 도메인만 조회할 수 있습니다." },
      { status: 400 },
    );
  }

  const [whoisInfo, dnsRecordResult] = await Promise.all([
    getPublicWhoisInfo(domainUrl),
    supabase
      .from("site_dns_records")
      .select(
        "domain, a_records, aaaa_records, cname_records, mx_records, ns_records, txt_records, soa_record, error_message",
      )
      .eq("site_id", siteId)
      .eq("domain_url", domainUrl)
      .maybeSingle<DnsRecordRow>(),
  ]);

  return NextResponse.json({
    whoisInfo,
    dnsInfo: dnsRecordResult.data ? mapDnsRecordRow(dnsRecordResult.data) : null,
  });
}
