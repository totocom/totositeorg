import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 필요합니다.");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.");
}

declare global {
  var __siteReviewSupabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__siteReviewSupabaseClient ??
  createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== "production") {
  globalThis.__siteReviewSupabaseClient = supabase;
}

export async function testSupabaseConnection() {
  const { error } = await supabase.from("sites").select("id").limit(1);

  return {
    ok: !error,
    errorMessage: error?.message ?? null,
  };
}
