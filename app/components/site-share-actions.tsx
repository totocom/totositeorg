"use client";

import { useMemo, useState } from "react";

type KakaoSharePayload = {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  };
  buttons: Array<{
    title: string;
    link: {
      mobileWebUrl: string;
      webUrl: string;
    };
  }>;
};

type KakaoSdk = {
  isInitialized?: () => boolean;
  Share?: {
    sendDefault?: (payload: KakaoSharePayload) => void;
  };
  Link?: {
    sendDefault?: (payload: KakaoSharePayload) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

type SiteShareActionsProps = {
  siteName: string;
  shareUrl: string;
  title: string;
  description: string;
};

export function SiteShareActions({
  siteName,
  shareUrl,
  title,
  description,
}: SiteShareActionsProps) {
  const [copyMessage, setCopyMessage] = useState("");
  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    return [
      {
        label: "X",
        href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      },
      {
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        label: "Naver",
        href: `https://share.naver.com/web/shareView?url=${encodedUrl}&title=${encodedTitle}%20${encodedDescription}`,
      },
    ];
  }, [description, shareUrl, title]);

  async function copyShareUrl(message = "링크를 복사했습니다.") {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMessage(message);
    } catch {
      setCopyMessage("복사하지 못했습니다. 주소창의 링크를 직접 복사해주세요.");
    }
  }

  async function shareToKakao() {
    const kakao = window.Kakao;
    const kakaoPayload: KakaoSharePayload = {
      objectType: "feed",
      content: {
        title,
        description,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "정보 페이지 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    };

    if (kakao?.isInitialized?.() && kakao.Share?.sendDefault) {
      kakao.Share.sendDefault(kakaoPayload);
      setCopyMessage("Kakao 공유 창을 열었습니다.");
      return;
    }

    if (kakao?.isInitialized?.() && kakao.Link?.sendDefault) {
      kakao.Link.sendDefault(kakaoPayload);
      setCopyMessage("Kakao 공유 창을 열었습니다.");
      return;
    }

    await copyShareUrl("Kakao SDK가 없어 링크를 복사했습니다.");
  }

  return (
    <section
      className="mt-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-sm"
      aria-labelledby="site-share-actions-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            공유
          </p>
          <h2 id="site-share-actions-title" className="mt-1 text-base font-bold">
            {siteName} 정보 링크
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            이 정보가 필요하다면 링크를 복사해 공유할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyShareUrl()}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
        >
          링크 복사
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={shareToKakao}
          className="inline-flex min-h-9 items-center rounded-md border border-line bg-background px-3 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
        >
          Kakao
        </button>
        {shareLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center rounded-md border border-line bg-background px-3 text-xs font-bold text-foreground transition hover:border-accent hover:text-accent"
          >
            {link.label}
          </a>
        ))}
      </div>
      {copyMessage ? (
        <p className="mt-3 text-xs font-semibold text-accent" role="status">
          {copyMessage}
        </p>
      ) : null}
    </section>
  );
}
