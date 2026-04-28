import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  name: string;
  url: string;
  domains: string[] | null;
  status: string;
};

type TelegramSubscriptionRow = {
  chat_id: string;
  username: string | null;
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

function getTelegramToken() {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").replace(/^bot/i, "").trim();
}

function getTelegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getTelegramDisplayName(subscription: TelegramSubscriptionRow | null) {
  if (!subscription) return "";
  const username = subscription.username?.trim();

  if (username) return username.startsWith("@") ? username : `@${username}`;
  return subscription.chat_id;
}

async function sendTelegramMessage(text: string) {
  const token = getTelegramToken();
  const chatId = getTelegramChatId();

  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    siteId?: unknown;
    domainUrl?: unknown;
  } | null;
  const siteId = typeof body?.siteId === "string" ? body.siteId.trim() : "";
  const domainUrl = normalizeUrl(body?.domainUrl);

  if (!siteId || !domainUrl) {
    return NextResponse.json(
      { error: "추가할 도메인 URL을 입력해주세요." },
      { status: 400 },
    );
  }

  const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv();
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResult, error: userError } =
    await userSupabase.auth.getUser(token);

  if (userError || !userResult.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: site, error: siteError } = await adminSupabase
    .from("sites")
    .select("id, name, url, domains, status")
    .eq("id", siteId)
    .eq("status", "approved")
    .maybeSingle<SiteRow>();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "승인된 사이트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const nextHostname = getHostname(domainUrl);
  const existingDomains = [site.url, ...(site.domains ?? [])].filter(Boolean);
  const duplicated = existingDomains.some(
    (domain) => domain === domainUrl || getHostname(domain) === nextHostname,
  );

  if (duplicated) {
    return NextResponse.json(
      { error: "이미 등록된 도메인입니다." },
      { status: 409 },
    );
  }

  const { data: existingPending } = await adminSupabase
    .from("site_domain_submissions")
    .select("id")
    .eq("site_id", siteId)
    .eq("domain_url", domainUrl)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return NextResponse.json(
      { error: "이미 검토 중인 도메인 추가 요청입니다." },
      { status: 409 },
    );
  }

  const { data: submission, error: insertError } = await adminSupabase
    .from("site_domain_submissions")
    .insert({
      site_id: siteId,
      user_id: userResult.user.id,
      domain_url: domainUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !submission) {
    return NextResponse.json(
      { error: "도메인 추가 요청을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  const { data: subscription } = await adminSupabase
    .from("telegram_subscriptions")
    .select("chat_id, username")
    .eq("user_id", userResult.user.id)
    .eq("is_active", true)
    .maybeSingle<TelegramSubscriptionRow>();
  const submitter = getTelegramDisplayName(subscription ?? null);

  await sendTelegramMessage(
    [
      "새 도메인 추가 요청이 접수되었습니다.",
      "",
      `사이트명: ${site.name}`,
      `추가 도메인: ${domainUrl}`,
      submitter ? `요청자 텔레그램: ${submitter}` : "요청자 텔레그램: 확인 불가",
      "",
      "관리자 페이지에서 검토 후 승인해주세요.",
    ].join("\n"),
  );

  return NextResponse.json({ ok: true, id: submission.id });
}
