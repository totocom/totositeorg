"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteAuthorActionsProps = {
  siteId: string;
  kind?: "all" | "review" | "scam-report";
};

type AuthorContentState = {
  hasReview: boolean;
  hasScamReport: boolean;
};

const actionButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent/80 active:scale-95";

function getActionHref(targetHref: string, isLoggedIn: boolean) {
  if (isLoggedIn) {
    return targetHref;
  }

  return `/login?redirectTo=${encodeURIComponent(targetHref)}`;
}

export function SiteAuthorActions({
  siteId,
  kind = "all",
}: SiteAuthorActionsProps) {
  const { user, isLoading } = useAuth();
  const [contentState, setContentState] = useState<AuthorContentState>({
    hasReview: false,
    hasScamReport: false,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAuthorContent() {
      if (!user) {
        setContentState({ hasReview: false, hasScamReport: false });
        return;
      }

      const [reviewResult, scamReportResult] = await Promise.all([
        supabase
          .from("reviews")
          .select("id")
          .eq("user_id", user.id)
          .eq("site_id", siteId)
          .limit(1),
        supabase
          .from("scam_reports")
          .select("id")
          .eq("user_id", user.id)
          .eq("site_id", siteId)
          .limit(1),
      ]);

      if (!isMounted) return;

      setContentState({
        hasReview: (reviewResult.data ?? []).length > 0,
        hasScamReport: (scamReportResult.data ?? []).length > 0,
      });
    }

    if (!isLoading) {
      loadAuthorContent();
    }

    return () => {
      isMounted = false;
    };
  }, [isLoading, siteId, user]);

  if (isLoading) {
    return null;
  }

  const showReview = kind === "all" || kind === "review";
  const showScamReport = kind === "all" || kind === "scam-report";
  const isLoggedIn = Boolean(user);
  const reviewHref = `/submit-review?siteId=${siteId}`;
  const scamReportHref = `/submit-scam-report?siteId=${siteId}`;

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      {showReview ? (
        <Link
          href={getActionHref(reviewHref, isLoggedIn)}
          className={actionButtonClassName}
        >
          {user && contentState.hasReview ? "내 만족도 평가 수정" : "만족도 평가"}
        </Link>
      ) : null}
      {showScamReport ? (
        <Link
          href={getActionHref(scamReportHref, isLoggedIn)}
          className={actionButtonClassName}
        >
          {user && contentState.hasScamReport ? "내 먹튀 제보 수정" : "먹튀 제보하기"}
        </Link>
      ) : null}
    </div>
  );
}
