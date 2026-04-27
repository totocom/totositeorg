import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, serviceRoleKey };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return NextResponse.json({ verified: false }, { status: 400 });
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("telegram_signup_codes")
    .select("id, consumed_at, expires_at")
    .eq("verification_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      verified: false,
      reason: "db_error",
      details: error.message,
    });
  }

  if (!data) {
    return NextResponse.json({ verified: false, reason: "not_found" });
  }

  if (data.consumed_at) {
    return NextResponse.json({ verified: false, reason: "consumed" });
  }

  const expiresAt = new Date(String(data.expires_at)).getTime();

  if (expiresAt <= Date.now()) {
    return NextResponse.json({ verified: false, reason: "expired" });
  }

  return NextResponse.json({ verified: true });
}
