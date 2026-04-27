import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ProfileRow = {
  user_id: string;
  username: string;
  nickname: string;
  telegram_verified_at: string | null;
};

type TelegramSubscriptionRow = {
  user_id: string;
  username: string | null;
  is_active: boolean;
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

async function getAdminSession(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const email = userResult.user?.email?.toLowerCase();

  if (userError || !email || !userResult.user?.id) {
    return null;
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (adminError || !adminRow) {
    return null;
  }

  return {
    userId: userResult.user.id,
    email,
  };
}

function getBearerToken(request: Request) {
  return (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  const adminSession = token ? await getAdminSession(token) : null;

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const [usersResult, profilesResult, telegramResult, adminUsersResult] =
    await Promise.all([
      supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
      supabase
        .from("profiles")
        .select("user_id, username, nickname, telegram_verified_at"),
      supabase
        .from("telegram_subscriptions")
        .select("user_id, username, is_active"),
      supabase.from("admin_users").select("email"),
    ]);

  if (usersResult.error) {
    return NextResponse.json(
      { error: "회원 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  if (profilesResult.error || telegramResult.error || adminUsersResult.error) {
    return NextResponse.json(
      { error: "회원 부가 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const profiles = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );
  const telegramSubscriptions = new Map(
    ((telegramResult.data ?? []) as TelegramSubscriptionRow[]).map(
      (subscription) => [subscription.user_id, subscription],
    ),
  );
  const adminEmails = new Set(
    (adminUsersResult.data ?? []).map((adminUser) =>
      String(adminUser.email).toLowerCase(),
    ),
  );

  const users = usersResult.data.users.map((user) => {
    const profile = profiles.get(user.id);
    const telegramSubscription = telegramSubscriptions.get(user.id);
    const email = user.email?.toLowerCase() ?? "";

    return {
      id: user.id,
      email,
      username: profile?.username ?? "",
      nickname: profile?.nickname ?? "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      telegram_verified_at: profile?.telegram_verified_at ?? null,
      telegram_username: telegramSubscription?.username ?? null,
      telegram_is_active: telegramSubscription?.is_active ?? false,
      is_admin: adminEmails.has(email),
      is_current_user: user.id === adminSession.userId,
    };
  });

  users.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return NextResponse.json({ users });
}

export async function DELETE(request: Request) {
  const token = getBearerToken(request);
  const adminSession = token ? await getAdminSession(token) : null;

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
  } | null;
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json(
      { error: "삭제할 회원 ID가 필요합니다." },
      { status: 400 },
    );
  }

  if (userId === adminSession.userId) {
    return NextResponse.json(
      { error: "현재 로그인한 관리자 계정은 직접 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: targetUserResult } = await supabase.auth.admin.getUserById(userId);
  const targetEmail = targetUserResult.user?.email?.toLowerCase() ?? "";
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json(
      { error: "회원 삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  if (targetEmail) {
    await supabase.from("admin_users").delete().eq("email", targetEmail);
  }

  return NextResponse.json({ ok: true });
}
