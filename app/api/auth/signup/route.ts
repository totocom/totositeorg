import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SignupBody = {
  username?: unknown;
  nickname?: unknown;
  email?: unknown;
  password?: unknown;
  telegramSignupCode?: unknown;
  emailRedirectTo?: unknown;
};

type ProfileIpRow = {
  user_id: string;
};

type AdminIpRow = {
  ip_address: string;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string) {
  return /^[a-z0-9_]{4,20}$/.test(username);
}

function normalizeIp(value: string) {
  const trimmed = value.trim();
  const firstValue = trimmed.split(",")[0]?.trim() ?? "";

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

function getEnvAllowlist() {
  return new Set(
    (process.env.SIGNUP_IP_ALLOWLIST ?? "")
      .split(",")
      .map(normalizeIp)
      .filter(Boolean),
  );
}

async function isIpAllowlisted(
  supabase: SupabaseClient,
  ipAddress: string,
) {
  if (getEnvAllowlist().has(ipAddress)) {
    return true;
  }

  const { data, error } = await supabase
    .from("admin_ip_allowlist")
    .select("ip_address")
    .eq("ip_address", ipAddress)
    .maybeSingle<AdminIpRow>();

  return !error && Boolean(data);
}

async function hasExistingSignupFromIp(
  supabase: SupabaseClient,
  ipAddress: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("signup_ip", ipAddress)
    .limit(1)
    .maybeSingle<ProfileIpRow>();

  if (error) {
    throw new Error("가입 IP 확인에 실패했습니다.");
  }

  return Boolean(data);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignupBody | null;
  const username =
    typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const telegramSignupCode =
    typeof body?.telegramSignupCode === "string"
      ? body.telegramSignupCode.trim().toUpperCase()
      : "";
  const emailRedirectTo =
    typeof body?.emailRedirectTo === "string" ? body.emailRedirectTo : undefined;
  const signupIp = getClientIp(request);
  const signupUserAgent = request.headers.get("user-agent") ?? "";

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "아이디 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (nickname.length < 2 || nickname.length > 20) {
    return NextResponse.json(
      { error: "닉네임은 2~20자로 입력해주세요." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "올바른 이메일 형식으로 입력해주세요." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 최소 6자 이상 입력해주세요." },
      { status: 400 },
    );
  }

  if (!/^[A-Z0-9]{8}$/.test(telegramSignupCode)) {
    return NextResponse.json(
      { error: "텔레그램 인증을 완료해주세요." },
      { status: 400 },
    );
  }

  if (!signupIp) {
    return NextResponse.json(
      { error: "가입 요청 IP를 확인하지 못했습니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv();
  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);
  const isAllowlisted = await isIpAllowlisted(serviceSupabase, signupIp);

  if (!isAllowlisted && (await hasExistingSignupFromIp(serviceSupabase, signupIp))) {
    return NextResponse.json(
      {
        error:
          "현재 접속 IP에서는 이미 가입된 계정이 있습니다. 같은 IP에서는 1개 계정만 생성할 수 있습니다.",
      },
      { status: 409 },
    );
  }

  const signupSupabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await signupSupabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        username,
        nickname,
        telegram_signup_code: telegramSignupCode,
        signup_ip: signupIp,
        signup_user_agent: signupUserAgent,
      },
    },
  });

  if (error) {
    const duplicateIp = error.message.includes("signup_ip_already_used");

    return NextResponse.json(
      {
        error: duplicateIp
          ? "현재 접속 IP에서는 이미 가입된 계정이 있습니다. 같은 IP에서는 1개 계정만 생성할 수 있습니다."
          : "회원가입에 실패했습니다. 입력 정보를 확인하거나 잠시 후 다시 시도해주세요.",
      },
      { status: duplicateIp ? 409 : 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
