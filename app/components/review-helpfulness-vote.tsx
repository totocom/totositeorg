"use client";

import { useEffect, useState } from "react";

type ReviewHelpfulnessVoteProps = {
  reviewId: string;
  authorUserId?: string | null;
  initialHelpfulCount?: number;
  initialNotHelpfulCount?: number;
};

type VoteValue = -1 | 1;

type VoteStateResponse = {
  helpfulCount: number;
  notHelpfulCount: number;
  currentVote: VoteValue | null;
  error?: string;
};

export function ReviewHelpfulnessVote({
  reviewId,
  initialHelpfulCount = 0,
  initialNotHelpfulCount = 0,
}: ReviewHelpfulnessVoteProps) {
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(initialNotHelpfulCount);
  const [currentVote, setCurrentVote] = useState<VoteValue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadVoteState() {
    setIsLoading(true);
    setMessage("");

    const response = await fetch(
      `/api/reviews/helpfulness-vote?reviewId=${encodeURIComponent(reviewId)}`,
    );
    const payload = (await response.json().catch(() => null)) as
      | VoteStateResponse
      | null;

    if (response.ok && payload) {
      setHelpfulCount(Number(payload.helpfulCount ?? 0));
      setNotHelpfulCount(Number(payload.notHelpfulCount ?? 0));
      setCurrentVote(payload.currentVote);
    } else {
      setHelpfulCount(initialHelpfulCount);
      setNotHelpfulCount(initialNotHelpfulCount);
      setCurrentVote(null);
      setMessage("투표 상태를 불러오지 못했습니다.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadVoteState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  async function submitVote(nextVote: VoteValue) {
    if (isSaving || isLoading) return;

    if (currentVote === nextVote) {
      setMessage("이미 반영된 투표입니다.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/reviews/helpfulness-vote", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reviewId,
        vote: nextVote,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | VoteStateResponse
      | null;

    if (!response.ok || !payload) {
      setMessage("투표를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } else {
      setHelpfulCount(Number(payload.helpfulCount ?? 0));
      setNotHelpfulCount(Number(payload.notHelpfulCount ?? 0));
      setCurrentVote(payload.currentVote);
      setMessage("투표가 반영되었습니다.");
    }

    setIsSaving(false);
  }

  const helpfulSelected = currentVote === 1;
  const notHelpfulSelected = currentVote === -1;
  const isVoteDisabled = isLoading || isSaving;
  const statusMessage =
    message ||
    (isLoading ? "투표 상태를 확인하는 중입니다." : "");

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
      <p className="text-xs font-semibold text-muted">
        이 리뷰가 도움이 됐나요?
      </p>
      {statusMessage ? (
        <p className="min-h-4 text-xs font-semibold text-muted" aria-live="polite">
          {statusMessage}
        </p>
      ) : (
        <p className="min-h-4 text-xs font-semibold text-muted" aria-hidden="true" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submitVote(1)}
          disabled={isVoteDisabled}
          className={[
            "h-9 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            helpfulSelected
              ? "border-accent bg-accent text-white"
              : "border-line text-foreground hover:border-accent hover:text-accent",
          ].join(" ")}
          aria-pressed={helpfulSelected}
          aria-label={`도움돼요 ${helpfulCount}`}
        >
          👍 {helpfulCount}
        </button>
        <button
          type="button"
          onClick={() => submitVote(-1)}
          disabled={isVoteDisabled}
          className={[
            "h-9 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
            notHelpfulSelected
              ? "border-red-500 bg-red-500 text-white"
              : "border-line text-foreground hover:border-red-500 hover:text-red-600",
          ].join(" ")}
          aria-pressed={notHelpfulSelected}
          aria-label={`아쉬워요 ${notHelpfulCount}`}
        >
          👎 {notHelpfulCount}
        </button>
        {isSaving ? (
          <span className="text-xs font-semibold text-muted">저장 중...</span>
        ) : null}
      </div>
    </div>
  );
}
