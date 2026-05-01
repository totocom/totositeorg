import { siteUrl } from "../../lib/config";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isAllowedStoredImageUrl(value?: string | null) {
  const imageUrl = normalizeString(value);

  if (!imageUrl) return false;
  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) return true;

  try {
    const parsedUrl = new URL(imageUrl);

    if (
      parsedUrl.protocol !== "https:" &&
      !isLocalHostname(parsedUrl.hostname)
    ) {
      return false;
    }

    const siteHostname = getHostname(siteUrl);
    const supabaseHostname = getHostname(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    );

    if (siteHostname && parsedUrl.hostname === siteHostname) {
      return true;
    }

    if (!parsedUrl.pathname.includes("/storage/v1/object/public/")) {
      return false;
    }

    if (supabaseHostname) {
      return parsedUrl.hostname === supabaseHostname;
    }

    return parsedUrl.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function getAllowedStoredImageUrl(value?: string | null) {
  const imageUrl = normalizeString(value);
  if (!isAllowedStoredImageUrl(imageUrl)) return null;

  if (imageUrl.startsWith("/") && !imageUrl.startsWith("//")) {
    return imageUrl;
  }

  try {
    return new URL(imageUrl).toString();
  } catch {
    return null;
  }
}
