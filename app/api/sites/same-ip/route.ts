import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

type SiteRow = {
  id: string;
  slug: string | null;
  name: string;
  name_ko?: string | null;
  name_en?: string | null;
  url: string;
  domains?: string[] | null;
  resolved_ips?: string[] | null;
};

function getDisplayName(site: SiteRow) {
  const ko = site.name_ko?.trim() ?? "";
  const en = site.name_en?.trim() ?? "";

  if (ko && en) return `${ko} (${en})`;
  return ko || en || site.name;
}

function getSiteDomains(site: SiteRow) {
  return Array.isArray(site.domains) && site.domains.length > 0
    ? site.domains
    : [site.url];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId")?.trim() ?? "";
  const ip = searchParams.get("ip")?.trim() ?? "";

  if (!siteId || !ip) {
    return NextResponse.json(
      { error: "사이트 ID와 IP가 필요합니다." },
      { status: 400 },
    );
  }

  const { data: currentSite, error: currentSiteError } = await supabase
    .from("sites")
    .select("id, resolved_ips")
    .eq("id", siteId)
    .eq("status", "approved")
    .maybeSingle<Pick<SiteRow, "id" | "resolved_ips">>();

  if (currentSiteError || !currentSite) {
    return NextResponse.json(
      { error: "사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const currentIps = currentSite.resolved_ips ?? [];

  if (!currentIps.includes(ip)) {
    return NextResponse.json(
      { error: "현재 사이트와 연결된 IP만 조회할 수 있습니다." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, name_ko, name_en, url, domains, resolved_ips")
    .eq("status", "approved")
    .neq("id", siteId)
    .overlaps("resolved_ips", [ip])
    .limit(8)
    .returns<SiteRow[]>();

  if (error) {
    return NextResponse.json(
      { error: "동일 IP 사이트를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const matches = (data ?? []).map((site) => ({
    id: site.id,
    slug: site.slug ?? site.id,
    siteName: getDisplayName(site),
    siteUrl: site.url,
    matchedDomains: getSiteDomains(site).slice(0, 1),
    matchedIps: (site.resolved_ips ?? []).filter((siteIp) => siteIp === ip),
  }));

  return NextResponse.json({ matches });
}
