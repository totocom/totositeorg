import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";

export const runtime = "nodejs";

type ManualDescriptionContext = {
  params: Promise<{
    siteId: string;
  }>;
};

type ManualDescriptionBody = {
  description?: unknown;
};

function normalizeDescription(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  request: Request,
  context: ManualDescriptionContext,
) {
  try {
    const token = getBearerToken(request);
    const adminSession = await getAdminSession(token);

    if (!adminSession) {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 },
      );
    }

    const { siteId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | ManualDescriptionBody
      | null;
    const description = normalizeDescription(body?.description);

    if (!siteId) {
      return NextResponse.json(
        { error: "사이트 ID가 필요합니다." },
        { status: 400 },
      );
    }

    if (description.length < 30) {
      return NextResponse.json(
        { error: "사이트 설명은 최소 30자 이상 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("sites")
      .update({ description })
      .eq("id", siteId)
      .select("slug, description")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "사이트 설명을 저장하지 못했습니다." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "사이트를 찾지 못했습니다." },
        { status: 404 },
      );
    }

    revalidateTag("public-sites", "max");

    return NextResponse.json({
      ok: true,
      description: data.description ?? description,
      slug: data.slug ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사이트 설명 저장 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
