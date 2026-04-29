import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/config";
import { getApprovedContentChannelId } from "@/lib/telegram";

export const runtime = "nodejs";

type ContentType = "review" | "scam_report";

type ContentRow = {
  id: string;
  site_id: string;
  user_id: string | null;
  damage_amount?: number | null;
  damage_amount_unknown?: boolean | null;
};

type SiteRow = {
  id: string;
  name: string;
  slug: string | null;
  url: string;
};

type TelegramSubscriptionRow = {
  user_id?: string;
  chat_id: string;
};

type SiteTelegramSubscriptionRow = {
  user_id: string;
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

  const { data: userResult, error: userError } =
    await supabase.auth.getUser(token);
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

function getSiteContentUrl(type: ContentType, site: SiteRow) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  const hash = type === "scam_report" ? "scam-reports" : "reviews";

  if (site.slug) {
    return `${baseUrl}/sites/${site.slug}#${hash}`;
  }

  return site.url;
}

function getApprovedMessage(type: ContentType, site: SiteRow) {
  const label = type === "scam_report" ? "먹튀 제보" : "만족도 평가";
  const contentUrl = getSiteContentUrl(type, site);

  return [
    `🎉 ${site.name} ${label} 승인 완료`,
    "",
    "게시물이 승인되었습니다.",
    "지금 바로 확인하실 수 있습니다.",
    "",
    `바로가기: ${contentUrl}`,
  ].join("\n");
}

function formatDamageAmount(content: ContentRow) {
  if (content.damage_amount_unknown || content.damage_amount == null) {
    return "미상";
  }

  return `${Number(content.damage_amount).toLocaleString("ko-KR")}원`;
}

function getScamReportApprovedMessage(site: SiteRow, content: ContentRow) {
  const contentUrl = getSiteContentUrl("scam_report", site);

  return [
    "🚨 먹튀 피해 제보 승인 안내",
    "",
    "🏷 사이트명",
    site.name,
    "",
    "💰 피해금액",
    formatDamageAmount(content),
    "",
    "해당 사이트의 피해 제보가 승인되어 공개되었습니다.",
    "새로 등록된 제보 내용을 확인해보세요.",
    "",
    "🔗 바로가기",
    contentUrl,
  ].join("\n");
}

function getChannelApprovedMessage(
  type: ContentType,
  site: SiteRow,
  content: ContentRow,
) {
  if (type === "scam_report") {
    return getScamReportApprovedMessage(site, content);
  }

  const contentUrl = getSiteContentUrl(type, site);

  return [
    `${site.name} 만족도 평가가 승인되었습니다.`,
    "",
    "새로 공개된 게시물을 확인해보세요.",
    "",
    `바로가기: ${contentUrl}`,
  ].join("\n");
}

function getSiteSubscriberMessage(
  type: ContentType,
  site: SiteRow,
  content: ContentRow,
) {
  if (type === "scam_report") {
    return getScamReportApprovedMessage(site, content);
  }

  const contentUrl = getSiteContentUrl(type, site);

  return [
    `🔔 ${site.name} 새 만족도 평가 공개`,
    "",
    "구독한 사이트에 새 게시물이 승인되어 공개되었습니다.",
    "",
    `바로가기: ${contentUrl}`,
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
      .eq("status", "approved")
      .maybeSingle<ContentRow>();

    return error ? null : data;
  }

  const { data, error } = await supabase
    .from("scam_reports")
    .select("id, site_id, user_id, damage_amount, damage_amount_unknown")
    .eq("id", contentId)
    .eq("review_status", "approved")
    .eq("is_published", true)
    .maybeSingle<ContentRow>();

  return error ? null : data;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !(await getIsAdmin(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
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

  if (!content) {
    return NextResponse.json(
      { error: "승인된 게시물을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, name, slug, url")
    .eq("id", content.site_id)
    .maybeSingle<SiteRow>();

  if (siteError || !site) {
    return NextResponse.json(
      { error: "사이트 정보를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const deliveryErrors: string[] = [];

  try {
    await sendTelegramMessage(
      getApprovedContentChannelId(),
      getChannelApprovedMessage(type, site, content),
    );
  } catch (error) {
    deliveryErrors.push(
      `채널 알림 실패: ${
        error instanceof Error ? error.message : "텔레그램 메시지 전송에 실패했습니다."
      }`,
    );
  }

  if (content.user_id) {
    const { data: subscription, error: subscriptionError } = await supabase
      .from("telegram_subscriptions")
      .select("chat_id")
      .eq("user_id", content.user_id)
      .eq("is_active", true)
      .maybeSingle<TelegramSubscriptionRow>();

    if (!subscriptionError && subscription) {
      try {
        await sendTelegramMessage(
          subscription.chat_id,
          getApprovedMessage(type, site),
        );
      } catch (error) {
        deliveryErrors.push(
          `작성자 알림 실패: ${
            error instanceof Error
              ? error.message
              : "텔레그램 메시지 전송에 실패했습니다."
          }`,
        );
      }
    }
  }

  const { data: siteSubscriptions, error: siteSubscriptionError } = await supabase
    .from("site_telegram_subscriptions")
    .select("user_id")
    .eq("site_id", site.id)
    .returns<SiteTelegramSubscriptionRow[]>();

  if (siteSubscriptionError) {
    deliveryErrors.push(`구독자 조회 실패: ${siteSubscriptionError.message}`);
  } else {
    const subscriberUserIds = Array.from(
      new Set(
        (siteSubscriptions ?? [])
          .map((subscription) => subscription.user_id)
          .filter((userId) => userId && userId !== content.user_id),
      ),
    );

    if (subscriberUserIds.length > 0) {
      const { data: subscriberChats, error: subscriberChatError } = await supabase
        .from("telegram_subscriptions")
        .select("user_id, chat_id")
        .in("user_id", subscriberUserIds)
        .eq("is_active", true)
        .returns<TelegramSubscriptionRow[]>();

      if (subscriberChatError) {
        deliveryErrors.push(`구독자 텔레그램 조회 실패: ${subscriberChatError.message}`);
      } else {
        const subscriberMessage = getSiteSubscriberMessage(type, site, content);

        for (const subscriberChat of subscriberChats ?? []) {
          try {
            await sendTelegramMessage(subscriberChat.chat_id, subscriberMessage);
          } catch (error) {
            deliveryErrors.push(
              `구독자 알림 실패: ${
                error instanceof Error
                  ? error.message
                  : "텔레그램 메시지 전송에 실패했습니다."
              }`,
            );
          }
        }
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

  return NextResponse.json({ ok: true });
}
