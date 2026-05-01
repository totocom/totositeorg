import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminSession,
  getBearerToken,
  getServiceClient,
} from "@/app/api/admin/sites/_admin";
import {
  createManualHtmlSnapshot,
  type ManualHtmlSnapshotInsert,
} from "@/app/data/manual-html-snapshot";

export const runtime = "nodejs";

type ManualHtmlSnapshotContext = {
  params: Promise<{
    siteId: string;
  }>;
};

function getStorageConfig() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publicBucket: process.env.SUPABASE_STORAGE_BUCKET || "site-screenshots",
  };
}

function shouldStoreRawHtml() {
  return process.env.SITE_CRAWL_STORE_RAW_HTML === "true";
}

async function storeRawHtmlPrivate({
  supabase,
  siteId,
  html,
  htmlSha256,
}: {
  supabase: SupabaseClient;
  siteId: string;
  html: string;
  htmlSha256: string;
}) {
  const bucket =
    process.env.SUPABASE_PRIVATE_CRAWL_HTML_BUCKET || "site-crawl-html";
  const filePath = `manual-html/${siteId}/${htmlSha256}-${randomUUID()}.html`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, Buffer.from(html, "utf8"), {
      contentType: "text/html; charset=utf-8",
      cacheControl: "no-store",
      upsert: false,
    });

  if (error) {
    return {
      rawHtmlStoragePath: null,
      error: `raw HTML private storage 저장에 실패했습니다. ${error.message}`,
    };
  }

  return {
    rawHtmlStoragePath: `${bucket}/${filePath}`,
  };
}

export async function POST(
  request: Request,
  context: ManualHtmlSnapshotContext,
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
    const body = await request.json().catch(() => null);
    const supabase = getServiceClient();
    const result = await createManualHtmlSnapshot({
      adminSession,
      siteId,
      body,
      storageConfig: getStorageConfig(),
      getSite: async (targetSiteId) => {
        const { data, error } = await supabase
          .from("sites")
          .select("id, url, domains")
          .eq("id", targetSiteId)
          .maybeSingle();

        if (error) {
          return {
            site: null,
            error: "사이트 정보를 조회하지 못했습니다.",
          };
        }

        return {
          site: data
            ? {
                id: String(data.id),
                url: String(data.url),
                domains: Array.isArray(data.domains)
                  ? data.domains.filter(
                      (domain): domain is string => typeof domain === "string",
                    )
                  : null,
              }
            : null,
        };
      },
      insertSnapshot: async (snapshot: ManualHtmlSnapshotInsert) => {
        const { data, error } = await supabase
          .from("site_crawl_snapshots")
          .insert(snapshot)
          .select("id")
          .single();

        if (error || !data?.id) {
          return {
            snapshotId: null,
            error: error?.message ?? "관측 snapshot을 저장하지 못했습니다.",
          };
        }

        return {
          snapshotId: String(data.id),
        };
      },
      updateSiteSnapshot: async (targetSiteId, values) => {
        const { error } = await supabase
          .from("sites")
          .update(values)
          .eq("id", targetSiteId);

        return {
          error: error?.message,
        };
      },
      allowRawHtmlStorage: shouldStoreRawHtml(),
      storeRawHtml: shouldStoreRawHtml()
        ? (input) =>
            storeRawHtmlPrivate({
              supabase,
              siteId: input.siteId,
              html: input.html,
              htmlSha256: input.htmlSha256,
            })
        : undefined,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "manual HTML snapshot 생성 중 문제가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
