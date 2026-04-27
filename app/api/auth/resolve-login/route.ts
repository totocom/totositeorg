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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUsername(value: string) {
  return /^[a-z0-9_]{4,20}$/.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    login?: unknown;
  } | null;
  const login =
    typeof body?.login === "string" ? body.login.trim().toLowerCase() : "";

  if (!login) {
    return NextResponse.json(
      { error: "아이디 또는 이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  if (isValidEmail(login)) {
    return NextResponse.json({ email: login });
  }

  if (!isValidUsername(login)) {
    return NextResponse.json(
      { error: "아이디 또는 이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", login)
    .maybeSingle();

  if (profileError || !profile?.user_id) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호를 확인해주세요." },
      { status: 404 },
    );
  }

  const { data: userResult, error: userError } =
    await supabase.auth.admin.getUserById(profile.user_id);
  const email = userResult.user?.email?.toLowerCase();

  if (userError || !email) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호를 확인해주세요." },
      { status: 404 },
    );
  }

  return NextResponse.json({ email });
}
