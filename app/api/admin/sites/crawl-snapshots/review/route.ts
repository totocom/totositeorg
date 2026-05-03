import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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

function getAction(value: unknown) {
  if (value === "reject") return "reject";
  if (value === "approve_snapshot") return "approve_snapshot";
  if (value === "delete") return "delete";

  return "apply";
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
  const action = getAction(body?.action);
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

  if (action === "delete") {
    const { data: snapshot, error: snapshotError } = await supabase
      .from("site_crawl_snapshots")
      .select("id, snapshot_status")
      .eq("id", snapshotId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (snapshotError) {
      return NextResponse.json(
        { error: "관측 snapshot을 조회하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!snapshot) {
      return NextResponse.json(
        { error: "관측 snapshot을 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("latest_crawl_snapshot_id, description_source_snapshot_id")
      .eq("id", siteId)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json(
        { error: "사이트의 snapshot 반영 상태를 확인하지 못했습니다." },
        { status: 500 },
      );
    }

    const row = site as Record<string, unknown> | null;
    const isAppliedSnapshot =
      snapshot.snapshot_status === "approved" ||
      row?.latest_crawl_snapshot_id === snapshotId ||
      row?.description_source_snapshot_id === snapshotId;

    if (isAppliedSnapshot) {
      return NextResponse.json(
        { error: "반영된 관측 snapshot은 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("site_crawl_snapshots")
      .delete()
      .eq("id", snapshotId)
      .eq("site_id", siteId);

    if (deleteError) {
      return NextResponse.json(
        { error: "관측 snapshot을 삭제하지 못했습니다." },
        { status: 500 },
      );
    }

    revalidateTag("public-sites", "max");

    return NextResponse.json({ ok: true });
  }

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

    revalidateTag("public-sites", "max");

    return NextResponse.json({ ok: true });
  }

  if (action === "approve_snapshot") {
    const { data: snapshot, error: snapshotError } = await supabase
      .from("site_crawl_snapshots")
      .select("id, site_id, collected_at")
      .eq("id", snapshotId)
      .eq("site_id", siteId)
      .maybeSingle();

    if (snapshotError) {
      return NextResponse.json(
        { error: "관측 snapshot을 조회하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!snapshot) {
      return NextResponse.json(
        { error: "관측 snapshot을 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const collectedAt =
      typeof snapshot.collected_at === "string" ? snapshot.collected_at : now;
    const { error: snapshotUpdateError } = await supabase
      .from("site_crawl_snapshots")
      .update({
        snapshot_status: "approved",
        updated_at: now,
      })
      .eq("id", snapshotId)
      .eq("site_id", siteId);

    if (snapshotUpdateError) {
      return NextResponse.json(
        { error: "관측 snapshot을 공개 반영하지 못했습니다." },
        { status: 500 },
      );
    }

    const { data: site, error: siteUpdateError } = await supabase
      .from("sites")
      .update({
        latest_crawl_snapshot_id: snapshotId,
        content_crawled_at: collectedAt,
      })
      .eq("id", siteId)
      .select("slug")
      .maybeSingle();

    if (siteUpdateError) {
      return NextResponse.json(
        { error: "사이트의 최신 관측 snapshot 참조를 갱신하지 못했습니다." },
        { status: 500 },
      );
    }

    revalidateTag("public-sites", "max");

    return NextResponse.json({
      ok: true,
      snapshotId,
      preview_path:
        site && typeof site.slug === "string" ? `/sites/${site.slug}` : null,
    });
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

  if (result.status >= 200 && result.status < 300) {
    revalidateTag("public-sites", "max");
  }

  return NextResponse.json(result.body, { status: result.status });
}
