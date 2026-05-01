import { NextResponse } from "next/server";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";
import {
  approveObservationDescription,
  type ApproveObservationDescriptionSiteUpdate,
  type ApproveObservationDescriptionSnapshotUpdate,
  type ObservationDescriptionSnapshot,
} from "@/app/data/site-observation-description";

export const runtime = "nodejs";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    siteId?: unknown;
    snapshotId?: unknown;
    description?: unknown;
  } | null;
  const action = body?.action === "reject" ? "reject" : "apply";
  const siteId = normalizeString(body?.siteId);
  const snapshotId = normalizeString(body?.snapshotId);
  const description = normalizeString(body?.description);

  if (!siteId || !snapshotId) {
    return NextResponse.json(
      { error: "사이트 ID와 snapshot ID가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();

  if (action === "reject") {
    const { error } = await supabase
      .from("site_crawl_snapshots")
      .update({
        snapshot_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId)
      .eq("site_id", siteId);

    if (error) {
      return NextResponse.json(
        { error: "관측 snapshot을 반려하지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  const result = await approveObservationDescription({
    adminSession,
    siteId,
    body: {
      snapshot_id: snapshotId,
      final_description_md: description,
    },
    getSite: async (targetSiteId) => {
      const { data, error } = await supabase
        .from("sites")
        .select("id, name, url, description, slug")
        .eq("id", targetSiteId)
        .maybeSingle();

      if (error) {
        return {
          site: null,
          error: "사이트 정보를 조회하지 못했습니다.",
        };
      }

      const row = data as Record<string, unknown> | null;

      return {
        site: row
          ? {
              id: String(row.id),
              name: typeof row.name === "string" ? row.name : "",
              url: typeof row.url === "string" ? row.url : null,
              description:
                typeof row.description === "string" ? row.description : "",
              slug: typeof row.slug === "string" ? row.slug : null,
            }
          : null,
      };
    },
    getSnapshot: async (targetSnapshotId) => {
      const { data, error } = await supabase
        .from("site_crawl_snapshots")
        .select(
          [
            "id",
            "site_id",
            "source_url",
            "final_url",
            "collected_at",
            "page_title",
            "meta_description",
            "h1",
            "observed_menu_labels",
            "observed_account_features",
            "observed_betting_features",
            "observed_payment_flags",
            "observed_notice_items",
            "observed_event_items",
            "observed_footer_text",
            "observed_badges",
            "image_candidates_json",
            "promotional_flags_json",
            "excluded_terms_json",
            "html_sha256",
            "visible_text_sha256",
            "snapshot_status",
            "ai_observation_summary_json",
          ].join(", "),
        )
        .eq("id", targetSnapshotId)
        .maybeSingle();

      if (error) {
        return {
          snapshot: null,
          error: "관측 snapshot을 조회하지 못했습니다.",
        };
      }

      const row = data as Record<string, unknown> | null;

      return {
        snapshot: row
          ? ({
              id: String(row.id),
              site_id: String(row.site_id),
              source_url:
                typeof row.source_url === "string" ? row.source_url : null,
              final_url:
                typeof row.final_url === "string" ? row.final_url : null,
              collected_at:
                typeof row.collected_at === "string"
                  ? row.collected_at
                  : null,
              page_title:
                typeof row.page_title === "string" ? row.page_title : null,
              meta_description:
                typeof row.meta_description === "string"
                  ? row.meta_description
                  : null,
              h1: typeof row.h1 === "string" ? row.h1 : null,
              observed_menu_labels: row.observed_menu_labels,
              observed_account_features: row.observed_account_features,
              observed_betting_features: row.observed_betting_features,
              observed_payment_flags: row.observed_payment_flags,
              observed_notice_items: row.observed_notice_items,
              observed_event_items: row.observed_event_items,
              observed_footer_text: row.observed_footer_text,
              observed_badges: row.observed_badges,
              image_candidates_json: row.image_candidates_json,
              promotional_flags_json: row.promotional_flags_json,
              excluded_terms_json: row.excluded_terms_json,
              html_sha256:
                typeof row.html_sha256 === "string" ? row.html_sha256 : null,
              visible_text_sha256:
                typeof row.visible_text_sha256 === "string"
                  ? row.visible_text_sha256
                  : null,
              snapshot_status:
                typeof row.snapshot_status === "string"
                  ? row.snapshot_status
                  : undefined,
              ai_observation_summary_json: row.ai_observation_summary_json,
            } satisfies ObservationDescriptionSnapshot)
          : null,
      };
    },
    updateSiteDescription: async (
      targetSiteId,
      values: ApproveObservationDescriptionSiteUpdate,
    ) => {
      const { error } = await supabase
        .from("sites")
        .update(values)
        .eq("id", targetSiteId);

      return {
        error: error?.message,
      };
    },
    approveSnapshot: async (
      targetSnapshotId,
      values: ApproveObservationDescriptionSnapshotUpdate,
    ) => {
      const { error } = await supabase
        .from("site_crawl_snapshots")
        .update(values)
        .eq("id", targetSnapshotId)
        .eq("site_id", siteId);

      return {
        error: error?.message,
      };
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}
