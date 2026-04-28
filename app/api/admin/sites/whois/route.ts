import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractDomain,
  getWhoisInfoForDomain,
  normalizeWhoisProvider,
} from "@/app/data/domain-whois";

export const runtime = "nodejs";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
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

  const body = (await request.json().catch(() => null)) as
    | { url?: unknown; provider?: unknown }
    | null;
  const domain =
    typeof body?.url === "string" ? extractDomain(body.url.trim()) : "";

  if (!domain) {
    return NextResponse.json(
      { error: "조회할 도메인 또는 사이트 URL을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const provider = normalizeWhoisProvider(body?.provider);
    const whoisInfo = await getWhoisInfoForDomain(domain, {
      provider,
      bypassCache: provider !== "auto",
    });

    if (whoisInfo.errorMessage) {
      return NextResponse.json(
        { ...whoisInfo, error: whoisInfo.errorMessage },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ...whoisInfo,
      cached: false,
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
