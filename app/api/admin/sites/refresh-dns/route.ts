import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicDnsInfo, type PublicDnsInfo } from "@/app/data/domain-dns";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  url: string;
  domains: string[] | null;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getClient(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function getAdminUser(token: string) {
  const supabase = getClient(token);
  const { data: userResult, error: userError } =
    await supabase.auth.getUser(token);
  const email = userResult.user?.email;

  if (userError || !email) {
    return false;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return !adminError && Boolean(adminRow);
}

function getDnsIps(dnsInfo: PublicDnsInfo | null) {
  if (!dnsInfo) return [];
  return Array.from(new Set([...dnsInfo.a, ...dnsInfo.aaaa])).sort();
}

function getDomainTargets(site: SiteRow) {
  return Array.from(
    new Set((site.domains?.length ? site.domains : [site.url]).filter(Boolean)),
  ).slice(0, 6);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !(await getAdminUser(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    siteId?: unknown;
  } | null;

  if (typeof body?.siteId !== "string" || !body.siteId.trim()) {
    return NextResponse.json(
      { error: "DNS를 갱신할 사이트 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getClient(token);
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, url, domains")
    .eq("id", body.siteId)
    .maybeSingle<SiteRow>();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "사이트 정보를 찾지 못했습니다." },
      { status: 404 },
    );
  }

  const checkedAt = new Date().toISOString();
  const dnsRecords = await Promise.all(
    getDomainTargets(site).map(async (domainUrl) => ({
      domainUrl,
      dnsInfo: await getPublicDnsInfo(domainUrl),
    })),
  );
  const rows = dnsRecords
    .filter((record) => record.dnsInfo)
    .map(({ domainUrl, dnsInfo }) => ({
      site_id: site.id,
      domain_url: domainUrl,
      domain: dnsInfo?.domain ?? domainUrl,
      a_records: dnsInfo?.a ?? [],
      aaaa_records: dnsInfo?.aaaa ?? [],
      cname_records: dnsInfo?.cname ?? [],
      mx_records: dnsInfo?.mx ?? [],
      ns_records: dnsInfo?.ns ?? [],
      txt_records: dnsInfo?.txt ?? [],
      soa_record: dnsInfo?.soa ?? "",
      error_message: dnsInfo?.errorMessage ?? "",
      checked_at: checkedAt,
    }));
  const resolvedIps = Array.from(
    new Set(dnsRecords.flatMap((record) => getDnsIps(record.dnsInfo))),
  ).sort();

  const deleteResult = await supabase
    .from("site_dns_records")
    .delete()
    .eq("site_id", site.id);

  if (deleteResult.error) {
    return NextResponse.json(
      { error: "기존 DNS 정보를 정리하지 못했습니다." },
      { status: 500 },
    );
  }

  if (rows.length > 0) {
    const insertResult = await supabase.from("site_dns_records").insert(rows);

    if (insertResult.error) {
      return NextResponse.json(
        { error: "DNS 정보를 저장하지 못했습니다." },
        { status: 500 },
      );
    }
  }

  const updateResult = await supabase
    .from("sites")
    .update({
      resolved_ips: resolvedIps,
      dns_checked_at: checkedAt,
    })
    .eq("id", site.id);

  if (updateResult.error) {
    return NextResponse.json(
      { error: "사이트 DNS 요약 정보를 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    resolvedIps,
    checkedAt,
    records: rows.length,
  });
}
