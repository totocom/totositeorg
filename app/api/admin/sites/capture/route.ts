import { lookup } from "node:dns/promises";
import net from "node:net";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSiteScreenshotUrl } from "@/app/data/site-screenshot";

export const runtime = "nodejs";

type CaptureResponse = {
  imageUrl?: unknown;
};

const PRIVATE_IPV4_RANGES = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
];

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getStorageEnv() {
  const { supabaseUrl } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "site-screenshots";

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.");
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
    throw new Error("로컬 주소는 캡처할 수 없습니다.");
  }

  const records = await lookup(url.hostname, { all: true });
  if (
    records.length === 0 ||
    records.some((record) => isPrivateAddress(record.address))
  ) {
    throw new Error("내부 네트워크 주소는 캡처할 수 없습니다.");
  }
}

async function getAdminUser(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function captureWithLightsail(targetUrl: string) {
  const captureApiUrl = process.env.CAPTURE_API_URL;
  const captureApiKey = process.env.CAPTURE_API_KEY;

  if (!captureApiUrl || !captureApiKey) {
    throw new Error("Lightsail 캡처 API 환경변수가 설정되지 않았습니다.");
  }

  const response = await fetchWithTimeout(
    captureApiUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": captureApiKey,
      },
      body: JSON.stringify({ url: targetUrl }),
    },
    45_000,
  );
  const result = (await response.json().catch(() => null)) as CaptureResponse | null;

  if (!response.ok || typeof result?.imageUrl !== "string") {
    throw new Error("Lightsail 캡처 API 응답이 올바르지 않습니다.");
  }

  return result.imageUrl;
}

async function downloadImage(imageUrl: string) {
  const parsedUrl = normalizeUrl(imageUrl);
  if (!parsedUrl) {
    throw new Error("캡처 이미지 URL이 올바르지 않습니다.");
  }

  const response = await fetchWithTimeout(parsedUrl.toString(), {}, 30_000);
  if (!response.ok) {
    throw new Error("캡처 이미지를 다운로드하지 못했습니다.");
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function uploadScreenshot(imageBytes: Uint8Array) {
  const { supabaseUrl, serviceRoleKey, bucket } = getStorageEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const filePath = `captures/${randomUUID()}.png`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, imageBytes, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
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

    let temporaryImageUrl = "";
    let source: "lightsail" | "mshots" = "lightsail";

    try {
      temporaryImageUrl = await captureWithLightsail(targetUrl.toString());
    } catch {
      source = "mshots";
      temporaryImageUrl = buildSiteScreenshotUrl(targetUrl.toString());
    }

    const imageBytes = await downloadImage(temporaryImageUrl);
    const screenshotUrl = await uploadScreenshot(imageBytes);

    return NextResponse.json({
      ok: true,
      screenshotUrl,
      source,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "사이트 캡처 중 문제가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
