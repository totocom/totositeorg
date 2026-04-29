import type { Metadata } from "next";
import Link from "next/link";
import { PublicScamReportList } from "@/app/components/public-scam-report-list";
import { getPublicScamReportList } from "@/app/data/public-sites";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "먹튀 피해 제보",
  description:
    "승인되어 공개된 토토사이트 먹튀 피해 제보를 최신순으로 확인하세요.",
  alternates: {
    canonical: `${siteUrl}/scam-reports`,
  },
  openGraph: {
    url: `${siteUrl}/scam-reports`,
    title: `먹튀 피해 제보 | ${siteName}`,
    description: siteDescription,
  },
};

export default async function ScamReportsPage() {
  const { items, errorMessage, source } = await getPublicScamReportList();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-accent">
            먹튀 피해 제보
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            승인된 피해 제보를 최신순으로 확인하세요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            관리자 검토를 통과한 공개 제보만 표시됩니다. 항목을 선택하면
            해당 사이트 상세 페이지의 먹튀 피해 이력 영역으로 이동합니다.
          </p>
        </div>
        <Link
          href="/submit-scam-report"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
        >
          먹튀 제보하기
        </Link>
      </header>

      {errorMessage ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </section>
      ) : null}

      {source === "fallback" ? (
        <p className="text-sm text-muted">
          Supabase 공개 데이터를 불러오지 못했습니다.
        </p>
      ) : null}

      {items.length > 0 ? (
        <PublicScamReportList items={items} />
      ) : (
        <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">
            공개된 먹튀 피해 제보가 없습니다
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            관리자 승인이 완료된 먹튀 피해 제보가 있으면 이곳에 표시됩니다.
          </p>
        </section>
      )}
    </main>
  );
}
