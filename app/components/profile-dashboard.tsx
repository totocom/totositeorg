"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "";

type UserProfile = {
  username: string;
  nickname: string;
};

type TelegramSubscription = {
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
};

type SubscribedSite = {
  id: string;
  name: string;
  slug: string;
  url: string;
};

type SiteTelegramSubscription = {
  id: string;
  created_at: string;
  sites?: SubscribedSite | SubscribedSite[] | null;
};

type ProfileDataResult =
  | {
      profile: UserProfile | null;
      telegramSubscription: TelegramSubscription | null;
      siteSubscriptions: SiteTelegramSubscription[];
      errorMessage: "";
    }
  | {
      profile: null;
      telegramSubscription: null;
      siteSubscriptions: [];
      errorMessage: string;
    };

async function fetchProfileData(userId: string): Promise<ProfileDataResult> {
  const [profileResult, telegramResult, siteSubscriptionsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, nickname")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("telegram_subscriptions")
        .select("username, first_name, last_name, is_active, created_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("site_telegram_subscriptions")
        .select("id, created_at, sites(id, name, slug, url)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  if (
    profileResult.error ||
    telegramResult.error ||
    siteSubscriptionsResult.error
  ) {
    return {
      profile: null,
      telegramSubscription: null,
      siteSubscriptions: [],
      errorMessage:
        "계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    profile: (profileResult.data as UserProfile | null) ?? null,
    telegramSubscription:
      (telegramResult.data as TelegramSubscription | null) ?? null,
    siteSubscriptions:
      (siteSubscriptionsResult.data ?? []) as SiteTelegramSubscription[],
    errorMessage: "",
  };
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

function getTelegramDisplayName(subscription: TelegramSubscription | null) {
  if (!subscription) return "연결되지 않음";
  if (subscription.username) return `@${subscription.username}`;

  const fullName = [subscription.first_name, subscription.last_name]
    .filter(Boolean)
    .join(" ");
  return fullName || "텔레그램 계정";
}

function getSubscriptionSite(subscription: SiteTelegramSubscription) {
  if (Array.isArray(subscription.sites)) {
    return subscription.sites[0] ?? null;
  }

  return subscription.sites ?? null;
}

export function ProfileDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [telegramSubscription, setTelegramSubscription] =
    useState<TelegramSubscription | null>(null);
  const [siteSubscriptions, setSiteSubscriptions] = useState<
    SiteTelegramSubscription[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const telegramStartUrl = useMemo(
    () => (user ? getTelegramStartUrl(user.id) : ""),
    [user],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      const result = await fetchProfileData(user.id);

      if (!isMounted) {
        return;
      }

      setProfile(result.profile);
      setTelegramSubscription(result.telegramSubscription);
      setSiteSubscriptions(result.siteSubscriptions);
      setErrorMessage(result.errorMessage);
      setIsLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccessMessage("");

    if (password.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(
        "비밀번호를 변경하지 못했습니다. 다시 로그인한 뒤 시도해주세요.",
      );
    } else {
      setPassword("");
      setPasswordConfirm("");
      setPasswordSuccessMessage("비밀번호가 변경되었습니다.");
    }

    setIsPasswordSaving(false);
  }

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
            href="/login?redirectTo=/profiles"
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

      {errorMessage ? (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">내 계정 정보</h2>
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
            <p className="mt-2 break-all font-semibold">{user.email ?? "-"}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">비밀번호 변경</h2>
        <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-4">
          <label className="grid gap-1 text-sm font-medium">
            새 비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="새 비밀번호"
              autoComplete="new-password"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            새 비밀번호 확인
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="h-11 rounded-md border border-line px-3 text-sm"
              placeholder="새 비밀번호 재입력"
              autoComplete="new-password"
            />
          </label>
          {passwordError ? (
            <p className="text-sm font-semibold text-red-700">{passwordError}</p>
          ) : null}
          {passwordSuccessMessage ? (
            <p className="text-sm font-semibold text-accent">
              {passwordSuccessMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPasswordSaving}
            className="h-10 w-fit rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent/80 disabled:opacity-60"
          >
            {isPasswordSaving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">사이트와 연결된 텔레그램</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {telegramSubscription?.is_active
                ? `${getTelegramDisplayName(telegramSubscription)} 계정이 연결되어 있습니다.`
                : "사이트 알림을 받으려면 텔레그램 계정을 연결해주세요."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={telegramStartUrl || "/telegram-guide"}
              target={telegramStartUrl ? "_blank" : undefined}
              rel={telegramStartUrl ? "noopener noreferrer" : undefined}
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              {telegramSubscription?.is_active ? "연결 확인" : "텔레그램 연결"}
            </Link>
            <Link
              href="/telegram-guide"
              className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
            >
              안내 보기
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">텔레그램 구독중인 사이트</h2>
        {siteSubscriptions.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {siteSubscriptions.map((subscription) => {
              const site = getSubscriptionSite(subscription);

              return (
                <article
                  key={subscription.id}
                  className="rounded-md border border-line p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {site?.name ?? "알 수 없음"}
                      </h3>
                      <p className="mt-1 break-all text-sm text-muted">
                        {site?.url ?? "사이트 정보를 불러오지 못했습니다."}
                      </p>
                    </div>
                    {site?.slug ? (
                      <Link
                        href={`/sites/${site.slug}`}
                        className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold text-foreground transition hover:bg-background"
                      >
                        사이트 보기
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">
            아직 텔레그램 알림을 구독 중인 사이트가 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
