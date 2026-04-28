import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function normalizeIp(value: string) {
  const firstValue = value.trim().split(",")[0]?.trim() ?? "";

  if (!firstValue) return "";
  if (firstValue.startsWith("[") && firstValue.includes("]")) {
    return firstValue.slice(1, firstValue.indexOf("]"));
  }

  const ipv4WithPort = firstValue.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4WithPort) return ipv4WithPort[1];

  return firstValue;
}

function getClientIp(request: Request) {
  return normalizeIp(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for") ||
      "",
  );
}

function getBearerToken(request: Request) {
  return (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

async function getAdminEmail(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const email = userResult.user?.email?.toLowerCase();

  if (userError || !email) {
    return null;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  return adminError || !adminRow ? null : email;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminEmail = token ? await getAdminEmail(token) : null;

  if (!adminEmail) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const ipAddress = getClientIp(request);

  if (!ipAddress) {
    return NextResponse.json(
      { error: "현재 접속 IP를 확인하지 못했습니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.from("admin_ip_allowlist").upsert(
    {
      ip_address: ipAddress,
      label: `admin:${adminEmail}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ip_address" },
  );

  if (error) {
    return NextResponse.json(
      { error: "관리자 IP 예외 등록에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ipAddress });
}
