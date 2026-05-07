import Link from "next/link";
import { formatKoreanDate } from "@/app/data/public-display";
import type { PublicScamReportListItem } from "@/app/data/public-sites";

type HomeRecentScamReportsProps = {
  reports: PublicScamReportListItem[];
};

function formatDamageAmount(report: PublicScamReportListItem) {
  if (report.damageAmountUnknown || report.damageAmount === null) {
    return "금액 미상";
  }

  return `${report.damageAmount.toLocaleString("ko-KR")}원`;
}

function getDamageSummary(report: PublicScamReportListItem) {
  return report.damageTypes.join(", ") || report.mainCategory;
}

export function HomeRecentScamReports({
  reports,
}: HomeRecentScamReportsProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            최근 제보
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">
            최근 승인된 먹튀 제보
          </h2>
        </div>
        <Link
          href="/scam-reports"
          aria-label="최근 먹튀 제보 전체 보기"
          className="text-sm font-bold text-accent transition hover:text-foreground"
        >
          먹튀 제보 전체 보기
        </Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        아래 제보는 승인된 공개 제보 기준으로 표시되며, 단일 제보만으로
        사이트 전체 상태를 단정하지 않는 것이 좋습니다.
      </p>

      {reports.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {reports.map((report) => (
            <article key={report.id} className="rounded-md bg-background p-4">
              <Link
                href={`/sites/${encodeURIComponent(report.site.slug)}/scam-reports`}
                aria-label={`${report.site.siteName} 먹튀 제보 상세 보기`}
                className="text-sm font-bold text-foreground transition hover:text-accent"
              >
                {report.site.siteName}
              </Link>
              <h3 className="mt-2 text-sm font-bold text-foreground">
                {getDamageSummary(report)}
              </h3>
              <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                피해 금액: {formatDamageAmount(report)}
              </p>
              <p className="mt-2 text-xs text-muted">
                접수일 {formatKoreanDate(report.createdAt)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-background p-4 text-sm text-muted">
          현재 공개 승인된 먹튀 제보가 없습니다.
        </p>
      )}
    </section>
  );
}
