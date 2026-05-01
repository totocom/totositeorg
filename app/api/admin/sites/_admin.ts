import { createClient } from "@supabase/supabase-js";

export type AdminSession = {
  userId: string;
  email: string;
};

export function getBearerToken(request: Request) {
  return (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

export function getAuthedClient(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export function getServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseEnv();

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getAdminSession(token: string) {
  if (!token) return null;

  const supabase = getAuthedClient(token);
  const { data: userResult, error: userError } =
    await supabase.auth.getUser(token);
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
  } satisfies AdminSession;
}
