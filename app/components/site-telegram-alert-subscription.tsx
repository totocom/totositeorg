"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteTelegramAlertSubscriptionProps = {
  siteId: string;
  siteName: string;
};

type TelegramSubscriptionRow = {
  id: string;
  is_active: boolean;
};

type SiteSubscriptionRow = {
  id: string;
};

type SiteSubscriptionCountRow = {
  subscriber_count: number | null;
};

const telegramBotUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "";

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

export function SiteTelegramAlertSubscription({
  siteId,
  siteName,
}: SiteTelegramAlertSubscriptionProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loginHref = `/login?redirectTo=${encodeURIComponent(pathname || "/sites")}`;
  const telegramStartUrl = useMemo(
    () => (user ? getTelegramStartUrl(user.id) : ""),
    [user],
  );

  async function loadSubscriberCount() {
    const { data, error } = await supabase
      .from("site_telegram_subscription_counts")
      .select("subscriber_count")
      .eq("site_id", siteId)
      .maybeSingle<SiteSubscriptionCountRow>();

    if (!error && data) {
      setSubscriberCount(Number(data.subscriber_count ?? 0));
    } else {
      setSubscriberCount(0);
    }
  }

  async function loadSubscription() {
    if (isAuthLoading) return;

    setMessage("");
    setIsLoading(true);

    await loadSubscriberCount();

    if (!user) {
      setTelegramConnected(false);
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    const [telegramResult, siteSubscriptionResult] = await Promise.all([
      supabase
        .from("telegram_subscriptions")
        .select("id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle<TelegramSubscriptionRow>(),
      supabase
        .from("site_telegram_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("site_id", siteId)
        .maybeSingle<SiteSubscriptionRow>(),
    ]);

    setTelegramConnected(!telegramResult.error && Boolean(telegramResult.data));
    setIsSubscribed(!siteSubscriptionResult.error && Boolean(siteSubscriptionResult.data));

    if (siteSubscriptionResult.error) {
      setMessage("사이트 알림 구독 테이블을 확인해주세요.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSubscription();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, siteId, user?.id]);

  async function toggleSubscription() {
    if (!user || isSaving) return;

    setIsSaving(true);
    setMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("로그인 상태를 확인하지 못했습니다. 다시 로그인해주세요.");
      setIsSaving(false);
      return;
    }

    const nextAction = isSubscribed ? "unsubscribe" : "subscribe";
    const response = await fetch("/api/telegram/site-subscription", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        siteId,
        action: nextAction,
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      isSubscribed?: boolean;
    } | null;

    if (!response.ok) {
      setMessage(result?.error ?? "구독 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      const nextSubscribed = Boolean(result?.isSubscribed);
      setIsSubscribed(nextSubscribed);
      setMessage(
        nextSubscribed
          ? "구독 완료 메시지를 텔레그램으로 보냈습니다."
          : "구독 해제 메시지를 텔레그램으로 보냈습니다.",
      );
      await loadSubscriberCount();
    }

    setIsSaving(false);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="grid gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Telegram alert
          </p>
          <h2 className="mt-1 text-base font-bold">텔레그램 알림 구독</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            {siteName}에 새 만족도 평가나 먹튀 피해 제보가 승인되면 알림을 받습니다.
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            현재 구독자 {subscriberCount.toLocaleString("ko-KR")}명
          </p>
        </div>

        <div className="grid gap-2">
          {isLoading ? (
            <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-muted">
              확인 중
            </span>
          ) : !user ? (
            <Link
              href={loginHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent/80 active:scale-95"
            >
              로그인 후 구독
            </Link>
          ) : !telegramConnected ? (
            <>
              <Link
                href={telegramStartUrl || "/telegram-guide"}
                target={telegramStartUrl ? "_blank" : undefined}
                rel={telegramStartUrl ? "noopener noreferrer" : undefined}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent/80 active:scale-95"
              >
                텔레그램 연결
              </Link>
              <button
                type="button"
                onClick={loadSubscription}
                className="h-10 w-full rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
              >
                연결 확인
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleSubscription}
              disabled={isSaving}
              className={`h-10 w-full rounded-md px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
                isSubscribed
                  ? "border border-line text-foreground hover:border-accent hover:text-accent"
                  : "bg-accent text-white hover:bg-accent/80"
              }`}
            >
              {isSaving ? "처리 중..." : isSubscribed ? "구독 해제" : "알림 구독"}
            </button>
          )}
        </div>
      </div>
      {message ? <p className="mt-3 text-xs font-semibold text-muted">{message}</p> : null}
    </section>
  );
}
