import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  name: string;
  url: string;
  domains: string[] | null;
  description: string;
  created_at: string;
};

type TelegramSubscriptionRow = {
  chat_id: string;
  username: string | null;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getTelegramToken() {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").replace(/^bot/i, "").trim();
}

function getTelegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
}

async function getAuthenticatedSupabase(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error } = await supabase.auth.getUser(token);

  if (error || !userResult.user) {
    return null;
  }

  return { supabase, user: userResult.user };
}

function getTelegramDisplayName(subscription: TelegramSubscriptionRow | null) {
  if (!subscription) return "";
  const username = subscription.username?.trim();

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return subscription.chat_id;
}

function buildSubmissionMessage(
  site: SiteRow,
  subscription: TelegramSubscriptionRow | null,
) {
  const domains = site.domains?.filter(Boolean) ?? [];
  const submitter = getTelegramDisplayName(subscription);

  return [
    "새 사이트 제보가 접수되었습니다.",
    "",
    `사이트명: ${site.name}`,
    `대표 URL: ${site.url}`,
    domains.length > 1 ? `추가 URL: ${domains.slice(1).join(", ")}` : "",
    submitter ? `제보자 텔레그램: ${submitter}` : "제보자 텔레그램: 확인 불가",
    "",
    "관리자 페이지에서 검토 후 승인해주세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegramMessage(text: string) {
  const token = getTelegramToken();
  const chatId = getTelegramChatId();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID 환경변수가 설정되지 않았습니다.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
  } | null;

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.description ?? "텔레그램 메시지 전송에 실패했습니다.");
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const auth = token ? await getAuthenticatedSupabase(token) : null;

  if (!auth) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { siteId?: unknown } | null;

  if (typeof body?.siteId !== "string" || !body.siteId.trim()) {
    return NextResponse.json(
      { error: "알림을 보낼 사이트 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { data: site, error: siteError } = await auth.supabase
    .from("sites")
    .select("id, name, url, domains, description, created_at")
    .eq("id", body.siteId)
    .eq("user_id", auth.user.id)
    .eq("status", "pending")
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "제출된 사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: subscription } = await auth.supabase
    .from("telegram_subscriptions")
    .select("chat_id, username")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle<TelegramSubscriptionRow>();

  try {
    await sendTelegramMessage(
      buildSubmissionMessage(site as SiteRow, subscription ?? null),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "텔레그램 메시지 전송에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
