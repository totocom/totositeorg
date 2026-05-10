"use client";

import { useState } from "react";

type PageShareButtonProps = {
  title: string;
  text: string;
  url: string;
};

export function PageShareButton({ title, text, url }: PageShareButtonProps) {
  const [message, setMessage] = useState("");

  async function sharePage() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setMessage("공유 창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했습니다.");
    } catch {
      setMessage("공유하지 못했습니다. 주소창의 링크를 직접 복사해주세요.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={sharePage}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-background px-4 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
      >
        이 페이지 공유하기
      </button>
      {message ? (
        <p className="mt-2 text-xs font-semibold text-accent" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
