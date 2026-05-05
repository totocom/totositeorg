import Link from "next/link";
import type { PublicScamReportListItem } from "@/app/data/public-sites";

type HomeRecentScamReportsProps = {
  reports: PublicScamReportListItem[];
};

function formatDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function formatDamageAmount(report: PublicScamReportListItem) {
  if (report.damageAmountUnknown || report.damageAmount === null) {
    return "피해 금액 미확인";
  }

  return `${report.damageAmount.toLocaleString("ko-KR")}원`;
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
          className="text-sm font-bold text-accent transition hover:text-foreground"
        >
          먹튀 제보 전체 보기
        </Link>
      </div>

      {reports.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {reports.map((report) => (
            <article key={report.id} className="rounded-md bg-background p-4">
              <Link
                href={`/sites/${encodeURIComponent(report.site.slug)}/scam-reports`}
                className="text-sm font-bold text-foreground transition hover:text-accent"
              >
                {report.site.siteName}
              </Link>
              <p className="mt-1 text-sm leading-6 text-muted">
                {report.damageTypes.join(", ") || report.mainCategory} ·{" "}
                {formatDamageAmount(report)}
              </p>
              <p className="mt-2 text-xs text-muted">
                접수일 {formatDate(report.createdAt)} · 작성자{" "}
                {report.authorNickname ?? "익명"}
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
