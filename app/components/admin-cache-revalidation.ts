import { supabase } from "@/lib/supabase/client";

export async function revalidatePublicSiteCache() {
  const { data: sessionResult } = await supabase.auth.getSession();
  const accessToken = sessionResult.session?.access_token;

  if (!accessToken) {
    return;
  }

  await fetch("/api/admin/revalidate-public-sites", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => null);
}
