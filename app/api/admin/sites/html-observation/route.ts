import { NextResponse } from "next/server";
import { extractSiteHtmlObservation } from "@/app/data/site-html-observation";
import {
  getAdminSession,
  getBearerToken,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

const maxHtmlInputLength = 2_000_000;
const htmlInputTypes = new Set(["source_html", "rendered_html", "unknown"]);

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    html?: unknown;
    sourceUrl?: unknown;
    collectedAt?: unknown;
    htmlInputType?: unknown;
  } | null;
  const html = typeof body?.html === "string" ? body.html : "";
  const sourceUrl = normalizeUrl(body?.sourceUrl);
  const htmlInputType =
    typeof body?.htmlInputType === "string" &&
    htmlInputTypes.has(body.htmlInputType)
      ? body.htmlInputType
      : "unknown";
  const collectedAt =
    typeof body?.collectedAt === "string" && body.collectedAt.trim()
      ? new Date(body.collectedAt).toISOString()
      : new Date().toISOString();

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "원본 URL은 http:// 또는 https:// 형식이어야 합니다." },
      { status: 400 },
    );
  }

  if (html.trim().length < 20) {
    return NextResponse.json(
      { error: "분석할 HTML 소스를 붙여넣어주세요." },
      { status: 400 },
    );
  }

  if (html.length > maxHtmlInputLength) {
    return NextResponse.json(
      { error: "HTML 입력은 2MB 이하로 줄여주세요." },
      { status: 413 },
    );
  }

  const observation = extractSiteHtmlObservation({
    html,
    sourceUrl,
  });

  return NextResponse.json({
    observation,
    sourceUrl,
    finalUrl: sourceUrl,
    domain: getDomain(sourceUrl),
    collectedAt,
    htmlInputType,
  });
}
