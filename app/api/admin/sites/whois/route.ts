import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type WhoisRawResponse = {
  domain?: unknown;
  registrar?: unknown;
  whois_server?: unknown;
  updated_date?: unknown;
  creation_date?: unknown;
  expiration_date?: unknown;
  name_servers?: unknown;
  dnssec?: unknown;
  error?: unknown;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiNinjasKey = process.env.API_NINJAS_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  if (!apiNinjasKey) {
    throw new Error("API_NINJAS_KEY 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, apiNinjasKey };
}

function extractDomain(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname)) {
      return null;
    }

    return hostname;
  } catch {
    return null;
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

  const milliseconds = numberValue > 10_000_000_000 ? numberValue : numberValue * 1000;
  return new Date(milliseconds).toISOString();
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

async function getAdminUser(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !(await getAdminUser(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const domain = extractDomain(body?.url);

  if (!domain) {
    return NextResponse.json(
      { error: "조회할 도메인 또는 사이트 URL을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const { apiNinjasKey } = getEnv();
    const response = await fetch(
      `https://api.api-ninjas.com/v1/whois?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          "X-Api-Key": apiNinjasKey,
          accept: "application/json",
        },
      },
    );
    const result = (await response.json().catch(() => null)) as WhoisRawResponse | null;

    if (!response.ok || !result) {
      return NextResponse.json(
        {
          error:
            firstString(result?.error) ||
            "WHOIS 정보를 가져오지 못했습니다. API 키 또는 도메인을 확인해주세요.",
        },
        { status: response.status || 400 },
      );
    }

    return NextResponse.json({
      domain: firstString(result.domain) || domain,
      registrar: firstString(result.registrar),
      whoisServer: firstString(result.whois_server),
      updatedDate: timestampToIso(result.updated_date),
      creationDate: timestampToIso(result.creation_date),
      expirationDate: timestampToIso(result.expiration_date),
      nameServers: stringArray(result.name_servers),
      dnssec: firstString(result.dnssec),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "WHOIS 정보를 가져오지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
