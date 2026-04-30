import type { Metadata } from "next";
import Link from "next/link";
import { siteName, siteUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: "텔레그램 기능 안내",
  description:
    "회원가입 텔레그램 인증, 사이트별 알림 구독, 사이트 및 게시물 제출 알림, 승인 알림 등 현재 적용된 텔레그램 기능을 안내합니다.",
  alternates: {
    canonical: `${siteUrl}/telegram-guide`,
  },
  openGraph: {
    url: `${siteUrl}/telegram-guide`,
    title: `텔레그램 기능 안내 | ${siteName}`,
    description:
      "현재 사이트에 적용된 텔레그램 인증, 사이트별 구독, 승인 알림 기능을 확인하세요.",
  },
};

const userFeatures = [
  {
    title: "회원가입 텔레그램 인증",
    description:
      "회원가입 단계에서 텔레그램 봇을 시작하고 인증 확인을 완료해야 가입을 마칠 수 있습니다. 인증된 텔레그램은 계정과 연결됩니다.",
  },
  {
    title: "사이트 승인 알림",
    description:
      "회원이 사이트를 제보한 뒤 관리자가 승인하면, 연결된 텔레그램 대화로 승인 완료 안내와 공개 주소가 전송됩니다.",
  },
  {
    title: "사이트별 알림 구독",
    description:
      "사이트 상세 페이지에서 텔레그램 알림을 구독하면 해당 사이트에 새 만족도 평가나 먹튀 피해 제보가 승인될 때 개인 대화로 알림을 받을 수 있습니다.",
  },
  {
    title: "구독 해제 지원",
    description:
      "사이트 상세 페이지에서 구독을 해제할 수 있고, 텔레그램 봇 대화방에서 /stop 명령을 보내면 연결된 사이트 알림 구독을 한 번에 해제할 수 있습니다.",
  },
  {
    title: "만족도 평가 및 먹튀 제보 승인 알림",
    description:
      "작성한 만족도 평가나 먹튀 피해 제보가 승인되면, 해당 사이트 상세 페이지로 이동할 수 있는 바로가기와 함께 알림을 받습니다.",
  },
  {
    title: "승인 게시물 채널 업데이트",
    description:
      "관리자가 사이트, 만족도 평가, 먹튀 피해 제보를 승인하면 공개 텔레그램 채널 @totosite_org에도 새 콘텐츠 안내가 등록됩니다.",
  },
];

const adminFeatures = [
  {
    title: "새 사이트 제보 접수 알림",
    description:
      "회원이 사이트를 등록하면 운영자 텔레그램 채널로 사이트명, 대표 URL, 추가 URL, 제보자 텔레그램 정보가 전달됩니다.",
  },
  {
    title: "새 만족도 평가 및 먹튀 제보 접수 알림",
    description:
      "회원이 만족도 평가나 먹튀 피해 제보를 제출하면 운영자 텔레그램 채널로 검토가 필요한 새 게시물 정보가 전달됩니다.",
  },
  {
    title: "구독자 승인 알림 발송",
    description:
      "관리자가 만족도 평가나 먹튀 피해 제보를 승인하면 작성자뿐 아니라 해당 사이트를 구독한 회원에게도 승인된 새 콘텐츠 알림이 전송됩니다.",
  },
  {
    title: "사이트 도메인 추가 요청 알림",
    description:
      "기존 사이트에 새 도메인 추가 요청이 접수되면 운영자 텔레그램 채널로 요청 내용과 요청자 정보가 전달됩니다.",
  },
];

export default function TelegramGuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase text-accent">
          Telegram notifications
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          텔레그램 기능 안내
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          현재 사이트에는 회원 인증, 제출 접수, 관리자 검토, 승인 완료 흐름에
          텔레그램 알림이 연결되어 있습니다. 사이트별 알림 구독을 켜면 관심
          사이트에 새 승인 콘텐츠가 올라올 때 계정에 연결된 텔레그램 대화로
          바로 안내를 받을 수 있습니다.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-accent">회원용 기능</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            계정과 작성 글에 연결되는 알림
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {userFeatures.map((feature) => (
            <article
              key={feature.title}
              className="rounded-md border border-line bg-background p-4"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-accent">운영자용 기능</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            검토가 필요한 내용을 빠르게 받는 알림
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {adminFeatures.map((feature) => (
            <article
              key={feature.title}
              className="rounded-md border border-line bg-background p-4"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-xl font-bold text-foreground">이용 방법</h2>
        <ol className="mt-3 grid gap-3 text-sm leading-6 text-muted">
          <li>
            <span className="font-semibold text-foreground">1. 회원가입</span>
            에서 텔레그램 인증 시작 버튼을 누르고 봇 대화방에서 인증을
            완료합니다.
          </li>
          <li>
            <span className="font-semibold text-foreground">2. 사이트 제보</span>,
            만족도 평가, 먹튀 피해 제보를 작성하면 운영자에게 검토 알림이
            전달됩니다.
          </li>
          <li>
            <span className="font-semibold text-foreground">3. 관리자 승인</span>
            이 완료되면 작성자에게 승인 완료 알림이 전송됩니다.
          </li>
          <li>
            <span className="font-semibold text-foreground">4. 사이트별 구독</span>
            은 사이트 상세 페이지의 텔레그램 알림 구독 영역에서 켜거나 끌 수
            있습니다.
          </li>
          <li>
            <span className="font-semibold text-foreground">5. 봇에서 해제</span>
            가 필요하면 텔레그램 봇 대화방에 /stop을 보내 사이트별 알림
            구독을 정리할 수 있습니다.
          </li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            회원가입에서 인증하기
          </Link>
          <Link
            href="/site-registration"
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            사이트 제보하기
          </Link>
          <Link
            href="/sites"
            className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
          >
            사이트별 알림 구독하기
          </Link>
        </div>
      </section>
    </main>
  );
}
