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

function getStartPayload(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() ?? "";
}

async function sendTelegramMessage(chatId: string, text: string) {
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

  if (!chatId || !from || !payload) {
    return NextResponse.json({ ok: true });
  }

  if (!isUuid(payload)) {
    await sendTelegramMessage(
      String(chatId),
      "사이트에 로그인한 뒤 내 계정 페이지의 텔레그램 봇 시작하기 버튼으로 다시 연결해주세요.",
    );
    return NextResponse.json({ ok: true });
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
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

  if (!error) {
    await sendTelegramMessage(
      String(chatId),
      "텔레그램 알림 연결이 완료되었습니다. 사이트 제보가 승인되면 이 대화로 알림을 보내드립니다.",
    );
  }

  return NextResponse.json({ ok: true });
}
