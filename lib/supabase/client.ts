import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fallbackSupabaseUrl = "https://example.supabase.co";
const fallbackSupabaseAnonKey = "missing-supabase-anon-key";

function isValidHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const resolvedSupabaseUrl: string = isValidHttpUrl(supabaseUrl)
  ? supabaseUrl!
  : fallbackSupabaseUrl;
const resolvedSupabaseAnonKey: string =
  supabaseAnonKey || fallbackSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(supabaseUrl) && supabaseAnonKey,
);

declare global {
  var __siteReviewSupabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__siteReviewSupabaseClient ??
  createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

if (process.env.NODE_ENV !== "production") {
  globalThis.__siteReviewSupabaseClient = supabase;
}

export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      errorMessage:
        "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.",
    };
  }

  const { error } = await supabase.from("sites").select("id").limit(1);

  return {
    ok: !error,
    errorMessage: error?.message ?? null,
  };
}
