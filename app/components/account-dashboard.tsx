"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { moderationStatusLabels } from "@/app/data/sites";
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
  title: string;
  rating: number;
  status: keyof typeof moderationStatusLabels;
  created_at: string;
  sites?: {
    name: string;
  }[] | null;
};

type TelegramSubscription = {
  chat_id: string;
  username: string | null;
  first_name: string | null;
  is_active: boolean;
  updated_at: string;
};

type AccountDataResult =
  | {
      sites: UserSite[];
      reviews: UserReview[];
      telegramSubscription: TelegramSubscription | null;
      errorMessage: "";
    }
  | {
      sites: [];
      reviews: [];
      telegramSubscription: null;
      errorMessage: string;
    };

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "";

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

function getTelegramStartUrl(userId: string) {
  if (!telegramBotUrl) return "";

  try {
    const url = new URL(telegramBotUrl);
    url.searchParams.set("start", userId);
    return url.toString();
  } catch {
    const separator = telegramBotUrl.includes("?") ? "&" : "?";
    return `${telegramBotUrl}${separator}start=${encodeURIComponent(userId)}`;
  }
}

async function fetchAccountData(userId: string): Promise<AccountDataResult> {
  const [sitesResult, reviewsResult, telegramResult] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, url, category, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, title, rating, status, created_at, sites(name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("telegram_subscriptions")
      .select("chat_id, username, first_name, is_active, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (sitesResult.error || reviewsResult.error || telegramResult.error) {
    return {
      sites: [],
      reviews: [],
      telegramSubscription: null,
      errorMessage:
        "내 작성 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    sites: (sitesResult.data ?? []) as UserSite[],
    reviews: (reviewsResult.data ?? []) as UserReview[],
    telegramSubscription:
      (telegramResult.data as TelegramSubscription | null) ?? null,
    errorMessage: "",
  };
}

export function AccountDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [sites, setSites] = useState<UserSite[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [telegramSubscription, setTelegramSubscription] =
    useState<TelegramSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingTelegram, setIsRefreshingTelegram] = useState(false);
  const [telegramCopyMessage, setTelegramCopyMessage] = useState("");
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
      setTelegramSubscription(result.telegramSubscription);
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

  const telegramStartUrl = getTelegramStartUrl(user.id);
  const telegramStartCommand = `/start ${user.id}`;

  async function refreshTelegramConnection() {
    if (!user) return;

    setIsRefreshingTelegram(true);
    setTelegramCopyMessage("");

    const { data, error } = await supabase
      .from("telegram_subscriptions")
      .select("chat_id, username, first_name, is_active, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    setIsRefreshingTelegram(false);

    if (error) {
      setErrorMessage("텔레그램 연결 상태를 다시 확인하지 못했습니다.");
      return;
    }

    setTelegramSubscription((data as TelegramSubscription | null) ?? null);
  }

  async function copyTelegramStartCommand() {
    setTelegramCopyMessage("");

    try {
      await navigator.clipboard.writeText(telegramStartCommand);
      setTelegramCopyMessage("연결 명령어를 복사했습니다.");
    } catch {
      setTelegramCopyMessage("복사하지 못했습니다. 명령어를 직접 선택해서 복사해주세요.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">내 계정</p>
        <h1 className="mt-1 text-3xl font-bold">계정 정보</h1>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">내 이메일</p>
        <p className="mt-2 font-semibold">{user.email}</p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">텔레그램 알림 연결</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              사이트 제보가 승인되면 연결된 텔레그램 대화로 알림을 보내드립니다.
            </p>
            {telegramSubscription?.is_active ? (
              <p className="mt-3 text-sm font-semibold text-accent">
                연결됨
                {telegramSubscription.username
                  ? ` · @${telegramSubscription.username}`
                  : ""}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-muted">
                아직 텔레그램 알림이 연결되지 않았습니다.
              </p>
            )}
            {!telegramSubscription?.is_active ? (
              <div className="mt-4 rounded-md border border-line bg-background p-3 text-sm">
                <p className="text-muted">
                  봇을 이미 시작한 상태라 버튼 연결이 안 되면 아래 명령어를
                  텔레그램 봇 대화방에 보내주세요.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="break-all rounded-md bg-surface px-3 py-2 text-xs">
                    {telegramStartCommand}
                  </code>
                  <button
                    type="button"
                    onClick={copyTelegramStartCommand}
                    className="h-9 rounded-md border border-line px-3 text-xs font-semibold"
                  >
                    복사
                  </button>
                </div>
                {telegramCopyMessage ? (
                  <p className="mt-2 text-xs font-semibold text-accent">
                    {telegramCopyMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {telegramStartUrl ? (
              <a
                href={telegramStartUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
              >
                텔레그램 봇 시작하기
              </a>
            ) : (
              <p className="text-sm font-semibold text-muted">
                텔레그램 봇 링크 설정이 필요합니다.
              </p>
            )}
            <button
              type="button"
              onClick={refreshTelegramConnection}
              disabled={isRefreshingTelegram}
              className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold disabled:opacity-50"
            >
              {isRefreshingTelegram ? "확인 중..." : "연결 상태 새로고침"}
            </button>
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
                  평점 {review.rating}/5 · {formatDate(review.created_at)}
                </p>
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
