"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type ReviewHelpfulnessVoteProps = {
  reviewId: string;
};

type VoteValue = -1 | 1;

type CountRow = {
  helpful_count: number | null;
  not_helpful_count: number | null;
};

type VoteRow = {
  vote: VoteValue;
};

export function ReviewHelpfulnessVote({
  reviewId,
}: ReviewHelpfulnessVoteProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(0);
  const [currentVote, setCurrentVote] = useState<VoteValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadVoteState() {
    setIsLoading(true);
    setMessage("");

    const [countsResult, userVoteResult] = await Promise.all([
      supabase
        .from("review_helpfulness_counts")
        .select("helpful_count, not_helpful_count")
        .eq("review_id", reviewId)
        .maybeSingle<CountRow>(),
      user
        ? supabase
            .from("review_helpfulness_votes")
            .select("vote")
            .eq("review_id", reviewId)
            .eq("user_id", user.id)
            .maybeSingle<VoteRow>()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!countsResult.error && countsResult.data) {
      setHelpfulCount(Number(countsResult.data.helpful_count ?? 0));
      setNotHelpfulCount(Number(countsResult.data.not_helpful_count ?? 0));
    } else {
      setHelpfulCount(0);
      setNotHelpfulCount(0);
    }

    if (!userVoteResult.error && userVoteResult.data) {
      setCurrentVote(userVoteResult.data.vote);
    } else {
      setCurrentVote(null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    if (isAuthLoading) return;

    const timeoutId = window.setTimeout(() => {
      void loadVoteState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, reviewId, user?.id]);

  async function submitVote(nextVote: VoteValue) {
    if (isSaving) return;

    if (!user) {
      setMessage("로그인 후 투표할 수 있습니다.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const previousVote = currentVote;
    const shouldRemoveVote = previousVote === nextVote;

    const result = shouldRemoveVote
      ? await supabase
          .from("review_helpfulness_votes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", user.id)
      : await supabase.from("review_helpfulness_votes").upsert(
          {
            review_id: reviewId,
            user_id: user.id,
            vote: nextVote,
          },
          { onConflict: "review_id,user_id" },
        );

    if (result.error) {
      setMessage("투표를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      await loadVoteState();
    }

    setIsSaving(false);
  }

  const helpfulSelected = currentVote === 1;
  const notHelpfulSelected = currentVote === -1;

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-xs font-semibold text-muted">
        이 리뷰가 도움이 됐나요?
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submitVote(1)}
          disabled={isLoading || isSaving}
          className={[
            "h-9 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            helpfulSelected
              ? "border-accent bg-accent text-white"
              : "border-line text-foreground hover:border-accent hover:text-accent",
          ].join(" ")}
          aria-pressed={helpfulSelected}
        >
          도움돼요 {helpfulCount}
        </button>
        <button
          type="button"
          onClick={() => submitVote(-1)}
          disabled={isLoading || isSaving}
          className={[
            "h-9 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            notHelpfulSelected
              ? "border-red-500 bg-red-500 text-white"
              : "border-line text-foreground hover:border-red-500 hover:text-red-600",
          ].join(" ")}
          aria-pressed={notHelpfulSelected}
        >
          아쉬워요 {notHelpfulCount}
        </button>
        {isSaving ? (
          <span className="text-xs font-semibold text-muted">저장 중...</span>
        ) : null}
      </div>
      {message ? (
        <p className="text-xs font-semibold text-muted">{message}</p>
      ) : null}
    </div>
  );
}
