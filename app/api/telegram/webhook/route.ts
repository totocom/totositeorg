import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type TelegramUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramMessage = {
  text?: string;
  chat?: {
    id: number;
  };
  from?: TelegramUser;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

type SiteRow = {
  id: string;
  name: string;
  slug: string | null;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, serviceRoleKey };
}

function getTelegramToken() {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").replace(/^bot/i, "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

function getSignupCode(payload: string) {
  const match = payload.match(/^signup_([A-Z0-9]{8})$/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function getStartPayload(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? "";
}

function getStopSlug(text: string) {
  const match = text.trim().match(/^\/stop(?:@\w+)?\s+([a-z0-9]+(?:-[a-z0-9]+)*)$/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

async function sendTelegramMessage(chatId: string, text: string, parseMode?: "HTML") {
  const token = getTelegramToken();

  if (!token) {
    return;
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");

  if (webhookSecret && secretHeader !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  const chatId = message?.chat?.id;
  const from = message?.from;
  const text = message?.text ?? "";
  const payload = getStartPayload(text);
  const stopSlug = getStopSlug(text);

  if (!chatId || !from || (!payload && !stopSlug)) {
    return NextResponse.json({ ok: true });
  }

  const signupCode = getSignupCode(payload);
  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (stopSlug) {
    const { data: telegramSubscription } = await supabase
      .from("telegram_subscriptions")
      .select("user_id")
      .eq("chat_id", String(chatId))
      .eq("is_active", true)
      .maybeSingle<{ user_id: string }>();

    if (!telegramSubscription) {
      await sendTelegramMessage(
        String(chatId),
        "연결된 계정이 없습니다. 사이트에서 로그인 후 텔레그램을 먼저 연결해주세요.",
      );
      return NextResponse.json({ ok: true });
    }

    const { data: site } = await supabase
      .from("sites")
      .select("id, name, slug")
      .eq("slug", stopSlug)
      .maybeSingle<SiteRow>();

    if (!site) {
      await sendTelegramMessage(
        String(chatId),
        "구독 해제할 사이트를 찾지 못했습니다. 명령어의 사이트 주소를 확인해주세요.",
      );
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("site_telegram_subscriptions")
      .delete()
      .eq("site_id", site.id)
      .eq("user_id", telegramSubscription.user_id);

    if (error) {
      await sendTelegramMessage(
        String(chatId),
        "구독 해제에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await sendTelegramMessage(
      String(chatId),
      getUnsubscriptionMessage(site),
      "HTML",
    );

    return NextResponse.json({ ok: true });
  }

  if (signupCode) {
    const { error } = await supabase.from("telegram_signup_codes").upsert(
      {
        verification_code: signupCode,
        chat_id: String(chatId),
        username: from.username ?? null,
        first_name: from.first_name ?? null,
        last_name: from.last_name ?? null,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        consumed_at: null,
      },
      { onConflict: "verification_code" },
    );

    if (error) {
      await sendTelegramMessage(
        String(chatId),
        "텔레그램 인증 정보를 저장하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
      );

      return NextResponse.json(
        {
          ok: false,
          error: "telegram_signup_save_failed",
          details: error.message,
        },
        { status: 500 },
      );
    }

    await sendTelegramMessage(
      String(chatId),
      "텔레그램 인증이 확인되었습니다. 회원가입 페이지로 돌아가 인증 확인 버튼을 눌러주세요.",
    );

    return NextResponse.json({ ok: true });
  }

  if (!isUuid(payload)) {
    await sendTelegramMessage(
      String(chatId),
      "사이트에 로그인한 뒤 내 계정 페이지의 텔레그램 봇 시작하기 버튼으로 다시 연결해주세요.",
    );
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("telegram_subscriptions").upsert(
    {
      user_id: payload,
      chat_id: String(chatId),
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      is_active: true,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    await sendTelegramMessage(
      String(chatId),
      "텔레그램 알림 연결 정보를 저장하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
    );

    return NextResponse.json(
      {
        ok: false,
        error: "telegram_subscription_save_failed",
        details: error.message,
      },
      { status: 500 },
    );
  }

  await sendTelegramMessage(
    String(chatId),
    "텔레그램 알림 연결이 완료되었습니다. 사이트 제보가 승인되면 이 대화로 알림을 보내드립니다.",
  );

  return NextResponse.json({ ok: true });
}
