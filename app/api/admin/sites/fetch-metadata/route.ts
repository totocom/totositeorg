import { lookup } from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type MetadataResponse = {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  faviconUrl: string;
  finalUrl: string;
  statusCode: number;
};

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
  const faviconUrl = absolutizeUrl(
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

  return {
    title,
    description,
    siteName,
    imageUrl,
    faviconUrl,
    finalUrl,
    statusCode,
  };
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(targetUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 metadata-fetcher",
      },
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(
        { error: "HTML 페이지에서만 도메인 정보를 가져올 수 있습니다." },
        { status: 415 },
      );
    }

    const html = (await response.text()).slice(0, 500_000);
    return NextResponse.json(
      extractMetadata(html, response.url, response.status),
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "사이트 응답 시간이 초과되었습니다."
        : error instanceof Error
          ? error.message
          : "도메인 정보를 가져오지 못했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
