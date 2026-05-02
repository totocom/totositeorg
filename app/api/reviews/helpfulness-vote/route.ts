import { createHash } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type VoteValue = -1 | 1;

type ReviewCountsRow = {
  helpful_count: number | null;
  not_helpful_count: number | null;
};

type VoteRow = {
  vote: VoteValue;
};

type VoteResponse = {
  helpfulCount: number;
  notHelpfulCount: number;
  currentVote: VoteValue | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("supabase_service_env_missing");
  }

  return { supabaseUrl, serviceRoleKey };
}

function getSupabaseAdmin() {
  const { supabaseUrl, serviceRoleKey } = getEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

function getForwardedIp(request: NextRequest) {
  const directIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip");

  if (directIp?.trim()) {
    return directIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor?.trim()) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const forwarded = request.headers.get("forwarded");
  const forwardedMatch = forwarded?.match(/(?:^|;)\s*for="?([^";,]+)"?/i);

  return forwardedMatch?.[1]?.trim() || "unknown";
}

function getVisitorIpHash(request: NextRequest) {
  const salt =
    process.env.REVIEW_VOTE_IP_HASH_SALT ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "review-helpfulness-local-salt";
  const ip = getForwardedIp(request);

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function isVoteValue(value: unknown): value is VoteValue {
  return value === 1 || value === -1;
}

function isValidReviewId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

async function getVoteResponse(
  request: NextRequest,
  reviewId: string,
): Promise<{ response: VoteResponse | null; status: number; error?: string }> {
  const supabase = getSupabaseAdmin();
  const visitorIpHash = getVisitorIpHash(request);

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .select("helpful_count, not_helpful_count")
    .eq("id", reviewId)
    .eq("status", "approved")
    .maybeSingle<ReviewCountsRow>();

  if (reviewError) {
    return { response: null, status: 500, error: "review_lookup_failed" };
  }

  if (!review) {
    return { response: null, status: 404, error: "review_not_found" };
  }

  const { data: vote, error: voteError } = await supabase
    .from("review_helpfulness_votes")
    .select("vote")
    .eq("review_id", reviewId)
    .eq("visitor_ip_hash", visitorIpHash)
    .maybeSingle<VoteRow>();

  if (voteError) {
    return { response: null, status: 500, error: "vote_lookup_failed" };
  }

  return {
    response: {
      helpfulCount: Number(review.helpful_count ?? 0),
      notHelpfulCount: Number(review.not_helpful_count ?? 0),
      currentVote: vote?.vote ?? null,
    },
    status: 200,
  };
}

export async function GET(request: NextRequest) {
  const reviewId = request.nextUrl.searchParams.get("reviewId");

  if (!isValidReviewId(reviewId)) {
    return NextResponse.json(
      { error: "invalid_review_id" },
      { status: 400 },
    );
  }

  try {
    const result = await getVoteResponse(request, reviewId);

    if (!result.response) {
      return NextResponse.json(
        { error: result.error ?? "vote_state_failed" },
        { status: result.status },
      );
    }

    return NextResponse.json(result.response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "vote_state_failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { reviewId?: unknown; vote?: unknown }
    | null;
  const reviewId = body?.reviewId;
  const requestedVote = body?.vote;

  if (!isValidReviewId(reviewId) || !isVoteValue(requestedVote)) {
    return NextResponse.json(
      { error: "invalid_vote_request" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const visitorIpHash = getVisitorIpHash(request);

    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("id", reviewId)
      .eq("status", "approved")
      .maybeSingle<{ id: string }>();

    if (reviewError) {
      return NextResponse.json(
        { error: "review_lookup_failed" },
        { status: 500 },
      );
    }

    if (!review) {
      return NextResponse.json(
        { error: "review_not_found" },
        { status: 404 },
      );
    }

    const { error: voteError } = await supabase
      .from("review_helpfulness_votes")
      .upsert(
        {
          review_id: reviewId,
          visitor_ip_hash: visitorIpHash,
          vote: requestedVote,
        },
        { onConflict: "review_id,visitor_ip_hash" },
      );

    if (voteError) {
      return NextResponse.json(
        { error: "vote_save_failed" },
        { status: 500 },
      );
    }

    const result = await getVoteResponse(request, reviewId);

    if (!result.response) {
      return NextResponse.json(
        { error: result.error ?? "vote_state_failed" },
        { status: result.status },
      );
    }

    return NextResponse.json(result.response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "vote_save_failed",
      },
      { status: 500 },
    );
  }
}
