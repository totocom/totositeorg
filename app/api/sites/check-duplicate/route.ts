import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/config";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  slug: string | null;
  name: string;
  name_ko: string | null;
  name_en: string | null;
  url: string;
  domains: string[] | null;
  status: "pending" | "approved" | "rejected";
};

type DuplicateSite = {
  id: string;
  name: string;
  url: string;
  status: SiteRow["status"];
  publicUrl: string;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, serviceRoleKey };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getPublicUrl(site: SiteRow) {
  const baseUrl = siteUrl.replace(/\/$/, "");

  if (site.slug && site.status === "approved") {
    return `${baseUrl}/sites/${site.slug}`;
  }

  return site.url;
}

function mapSite(site: SiteRow): DuplicateSite {
  return {
    id: site.id,
    name: site.name,
    url: site.url,
    status: site.status,
    publicUrl: getPublicUrl(site),
  };
}

function uniqueSites(sites: SiteRow[]) {
  const seen = new Set<string>();

  return sites.filter((site) => {
    if (seen.has(site.id)) return false;
    seen.add(site.id);
    return true;
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    nameKo?: unknown;
    nameEn?: unknown;
    url?: unknown;
    domains?: unknown;
  } | null;

  const nameKo = normalizeText(body?.nameKo);
  const nameEn = normalizeText(body?.nameEn);
  const url = normalizeUrl(body?.url);
  const domains = Array.isArray(body?.domains)
    ? body.domains.map(normalizeUrl).filter(Boolean)
    : [];
  const allUrls = Array.from(new Set([url, ...domains].filter(Boolean)));
  const hostnames = new Set(allUrls.map(getHostname).filter(Boolean));

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, name_ko, name_en, url, domains, status")
    .in("status", ["pending", "approved"])
    .limit(1000);

  if (error) {
    return NextResponse.json(
      { error: "사이트 중복 확인에 실패했습니다." },
      { status: 500 },
    );
  }

  const sites = (data ?? []) as SiteRow[];
  const nameMatches = uniqueSites(
    sites.filter((site) => {
      const existingKo = normalizeText(site.name_ko);
      const existingEn = normalizeText(site.name_en);
      const existingName = normalizeText(site.name);

      return (
        (Boolean(nameKo) &&
          (nameKo === existingKo || nameKo === existingName)) ||
        (Boolean(nameEn) &&
          (nameEn === existingEn || nameEn === existingName))
      );
    }),
  ).map(mapSite);
  const urlMatches = uniqueSites(
    sites.filter((site) => {
      const existingUrls = new Set(
        [site.url, ...(site.domains ?? [])].map(normalizeUrl).filter(Boolean),
      );

      return allUrls.some((candidate) => existingUrls.has(candidate));
    }),
  ).map(mapSite);
  const domainMatches = uniqueSites(
    sites.filter((site) => {
      const existingHostnames = new Set(
        [site.url, ...(site.domains ?? [])]
          .map(normalizeUrl)
          .map(getHostname)
          .filter(Boolean),
      );

      return Array.from(hostnames).some((hostname) =>
        existingHostnames.has(hostname),
      );
    }),
  ).map(mapSite);

  return NextResponse.json({
    nameMatches,
    urlMatches,
    domainMatches,
  });
}
