import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

type DeletableModerationTable = "sites" | "reviews" | "scam_reports";

function isDeletableModerationTable(
  value: unknown,
): value is DeletableModerationTable {
  return value === "sites" || value === "reviews" || value === "scam_reports";
}

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function DELETE(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    table?: unknown;
    id?: unknown;
  } | null;
  const table = body?.table;
  const id = normalizeId(body?.id);

  if (!isDeletableModerationTable(table) || !id) {
    return NextResponse.json(
      { error: "삭제 대상이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "삭제 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }

  revalidateTag("public-sites", "max");

  return NextResponse.json({ ok: true });
}
