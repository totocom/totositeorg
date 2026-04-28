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

function normalizeNickname(value: string) {
  return value.trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nickname = normalizeNickname(searchParams.get("nickname") ?? "");

  if (nickname.length < 2 || nickname.length > 20) {
    return NextResponse.json(
      { available: false, error: "닉네임은 2~20자로 입력해주세요." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("nickname", nickname)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { available: false, error: "닉네임 확인에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ available: !data });
}
