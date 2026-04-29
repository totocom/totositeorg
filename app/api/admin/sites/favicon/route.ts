import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

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
    throw new Error("로컬 주소는 저장할 수 없습니다.");
  }

  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error("내부 네트워크 주소는 저장할 수 없습니다.");
  }
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
    return "파비콘 URL 응답 시간이 초과되었습니다.";
  }

  if (error instanceof TypeError && error.message === "fetch failed") {
    const cause = error.cause;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "";

    if (code === "ENOTFOUND") {
      return "파비콘 도메인의 DNS를 찾지 못했습니다.";
    }

    if (code === "ECONNRESET") {
      return "파비콘 서버가 연결을 중간에 종료했습니다.";
    }

    if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
      return "파비콘 서버 연결 시간이 초과되었습니다.";
    }

    if (code) {
      return `파비콘 URL에 서버에서 연결하지 못했습니다. (${code})`;
    }

    return "파비콘 URL에 서버에서 연결하지 못했습니다. 상대 사이트가 서버 요청을 차단했거나 SSL/네트워크 연결이 실패했습니다.";
  }

  return error instanceof Error
    ? error.message
    : "파비콘 파일을 저장소에 복사하지 못했습니다.";
}

function isLikelyIco(contentType: string, url: URL) {
  return (
    contentType.includes("image/x-icon") ||
    contentType.includes("image/vnd.microsoft.icon") ||
    url.pathname.toLowerCase().endsWith(".ico")
  );
}

function isStoredFaviconUrl(url: URL) {
  const storageEnv = getStorageEnv();
  if (!storageEnv) return false;

  const supabaseUrl = normalizeUrl(storageEnv.supabaseUrl);
  return (
    Boolean(supabaseUrl) &&
    url.hostname === supabaseUrl?.hostname &&
    url.pathname.includes(`/storage/v1/object/public/${storageEnv.bucket}/favicons/`)
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
  const errors: string[] = [];

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

    errors.push(error.message);
  }

  if (extension === "ico" && errors.some((message) => message.includes("mime type"))) {
    throw new Error(
      "Storage 버킷 허용 MIME 타입에 image/x-icon 또는 image/vnd.microsoft.icon을 추가해주세요.",
    );
  }

  throw new Error(`Storage 업로드에 실패했습니다. ${errors[0] ?? "알 수 없는 오류"}`);
}

async function storeFaviconUrl(faviconUrl: string) {
  const storageEnv = getStorageEnv();
  const parsedUrl = normalizeUrl(faviconUrl);

  if (!storageEnv) {
    throw new Error("Storage 저장 환경변수(SUPABASE_SERVICE_ROLE_KEY)를 확인해주세요.");
  }

  if (!parsedUrl) {
    throw new Error("http:// 또는 https:// 파비콘 URL을 입력해주세요.");
  }

  if (isStoredFaviconUrl(parsedUrl)) return parsedUrl.toString();

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

  if (!response.ok) {
    throw new Error(`파비콘 URL이 ${response.status} 응답을 반환했습니다.`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("image") && !contentType.includes("octet-stream")) {
    throw new Error(`파비콘 URL이 이미지가 아닌 응답(${contentType || "unknown"})을 반환했습니다.`);
  }

  const imageBytes = new Uint8Array(await response.arrayBuffer());

  if (imageBytes.byteLength === 0) {
    throw new Error("파비콘 파일이 비어 있습니다.");
  }

  if (imageBytes.byteLength > 2 * 1024 * 1024) {
    throw new Error("파비콘 파일 용량이 2MB를 초과했습니다.");
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
      throw new Error("파비콘 이미지를 WebP로 변환하지 못했습니다.");
    }

    return await uploadStoredFavicon(
      storageEnv,
      imageBytes,
      "ico",
      contentType.includes("image") ? contentType : "image/x-icon",
    );
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
  const faviconUrl = typeof body?.url === "string" ? body.url.trim() : "";

  if (!faviconUrl) {
    return NextResponse.json({ faviconUrl: "" }, { status: 200 });
  }

  if (!normalizeUrl(faviconUrl)) {
    return NextResponse.json(
      { error: "http:// 또는 https:// 파비콘 URL을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const storedFaviconUrl = await storeFaviconUrl(faviconUrl);
    return NextResponse.json({ faviconUrl: storedFaviconUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: getFetchErrorMessage(error),
      },
      { status: 400 },
    );
  }
}
