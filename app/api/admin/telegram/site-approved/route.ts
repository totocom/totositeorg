import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/config";
import { getApprovedContentChannelId } from "@/lib/telegram";

export const runtime = "nodejs";

type SiteRow = {
  id: string;
  name: string;
  slug: string | null;
  url: string;
  user_id: string | null;
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

async function getIsAdmin(token: string) {
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

function buildApprovalMessage(site: SiteRow) {
  const publicUrl = site.slug ? `${siteUrl}/sites/${site.slug}` : site.url;

  return [
    "사이트 등록 요청이 승인되었습니다.",
    "",
    `사이트명: ${site.name}`,
    `공개 주소: ${publicUrl}`,
  ].join("\n");
}

function buildChannelApprovalMessage(site: SiteRow) {
  const publicUrl = site.slug ? `${siteUrl}/sites/${site.slug}` : site.url;

  return [
    `${site.name} 사이트가 새로 등록되었습니다.`,
    "",
    "새로 공개된 사이트 정보를 확인해보세요.",
    "",
    `바로가기: ${publicUrl}`,
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

  if (!token || !(await getIsAdmin(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { siteId?: unknown } | null;

  if (typeof body?.siteId !== "string" || !body.siteId.trim()) {
    return NextResponse.json(
      { error: "알림을 보낼 사이트 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, name, slug, url, user_id")
    .eq("id", body.siteId)
    .eq("status", "approved")
    .single();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "승인된 사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const deliveryErrors: string[] = [];

  try {
    await sendTelegramMessage(
      getApprovedContentChannelId(),
      buildChannelApprovalMessage(site as SiteRow),
    );
  } catch (error) {
    deliveryErrors.push(
      `채널 알림 실패: ${
        error instanceof Error ? error.message : "텔레그램 메시지 전송에 실패했습니다."
      }`,
    );
  }

  if (site.user_id) {
    const { data: subscription, error: subscriptionError } = await supabase
      .from("telegram_subscriptions")
      .select("chat_id")
      .eq("user_id", site.user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!subscriptionError && subscription) {
      try {
        await sendTelegramMessage(
          (subscription as TelegramSubscriptionRow).chat_id,
          buildApprovalMessage(site as SiteRow),
        );
      } catch (error) {
        deliveryErrors.push(
          `등록자 알림 실패: ${
            error instanceof Error
              ? error.message
              : "텔레그램 메시지 전송에 실패했습니다."
          }`,
        );
      }
    }
  }

  if (deliveryErrors.length > 0) {
    return NextResponse.json(
      {
        error: deliveryErrors.join(" / "),
      },
      { status: 502 },
    );
  }

  await supabase
    .from("sites")
    .update({
      telegram_notify_enabled: true,
      telegram_notified_at: new Date().toISOString(),
    })
    .eq("id", site.id);

  return NextResponse.json({ ok: true });
}
