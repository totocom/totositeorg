"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type SiteAuthorActionsProps = {
  siteId: string;
};

type AuthorContentState = {
  hasReview: boolean;
  hasScamReport: boolean;
};

export function SiteAuthorActions({ siteId }: SiteAuthorActionsProps) {
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

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <Link
        href={`/submit-review?siteId=${siteId}`}
        className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
      >
        {user && contentState.hasReview ? "내 만족도 평가 수정" : "만족도 평가"}
      </Link>
      <Link
        href={`/submit-scam-report?siteId=${siteId}`}
        className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
      >
        {user && contentState.hasScamReport ? "내 먹튀 제보 수정" : "먹튀 제보하기"}
      </Link>
    </div>
  );
}
