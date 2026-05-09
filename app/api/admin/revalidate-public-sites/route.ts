import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  getAdminSession,
  getBearerToken,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const adminSession = await getAdminSession(token);

  if (!adminSession) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  revalidateTag("public-sites", "max");

  return NextResponse.json({ ok: true });
}
