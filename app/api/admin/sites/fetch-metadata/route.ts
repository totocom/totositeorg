import { lookup } from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

type MetadataResponse = {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  faviconUrl: string;
  finalUrl: string;
  statusCode: number;
  source?: "metadata-api" | "direct";
};

type ExternalMetadataResponse = Partial<{
  ok: unknown;
  title: unknown;
  description: unknown;
  siteName: unknown;
  site_name: unknown;
  image: unknown;
  imageUrl: unknown;
  image_url: unknown;
  ogImage: unknown;
  faviconUrl: unknown;
  favicon_url: unknown;
  canonical: unknown;
  finalUrl: unknown;
  final_url: unknown;
  url: unknown;
  statusCode: unknown;
  status_code: unknown;
  status: unknown;
  error: unknown;
}>;

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getStorageEnv() {
  const { supabaseUrl } = getEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "site-screenshots";

  if (!serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, serviceRoleKey, bucket };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const numberValue = Number(value);

      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }

  return 0;
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return true;
}

async function assertPublicHost(url: URL) {
  if (url.hostname === "localhost") {
    throw new Error("로컬 주소는 조회할 수 없습니다.");
  }

  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("내부 네트워크 주소는 조회할 수 없습니다.");
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1]) : "";
}

function getMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const contentFirst = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`,
    "i",
  );

  return getTagContent(html, propertyFirst) || getTagContent(html, contentFirst);
}

function absolutizeUrl(value: string, baseUrl: string) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function getDefaultFaviconUrl(baseUrl: string) {
  try {
    return new URL("/favicon.ico", baseUrl).toString();
  } catch {
    return "";
  }
}

function extractMetadata(html: string, finalUrl: string, statusCode: number): MetadataResponse {
  const title =
    getMetaContent(html, "og:title") ||
    getMetaContent(html, "twitter:title") ||
    getTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    getMetaContent(html, "description") ||
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "twitter:description");
  const siteName = getMetaContent(html, "og:site_name");
  const imageUrl = absolutizeUrl(
    getMetaContent(html, "og:image") || getMetaContent(html, "twitter:image"),
    finalUrl,
  );
  const linkedFaviconUrl = absolutizeUrl(
    getTagContent(
      html,
      /<link\s+[^>]*rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']*)["'][^>]*>/i,
    ) ||
      getTagContent(
        html,
        /<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*>/i,
      ),
    finalUrl,
  );
  const faviconUrl = linkedFaviconUrl || getDefaultFaviconUrl(finalUrl);

  return {
    title,
    description,
    siteName,
    imageUrl,
    faviconUrl,
    finalUrl,
    statusCode,
    source: "direct",
  };
}

function normalizeExternalMetadata(
  result: ExternalMetadataResponse,
  fallbackUrl: string,
): MetadataResponse | null {
  if (result.ok === false) {
    return null;
  }

  const title = firstString(result.title);
  const description = firstString(result.description);
  const siteName = firstString(result.siteName, result.site_name);
  const finalUrl =
    firstString(result.canonical, result.finalUrl, result.final_url, result.url) ||
    fallbackUrl;
  const imageUrl = absolutizeUrl(
    firstString(result.image, result.imageUrl, result.image_url, result.ogImage),
    finalUrl,
  );
  const faviconUrl = absolutizeUrl(
    firstString(result.faviconUrl, result.favicon_url),
    finalUrl,
  ) || getDefaultFaviconUrl(finalUrl);
  const statusCode =
    firstNumber(result.statusCode, result.status_code, result.status) || 200;

  if (isBlockedMetadata(statusCode, title, description)) {
    return null;
  }

  if (!title && !description && !siteName && !imageUrl && !faviconUrl) {
    return null;
  }

  return {
    title,
    description,
    siteName,
    imageUrl,
    faviconUrl,
    finalUrl,
    statusCode,
    source: "metadata-api",
  };
}

function isBlockedMetadata(
  statusCode: number,
  title: string,
  description: string,
) {
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = description.toLowerCase();

  return (
    statusCode >= 400 ||
    normalizedTitle.includes("attention required") ||
    normalizedTitle.includes("cloudflare") ||
    normalizedDescription.includes("cloudflare")
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getFetchErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "사이트 응답 시간이 초과되었습니다.";
  }

  if (error instanceof TypeError && error.message === "fetch failed") {
    const cause = error.cause;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "";

    if (code === "ENOTFOUND") {
      return "사이트 도메인의 DNS를 찾지 못했습니다.";
    }

    if (code === "ECONNRESET") {
      return "상대 사이트가 연결을 중간에 종료했습니다.";
    }

    if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
      return "상대 사이트 연결 시간이 초과되었습니다.";
    }

    if (code) {
      return `사이트에 서버에서 연결하지 못했습니다. (${code})`;
    }

    return "사이트에 서버에서 연결하지 못했습니다. 상대 사이트가 서버 요청을 차단했거나 SSL/네트워크 연결이 실패했습니다.";
  }

  return error instanceof Error
    ? error.message
    : "도메인 정보를 가져오지 못했습니다.";
}

function isLikelyIco(contentType: string, url: URL) {
  return (
    contentType.includes("image/x-icon") ||
    contentType.includes("image/vnd.microsoft.icon") ||
    url.pathname.toLowerCase().endsWith(".ico")
  );
}

async function uploadStoredFavicon(
  storageEnv: NonNullable<ReturnType<typeof getStorageEnv>>,
  bytes: Uint8Array | Buffer,
  extension: "webp" | "ico",
  contentType: string,
) {
  const supabase = createClient(storageEnv.supabaseUrl, storageEnv.serviceRoleKey);
  const contentTypes =
    extension === "ico"
      ? Array.from(
          new Set([
            contentType,
            "image/vnd.microsoft.icon",
            "image/x-icon",
          ]),
        )
      : [contentType];

  for (const uploadContentType of contentTypes) {
    const filePath = `favicons/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(storageEnv.bucket)
      .upload(filePath, bytes, {
        contentType: uploadContentType,
        upsert: false,
      });

    if (!error) {
      const { data } = supabase.storage.from(storageEnv.bucket).getPublicUrl(filePath);
      return data.publicUrl;
    }
  }

  return "";
}

async function storeFaviconUrl(faviconUrl: string) {
  const storageEnv = getStorageEnv();
  const parsedUrl = normalizeUrl(faviconUrl);

  if (!storageEnv || !parsedUrl) return "";

  try {
    await assertPublicHost(parsedUrl);

    const response = await fetchWithTimeout(
      parsedUrl.toString(),
      {
        redirect: "follow",
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/x-icon,image/*,*/*;q=0.8",
          "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          referer: `${parsedUrl.origin}/`,
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      },
      10_000,
    );

    if (!response.ok) return "";

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
      return "";
    }

    const imageBytes = new Uint8Array(await response.arrayBuffer());

    if (imageBytes.byteLength === 0 || imageBytes.byteLength > 2 * 1024 * 1024) {
      return "";
    }

    try {
      const webpBytes = await sharp(imageBytes)
        .resize(96, 96, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();

      return await uploadStoredFavicon(
        storageEnv,
        webpBytes,
        "webp",
        "image/webp",
      );
    } catch {
      if (!isLikelyIco(contentType, parsedUrl)) {
        return "";
      }

      return await uploadStoredFavicon(
        storageEnv,
        imageBytes,
        "ico",
        contentType.includes("image") ? contentType : "image/x-icon",
      );
    }
  } catch {
    return "";
  }
}

async function localizeMetadataFavicon(metadata: MetadataResponse) {
  const storedFaviconUrl = await storeFaviconUrl(metadata.faviconUrl);

  return {
    ...metadata,
    faviconUrl: storedFaviconUrl || metadata.faviconUrl,
  };
}

async function fetchMetadataWithProxy(targetUrl: string) {
  const metadataApiUrl = process.env.METADATA_API_URL;
  const metadataApiKey =
    process.env.METADATA_API_KEY || process.env.CAPTURE_API_KEY;

  if (!metadataApiUrl || !metadataApiKey) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      metadataApiUrl,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": metadataApiKey,
        },
        body: JSON.stringify({ url: targetUrl }),
      },
      20_000,
    );
    const result = (await response.json().catch(() => null)) as
      | ExternalMetadataResponse
      | null;

    if (!response.ok || !result) {
      return null;
    }

    return normalizeExternalMetadata(result, targetUrl);
  } catch {
    return null;
  }
}

async function getAdminUser(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token || !(await getAdminUser(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const targetUrl = normalizeUrl(body?.url);

  if (!targetUrl) {
    return NextResponse.json(
      { error: "http:// 또는 https:// URL을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    await assertPublicHost(targetUrl);

    const proxyMetadata = await fetchMetadataWithProxy(targetUrl.toString());

    if (proxyMetadata) {
      return NextResponse.json(await localizeMetadataFavicon(proxyMetadata), { status: 200 });
    }

    const response = await fetchWithTimeout(
      targetUrl.toString(),
      {
        redirect: "follow",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Mozilla/5.0 metadata-fetcher",
        },
      },
      8000,
    );

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(
        {
          error:
            "자동으로 메타정보를 가져오지 못했습니다. 사이트명, 설명, 이미지는 수동으로 입력하거나 페이지 캡처를 사용해주세요.",
        },
        { status: 415 },
      );
    }

    const html = (await response.text()).slice(0, 500_000);
    const metadata = extractMetadata(html, response.url, response.status);

    if (isBlockedMetadata(metadata.statusCode, metadata.title, metadata.description)) {
      return NextResponse.json(
        {
          error:
            "보안 페이지 또는 차단 페이지가 감지되어 메타정보를 자동 반영하지 않았습니다. 사이트명, 설명, 이미지는 수동으로 입력하거나 페이지 캡처를 사용해주세요.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await localizeMetadataFavicon(metadata),
      { status: 200 },
    );
  } catch (error) {
    const message = getFetchErrorMessage(error);

    return NextResponse.json(
      {
        error: `${message} 사이트명, 설명, 이미지는 수동으로 입력하거나 페이지 캡처를 사용해주세요.`,
      },
      { status: 400 },
    );
  }
}
