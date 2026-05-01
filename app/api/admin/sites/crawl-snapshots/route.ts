import { NextResponse } from "next/server";
import type { SiteHtmlObservation } from "@/app/data/site-html-observation";
import { getAllowedStoredImageUrl } from "@/app/data/storage-image-url";
import {
  ensureObservationDisclosure,
  sanitizeObservationDescription,
} from "@/app/data/site-observation-description";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

type SaveSnapshotBody = {
  siteId?: unknown;
  sourceType?: unknown;
  htmlInputType?: unknown;
  sourceUrl?: unknown;
  finalUrl?: unknown;
  domain?: unknown;
  collectedAt?: unknown;
  observation?: unknown;
  aiDetailDescriptionMd?: unknown;
  aiObservationSummaryJson?: unknown;
  screenshotUrl?: unknown;
  screenshotThumbUrl?: unknown;
  faviconUrl?: unknown;
  logoUrl?: unknown;
  snapshotStatus?: unknown;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value: unknown) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) return "";

  try {
    const url = new URL(normalizedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeStoredImageUrl(value: unknown) {
  return getAllowedStoredImageUrl(normalizeString(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeObservation(value: unknown) {
  return isRecord(value) ? (value as SiteHtmlObservation) : null;
}

function getSnapshotStatus(value: unknown) {
  const normalizedValue = normalizeString(value);
  return ["draft", "extracted", "ai_generated", "approved", "rejected"].includes(
    normalizedValue,
  )
    ? normalizedValue
    : "extracted";
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as SaveSnapshotBody | null;
  const siteId = normalizeString(body?.siteId);
  const sourceUrl = normalizeUrl(body?.sourceUrl);
  const finalUrl = normalizeUrl(body?.finalUrl) || sourceUrl;
  const observation = normalizeObservation(body?.observation);

  if (!siteId) {
    return NextResponse.json(
      { error: "snapshot을 저장할 사이트 ID가 필요합니다." },
      { status: 400 },
    );
  }

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "원본 URL은 http:// 또는 https:// 형식이어야 합니다." },
      { status: 400 },
    );
  }

  if (!observation) {
    return NextResponse.json(
      { error: "저장할 관측 정보가 없습니다." },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  const collectedAt =
    normalizeString(body?.collectedAt) || new Date().toISOString();
  const snapshotStatus = getSnapshotStatus(body?.snapshotStatus);
  const aiDetailDescriptionMd = normalizeString(body?.aiDetailDescriptionMd)
    ? sanitizeObservationDescription(
        ensureObservationDisclosure(normalizeString(body?.aiDetailDescriptionMd)),
      )
    : null;
  const { data: snapshot, error } = await supabase
    .from("site_crawl_snapshots")
    .insert({
      site_id: siteId,
      source_type: body?.sourceType === "crawler" ? "crawler" : "manual_html",
      html_input_type:
        body?.htmlInputType === "source_html" ||
        body?.htmlInputType === "rendered_html"
          ? body.htmlInputType
          : "unknown",
      source_url: sourceUrl,
      final_url: finalUrl,
      domain: normalizeString(body?.domain) || new URL(sourceUrl).hostname,
      page_title: observation.page_title,
      meta_description: observation.meta_description,
      h1: observation.h1,
      observed_menu_labels: observation.observed_menu_labels,
      observed_account_features: observation.observed_account_features,
      observed_betting_features: observation.observed_betting_features,
      observed_payment_flags: observation.observed_payment_flags,
      observed_notice_items: observation.observed_notice_items,
      observed_event_items: observation.observed_event_items,
      observed_footer_text: observation.observed_footer_text,
      observed_badges: observation.observed_badges,
      image_candidates_json: observation.image_candidates_json,
      favicon_candidates_json: observation.favicon_candidates_json,
      logo_candidates_json: observation.logo_candidates_json,
      promotional_flags_json: observation.promotional_flags_json,
      excluded_terms_json: observation.excluded_terms_json,
      screenshot_url: normalizeStoredImageUrl(body?.screenshotUrl),
      screenshot_thumb_url: normalizeStoredImageUrl(body?.screenshotThumbUrl),
      favicon_url: normalizeStoredImageUrl(body?.faviconUrl),
      logo_url: normalizeStoredImageUrl(body?.logoUrl),
      html_sha256: observation.html_sha256,
      visible_text_sha256: observation.visible_text_sha256,
      snapshot_status: snapshotStatus,
      ai_detail_description_md: aiDetailDescriptionMd,
      ai_observation_summary_json: isRecord(body?.aiObservationSummaryJson)
        ? body.aiObservationSummaryJson
        : { summary: observation.public_observation_summary },
      collected_at: collectedAt,
      created_by: adminSession.userId,
    })
    .select("id")
    .single();

  if (error || !snapshot) {
    return NextResponse.json(
      { error: error?.message ?? "관측 snapshot을 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  await supabase
    .from("sites")
    .update({
      latest_crawl_snapshot_id: snapshot.id,
      content_crawled_at: collectedAt,
    })
    .eq("id", siteId);

  return NextResponse.json({ snapshotId: snapshot.id });
}
