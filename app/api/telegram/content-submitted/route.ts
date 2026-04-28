import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ContentType = "review" | "scam_report";

type ContentRow = {
  id: string;
  site_id: string;
  user_id: string | null;
};

type SiteRow = {
  id: string;
  name: string;
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

function getAdminTelegramChatId() {
  return process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
}

async function getAuthenticatedUser(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

function getSubmittedMessage(type: ContentType, siteName: string) {
  const label = type === "scam_report" ? "먹튀 제보" : "만족도 평가";

  return [
    `✅ ${siteName} ${label} 접수 완료`,
    "",
    "관리자 검수 후 승인되면 게시물이 공개됩니다.",
  ].join("\n");
}

function getAdminSubmittedMessage(
  type: ContentType,
  siteName: string,
  subscription: TelegramSubscriptionRow | null,
) {
  const label = type === "scam_report" ? "먹튀 제보" : "만족도 평가";
  const submitter = getTelegramDisplayName(subscription);

  return [
    `새 ${label}가 접수되었습니다.`,
    "",
    `사이트명: ${siteName}`,
    submitter ? `제보자 텔레그램: ${submitter}` : "제보자 텔레그램: 확인 불가",
    "",
    "관리자 페이지에서 검토 후 승인해주세요.",
  ].join("\n");
}

function getTelegramDisplayName(subscription: TelegramSubscriptionRow | null) {
  if (!subscription) return "";
  const username = subscription.username?.trim();

  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }

  return subscription.chat_id;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = getTelegramToken();

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다.");
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

async function getContent(
  supabase: SupabaseClient,
  type: ContentType,
  contentId: string,
) {
  if (type === "review") {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, site_id, user_id")
      .eq("id", contentId)
      .eq("status", "pending")
      .maybeSingle<ContentRow>();

    return error ? null : data;
  }

  const { data, error } = await supabase
    .from("scam_reports")
    .select("id, site_id, user_id")
    .eq("id", contentId)
    .eq("review_status", "pending")
    .maybeSingle<ContentRow>();

  return error ? null : data;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = token ? await getAuthenticatedUser(token) : null;

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: unknown;
    contentId?: unknown;
  } | null;
  const type = body?.type;

  if (type !== "review" && type !== "scam_report") {
    return NextResponse.json(
      { error: "알림 종류가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  if (typeof body?.contentId !== "string" || !body.contentId.trim()) {
    return NextResponse.json(
      { error: "알림을 보낼 게시물 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const content = await getContent(supabase, type, body.contentId);

  if (!content || content.user_id !== user.id) {
    return NextResponse.json(
      { error: "접수된 게시물을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("telegram_subscriptions")
    .select("chat_id, username")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<TelegramSubscriptionRow>();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, name")
    .eq("id", content.site_id)
    .maybeSingle<SiteRow>();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  try {
    if (!subscriptionError && subscription) {
      await sendTelegramMessage(
        subscription.chat_id,
        getSubmittedMessage(type, site.name),
      );
    }

    const adminChatId = getAdminTelegramChatId();

    if (!adminChatId) {
      throw new Error("TELEGRAM_CHAT_ID 환경변수가 설정되지 않았습니다.");
    }

    await sendTelegramMessage(
      adminChatId,
      getAdminSubmittedMessage(type, site.name, subscription ?? null),
    );

    return NextResponse.json({
      ok: true,
      skippedUserNotification:
        subscriptionError || !subscription ? "no_subscription" : undefined,
    });
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
