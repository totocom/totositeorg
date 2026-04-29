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
  const filePath = `favicons/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(storageEnv.bucket)
    .upload(filePath, bytes, {
      contentType,
      upsert: false,
    });

  if (error) return "";

  const { data } = supabase.storage.from(storageEnv.bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

async function storeFaviconUrl(faviconUrl: string) {
  const storageEnv = getStorageEnv();
  const parsedUrl = normalizeUrl(faviconUrl);

  if (!storageEnv || !parsedUrl) return "";
  if (isStoredFaviconUrl(parsedUrl)) return parsedUrl.toString();

  try {
    await assertPublicHost(parsedUrl);

    const response = await fetchWithTimeout(
      parsedUrl.toString(),
      {
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/x-icon,image/*,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 favicon-fetcher",
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

  const storedFaviconUrl = await storeFaviconUrl(faviconUrl);

  if (!storedFaviconUrl) {
    return NextResponse.json(
      { error: "파비콘 파일을 저장소에 복사하지 못했습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ faviconUrl: storedFaviconUrl }, { status: 200 });
}
