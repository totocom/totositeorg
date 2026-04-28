import type { Metadata } from "next";
import Link from "next/link";
import { getPublicScamReportList } from "@/app/data/public-sites";
import { siteDescription, siteName, siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function formatDamageAmount(amount: number | null, isUnknown: boolean) {
  if (isUnknown || amount === null) return "피해 금액 미확인";
  return `${amount.toLocaleString("ko-KR")}원`;
}

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
        <section className="grid gap-4">
          {items.map((report) => (
            <article
              key={report.id}
              className="rounded-lg border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/sites/${report.site.slug}#scam-reports`}
                    className="text-sm font-semibold text-accent transition hover:text-foreground"
                  >
                    {report.site.siteName}
                  </Link>
                  <h2 className="mt-1 text-xl font-bold text-foreground">
                    {report.damageTypes.join(", ") || report.mainCategory}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    발생일 {formatDate(report.incidentDate)} · 접수일{" "}
                    {formatDate(report.createdAt)}
                  </p>
                </div>
                <p className="w-fit rounded-md bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                  {formatDamageAmount(
                    report.damageAmount,
                    report.damageAmountUnknown,
                  )}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  이용 기간 {report.usagePeriod}
                </span>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">
                  {report.mainCategory}
                </span>
                {report.categoryItems.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted">
                {report.situationDescription}
              </p>
              <div className="mt-4">
                <Link
                  href={`/sites/${report.site.slug}#scam-reports`}
                  className="text-sm font-semibold text-accent transition hover:text-foreground"
                >
                  해당 게시물 보기
                </Link>
              </div>
            </article>
          ))}
        </section>
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
