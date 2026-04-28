import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ReviewStatus = "approved" | "rejected";

type SubmissionRow = {
  id: string;
  site_id: string;
  domain_url: string;
  status: string;
};

type SiteRow = {
  id: string;
  url: string;
  domains: string[] | null;
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

async function getIsAdmin(token: string) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResult, error: userError } =
    await supabase.auth.getUser(token);
  const email = userResult.user?.email;

  if (userError || !email) return false;

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

  if (!token || !(await getIsAdmin(token))) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    submissionId?: unknown;
    status?: unknown;
  } | null;
  const submissionId =
    typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
  const status = body?.status;

  if (!submissionId || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json(
      { error: "검토할 도메인 요청과 상태가 필요합니다." },
      { status: 400 },
    );
  }

  const { supabaseUrl, serviceRoleKey } = getEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: submission, error: submissionError } = await supabase
    .from("site_domain_submissions")
    .select("id, site_id, domain_url, status")
    .eq("id", submissionId)
    .maybeSingle<SubmissionRow>();

  if (submissionError || !submission) {
    return NextResponse.json(
      { error: "도메인 추가 요청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (submission.status !== "pending") {
    return NextResponse.json({ ok: true, skipped: "already_reviewed" });
  }

  if (status === "approved") {
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, url, domains")
      .eq("id", submission.site_id)
      .maybeSingle<SiteRow>();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "사이트 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const domains = Array.from(
      new Set([site.url, ...(site.domains ?? []), submission.domain_url].filter(Boolean)),
    );
    const { error: updateSiteError } = await supabase
      .from("sites")
      .update({ domains })
      .eq("id", site.id);

    if (updateSiteError) {
      return NextResponse.json(
        { error: "사이트 도메인 목록을 업데이트하지 못했습니다." },
        { status: 500 },
      );
    }
  }

  const { error: updateSubmissionError } = await supabase
    .from("site_domain_submissions")
    .update({
      status: status satisfies ReviewStatus,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (updateSubmissionError) {
    return NextResponse.json(
      { error: "도메인 요청 상태를 업데이트하지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, siteId: submission.site_id });
}
