import type { ScamReport } from "@/app/data/sites";

type ScamReportDetailsProps = {
  report: ScamReport;
  siteName?: string;
};

function formatAmount(amount: number | null, unknown = false) {
  if (unknown || amount === null) return "미확인";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function maskSensitive(value: string | null) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (normalized.length <= 4) return "*".repeat(normalized.length);

  return `${normalized.slice(0, 2)}${"*".repeat(
    Math.min(normalized.length - 4, 8),
  )}${normalized.slice(-2)}`;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="rounded-md bg-surface p-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-foreground">
        {value}
      </dd>
    </div>
  );
}

function HighlightItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
      {label}: {value}
    </span>
  );
}

function listText(values: string[], fallback: string) {
  return values.length > 0 ? values.join(", ") : fallback;
}

function buildScamReportSummary(report: ScamReport, siteName?: string) {
  const targetSite = siteName?.trim() || "해당 사이트";
  const categories = [
    report.mainCategory,
    listText(report.categoryItems, ""),
  ]
    .filter(Boolean)
    .join(", ");
  const damage = listText(report.damageTypes, "피해");
  const depositAmount =
    report.depositAmount === null
      ? ""
      : ` 입금액은 ${report.depositAmount.toLocaleString("ko-KR")}원으로 기록되었습니다.`;

  return `${targetSite} 이용자는 ${report.usagePeriod} 동안 ${categories || "사이트 서비스"}를 이용한 뒤 ${damage} 피해를 제보했습니다. 발생일은 ${report.incidentDate}입니다.${depositAmount}`;
}

export function ScamReportDetails({ report, siteName }: ScamReportDetailsProps) {
  const categoryItems = report.categoryItems.join(", ");
  const damageTypes = report.damageTypes.join(", ");
  const maskedDepositBank = maskSensitive(report.depositBankName);
  const maskedDepositAccount = maskSensitive(report.depositAccountNumber);
  const maskedDepositHolder = maskSensitive(report.depositAccountHolder);
  const evidenceImages = report.evidenceImageUrls.filter(Boolean);

  return (
    <div className="mt-3 grid gap-3">
      <p className="rounded-md bg-surface p-3 text-sm leading-6 text-foreground">
        {buildScamReportSummary(report, siteName)}
      </p>

      <div className="flex flex-wrap gap-2">
        <HighlightItem label="발생일" value={report.incidentDate} />
        <HighlightItem label="이용 기간" value={report.usagePeriod} />
        <HighlightItem label="이용 카테고리" value={report.mainCategory} />
        <HighlightItem label="세부 종목" value={categoryItems} />
        <HighlightItem label="피해 유형" value={damageTypes} />
      </div>

      <blockquote className="rounded-md border border-line bg-surface px-3 py-2 text-sm leading-6 text-muted">
        상황 설명: {report.situationDescription}
      </blockquote>

      <details className="rounded-md border border-line bg-surface p-3">
        <summary className="cursor-pointer font-semibold text-foreground">
          상세 제보 응답 보기
        </summary>
        <div className="mt-3 grid gap-3">
          <dl className="grid gap-2 sm:grid-cols-2">
            <DetailItem label="발생일" value={report.incidentDate} />
            <DetailItem label="이용 기간" value={report.usagePeriod} />
            <DetailItem label="이용 카테고리" value={report.mainCategory} />
            <DetailItem label="세부 종목" value={categoryItems} />
            <DetailItem label="카테고리 기타 입력" value={report.categoryEtcText} />
            <DetailItem label="피해 유형" value={damageTypes} />
            <DetailItem
              label="피해 유형 기타 입력"
              value={report.damageTypeEtcText}
            />
            <DetailItem
              label="피해 금액"
              value={formatAmount(
                report.damageAmount,
                report.damageAmountUnknown,
              )}
            />
            <DetailItem
              label="입금 은행/코인 정보"
              value={maskedDepositBank}
            />
            <DetailItem label="입금 계좌/지갑" value={maskedDepositAccount} />
            <DetailItem label="예금주/코인명" value={maskedDepositHolder} />
            <DetailItem
              label="입금액"
              value={
                report.depositAmount === null
                  ? null
                  : `${report.depositAmount.toLocaleString("ko-KR")}원`
              }
            />
            <DetailItem label="입금일" value={report.depositDate} />
            <DetailItem label="증빙 메모" value={report.evidenceNote} />
          </dl>

          {evidenceImages.length > 0 ? (
            <div className="rounded-md bg-surface p-3">
              <p className="text-xs font-semibold text-muted">증빙 이미지</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {evidenceImages.map((imageUrl) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt="먹튀 피해 제보 증빙 이미지"
                    loading="lazy"
                    decoding="async"
                    className="max-h-64 w-full rounded-md border border-line object-contain"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
