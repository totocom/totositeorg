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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { available: false, error: "올바른 이메일 형식으로 입력해주세요." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data: usersResult, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return NextResponse.json(
        { available: false, error: "이메일 확인에 실패했습니다." },
        { status: 500 },
      );
    }

    const exists = usersResult.users.some(
      (user) => user.email?.toLowerCase() === email,
    );

    if (exists) {
      return NextResponse.json({ available: false });
    }

    if (usersResult.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return NextResponse.json({ available: true });
}
