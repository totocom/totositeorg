import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/config";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  name: string;
  slug: string | null;
  url: string;
};

type TelegramSubscriptionRow = {
  chat_id: string;
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getSitePublicUrl(site: SiteRow) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  return site.slug ? `${baseUrl}/sites/${site.slug}` : site.url;
}

function getSubscriptionMessage(site: SiteRow) {
  const publicUrl = getSitePublicUrl(site);

  return [
    "✅ <b>텔레그램 알림 구독이 완료되었습니다</b>",
    "",
    "🏷 <b>사이트</b>",
    escapeHtml(site.name),
    "",
    "🔗 <b>사이트 주소</b>",
    escapeHtml(publicUrl),
    "",
    "📢 <b>알림 내용</b>",
    "• 새로운 만족도 평가 등록",
    "• 새로운 먹튀 제보 등록",
    "",
    "🟢 <b>구독 상태</b>",
    "알림 수신 중",
    "",
    "해당 사이트에 새 평가나 제보가 등록되면",
    "이 채팅으로 바로 알려드릴게요.",
  ].join("\n");
}

function getUnsubscriptionMessage(site: SiteRow) {
  return [
    "🔕 <b>텔레그램 알림 구독이 해제되었습니다</b>",
    "",
    "🏷 <b>사이트</b>",
    escapeHtml(site.name),
    "",
    "⚪ <b>구독 상태</b>",
    "알림 수신 중지",
    "",
    "이 사이트의 새 평가나 제보 알림은 더 이상 전송되지 않습니다.",
  ].join("\n");
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
      parse_mode: "HTML",
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

  if (!token) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    siteId?: unknown;
    action?: unknown;
  } | null;

  if (typeof body?.siteId !== "string" || !body.siteId.trim()) {
    return NextResponse.json(
      { error: "사이트 ID가 필요합니다." },
      { status: 400 },
    );
  }

  if (body.action !== "subscribe" && body.action !== "unsubscribe") {
    return NextResponse.json(
      { error: "구독 동작이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv();
  const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const { data: userResult, error: userError } = await authSupabase.auth.getUser(token);
  const userId = userResult.user?.id;

  if (userError || !userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const [{ data: site, error: siteError }, { data: subscription, error: subscriptionError }] =
    await Promise.all([
      supabase
        .from("sites")
        .select("id, name, slug, url")
        .eq("id", body.siteId)
        .eq("status", "approved")
        .maybeSingle<SiteRow>(),
      supabase
        .from("telegram_subscriptions")
        .select("chat_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle<TelegramSubscriptionRow>(),
    ]);

  if (siteError || !site) {
    return NextResponse.json(
      { error: "승인된 사이트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (subscriptionError || !subscription) {
    return NextResponse.json(
      { error: "텔레그램 연결이 필요합니다." },
      { status: 409 },
    );
  }

  if (body.action === "subscribe") {
    const { error } = await supabase.from("site_telegram_subscriptions").upsert(
      {
        site_id: site.id,
        user_id: userId,
      },
      { onConflict: "site_id,user_id" },
    );

    if (error) {
      return NextResponse.json(
        { error: "구독 저장에 실패했습니다." },
        { status: 500 },
      );
    }

    await sendTelegramMessage(subscription.chat_id, getSubscriptionMessage(site));

    return NextResponse.json({ ok: true, isSubscribed: true });
  }

  const { error } = await supabase
    .from("site_telegram_subscriptions")
    .delete()
    .eq("site_id", site.id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "구독 해제에 실패했습니다." },
      { status: 500 },
    );
  }

  await sendTelegramMessage(subscription.chat_id, getUnsubscriptionMessage(site));

  return NextResponse.json({ ok: true, isSubscribed: false });
}
