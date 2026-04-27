import { supabase } from "@/lib/supabase/client";

const adminStatusCache = new Map<
  string,
  Promise<{ isAdmin: boolean; error: Error | null }>
>();

export async function getIsAdminByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      isAdmin: false,
      error: null,
    };
  }

  const cachedResult = adminStatusCache.get(normalizedEmail);

  if (cachedResult) {
    return cachedResult;
  }

  const adminStatusPromise = fetchAdminStatus(normalizedEmail);
  adminStatusCache.set(normalizedEmail, adminStatusPromise);

  return adminStatusPromise;
}

async function fetchAdminStatus(email: string) {
  const { data: adminRow, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  return {
    isAdmin: Boolean(adminRow),
    error: error as Error | null,
  };
}
