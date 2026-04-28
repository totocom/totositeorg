"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { formatRatingScore, moderationStatusLabels } from "@/app/data/sites";
import { supabase } from "@/lib/supabase/client";

type UserSite = {
  id: string;
  name: string;
  url: string;
  category: string;
  status: keyof typeof moderationStatusLabels;
  created_at: string;
};

type UserReview = {
  id: string;
  site_id: string;
  title: string;
  rating: number;
  status: keyof typeof moderationStatusLabels;
  created_at: string;
  sites?: {
    name: string;
  }[] | null;
};

type UserScamReport = {
  id: string;
  site_id: string;
  damage_types: string[] | null;
  review_status: keyof typeof moderationStatusLabels;
  is_published: boolean;
  created_at: string;
  sites?: {
    name: string;
  }[] | null;
};

type UserProfile = {
  username: string;
  nickname: string;
  telegram_verified_at: string | null;
};

type AccountDataResult =
  | {
      sites: UserSite[];
      reviews: UserReview[];
      scamReports: UserScamReport[];
      profile: UserProfile | null;
      errorMessage: "";
    }
  | {
      sites: [];
      reviews: [];
      scamReports: [];
      profile: null;
      errorMessage: string;
    };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getReviewSiteName(review: UserReview) {
  return review.sites?.[0]?.name ?? "알 수 없음";
}

function getScamReportSiteName(report: UserScamReport) {
  return report.sites?.[0]?.name ?? "알 수 없음";
}

async function fetchAccountData(userId: string): Promise<AccountDataResult> {
  const [sitesResult, reviewsResult, scamReportsResult, profileResult] =
    await Promise.all([
    supabase
      .from("sites")
      .select("id, name, url, category, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, site_id, title, rating, status, created_at, sites(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("scam_reports")
      .select(
        "id, site_id, damage_types, review_status, is_published, created_at, sites(name)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("username, nickname, telegram_verified_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (
    sitesResult.error ||
    reviewsResult.error ||
    scamReportsResult.error ||
    profileResult.error
  ) {
    return {
      sites: [],
      reviews: [],
      scamReports: [],
      profile: null,
      errorMessage:
        "내 작성 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    sites: (sitesResult.data ?? []) as UserSite[],
    reviews: (reviewsResult.data ?? []) as UserReview[],
    scamReports: (scamReportsResult.data ?? []) as UserScamReport[],
    profile: (profileResult.data as UserProfile | null) ?? null,
    errorMessage: "",
  };
}

export function AccountDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [sites, setSites] = useState<UserSite[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [scamReports, setScamReports] = useState<UserScamReport[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAccount() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      const result = await fetchAccountData(user.id);

      if (!isMounted) {
        return;
      }

      setSites(result.sites);
      setReviews(result.reviews);
      setScamReports(result.scamReports);
      setProfile(result.profile);
      setErrorMessage(result.errorMessage);
      setIsLoading(false);
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          계정 정보를 불러오는 중입니다.
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            내 계정 정보를 확인하려면 먼저 로그인해주세요.
          </p>
          <Link
            href="/login?redirectTo=/account"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            로그인
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">내 계정</p>
        <h1 className="mt-1 text-3xl font-bold">계정 정보</h1>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">아이디</p>
            <p className="mt-2 font-semibold">{profile?.username ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted">닉네임</p>
            <p className="mt-2 font-semibold">{profile?.nickname ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted">내 이메일</p>
            <p className="mt-2 break-all font-semibold">{user.email}</p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">내가 작성한 리뷰</h2>
        {reviews.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-md border border-line p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-accent">
                      {getReviewSiteName(review)} · 만족도 평가
                    </p>
                    <h3 className="mt-1 font-semibold">{review.title}</h3>
                  </div>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
                    {moderationStatusLabels[review.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  평점 {formatRatingScore(review.rating)} ·{" "}
                  {formatDate(review.created_at)}
                </p>
                <Link
                  href={`/submit-review?siteId=${review.site_id}`}
                  className="mt-3 inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-background"
                >
                  만족도 평가 수정
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
            아직 작성한 리뷰가 없습니다.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">내가 작성한 먹튀 피해 제보</h2>
        {scamReports.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {scamReports.map((report) => (
              <article
                key={report.id}
                className="rounded-md border border-line p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-accent">
                      {getScamReportSiteName(report)} · 먹튀 피해 제보
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {(report.damage_types ?? []).join(", ") || "피해 유형 미입력"}
                    </h3>
                  </div>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
                    {moderationStatusLabels[report.review_status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  제보일 {formatDate(report.created_at)} ·{" "}
                  {report.is_published ? "공개" : "비공개"}
                </p>
                <Link
                  href={`/submit-scam-report?siteId=${report.site_id}`}
                  className="mt-3 inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-background"
                >
                  먹튀 피해 제보 수정
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
            아직 작성한 먹튀 피해 제보가 없습니다.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">내가 제보한 사이트</h2>
        {sites.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {sites.map((site) => (
              <article
                key={site.id}
                className="rounded-md border border-line p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-accent">
                      {site.category}
                    </p>
                    <h3 className="mt-1 font-semibold">{site.name}</h3>
                    <p className="mt-1 break-all text-sm text-muted">
                      {site.url}
                    </p>
                  </div>
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
                    {moderationStatusLabels[site.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  제보일 {formatDate(site.created_at)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
            아직 제보한 사이트가 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
