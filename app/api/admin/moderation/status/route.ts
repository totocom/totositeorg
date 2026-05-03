import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

type ModerationTable = "sites" | "reviews" | "scam_reports";
type ModerationStatus = "pending" | "approved" | "rejected";

function isModerationTable(value: unknown): value is ModerationTable {
  return value === "sites" || value === "reviews" || value === "scam_reports";
}

function isModerationStatus(value: unknown): value is ModerationStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    table?: unknown;
    id?: unknown;
    status?: unknown;
  } | null;
  const table = body?.table;
  const id = normalizeId(body?.id);
  const status = body?.status;

  if (!isModerationTable(table) || !id || !isModerationStatus(status)) {
    return NextResponse.json(
      { error: "상태 변경 대상과 상태값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const updatePayload =
    table === "scam_reports"
      ? {
          review_status: status,
          is_published: status === "approved",
          reviewed_at: now,
          approved_at: status === "approved" ? now : null,
          published_at: status === "approved" ? now : null,
        }
      : { status };

  const supabase = getServiceClient();
  const { error } = await supabase.from(table).update(updatePayload).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "상태 변경 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }

  revalidateTag("public-sites", "max");

  return NextResponse.json({ ok: true });
}
