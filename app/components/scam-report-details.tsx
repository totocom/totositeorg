import type { ScamReport } from "@/app/data/sites";
import { ScamReportPublicDetailsDisclosure } from "@/app/components/scam-report-public-details-disclosure";
import {
  formatKoreanDate,
  sanitizePublicGeneratedText,
  sanitizePublicSiteName,
  sanitizePublicUserText,
} from "@/app/data/public-display";

type ScamReportDetailsProps = {
  report: ScamReport;
  siteName?: string;
};

function formatAmount(amount: number | null, unknown = false) {
  if (unknown || amount === null) return "금액 미상";
  return `${amount.toLocaleString("ko-KR")}원`;
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

function sanitizeOptionalPublicText(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;

  return sanitizePublicUserText(normalized);
}

function buildScamReportSummary(report: ScamReport, siteName?: string) {
  const targetSite = sanitizePublicSiteName(siteName);
  const damage = listText(report.damageTypes, "피해");

  return sanitizePublicGeneratedText(
    `승인된 공개 제보 기준으로, 작성자는 ${targetSite} 이용 중 ${damage} 관련 피해를 주장했습니다. 발생일, 이용 기간, 피해 금액, 입금액은 제보자가 제출한 정보를 기준으로 표시됩니다. 이 제보는 참고 자료이며 단일 제보만으로 사이트 전체를 단정하기는 어렵습니다.`,
  );
}

export function ScamReportDetails({ report, siteName }: ScamReportDetailsProps) {
  const categoryItems = report.categoryItems.join(", ");
  const damageTypes = report.damageTypes.join(", ");
  const publicSituationDescription = sanitizePublicUserText(
    report.situationDescription,
  );

  return (
    <div className="mt-3 grid gap-3">
      <p className="rounded-md bg-surface p-3 text-sm leading-6 text-foreground">
        {buildScamReportSummary(report, siteName)}
      </p>

      <div className="flex flex-wrap gap-2">
        <HighlightItem
          label="발생일"
          value={formatKoreanDate(report.incidentDate)}
        />
        <HighlightItem
          label="접수일"
          value={formatKoreanDate(report.createdAt)}
        />
        <HighlightItem label="이용 기간" value={report.usagePeriod} />
        <HighlightItem label="이용 카테고리" value={report.mainCategory} />
        <HighlightItem label="세부 종목" value={categoryItems} />
        <HighlightItem label="피해 유형" value={damageTypes} />
        <HighlightItem
          label="피해 금액"
          value={formatAmount(report.damageAmount, report.damageAmountUnknown)}
        />
        <HighlightItem
          label="입금액"
          value={formatAmount(report.depositAmount)}
        />
      </div>

      <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm leading-6 text-muted">
        <p className="font-semibold text-foreground">상황 설명</p>
        <p className="mt-1 text-xs leading-5">
          아래 내용은 제보자가 직접 작성한 상황 설명이며, 사이트의 공식 판단이나
          사실 확정을 의미하지 않습니다.
        </p>
        <p className="mt-2 whitespace-pre-line break-words text-foreground">
          {publicSituationDescription}
        </p>
      </div>

      <ScamReportPublicDetailsDisclosure label="상세 제보 응답 보기">
        <section>
          <h4 className="text-sm font-bold text-foreground">공개 가능한 제보 항목</h4>
          <p className="mt-2 rounded-md border border-line bg-background px-3 py-2 text-xs leading-5 text-muted">
            입금 은행/코인 정보, 계좌/지갑 주소, 예금주, 연락처, 증빙 이미지
            원본 등 민감 정보는 공개 페이지에서 표시하지 않으며 관리자 검토용
            자료로만 다룹니다.
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <DetailItem
              label="발생일"
              value={formatKoreanDate(report.incidentDate)}
            />
            <DetailItem
              label="접수일"
              value={formatKoreanDate(report.createdAt)}
            />
            <DetailItem label="이용 기간" value={report.usagePeriod} />
            <DetailItem label="이용 카테고리" value={report.mainCategory} />
            <DetailItem label="세부 종목" value={categoryItems} />
            <DetailItem
              label="카테고리 기타 입력"
              value={sanitizeOptionalPublicText(report.categoryEtcText)}
            />
            <DetailItem label="피해 유형" value={damageTypes} />
            <DetailItem
              label="피해 유형 기타 입력"
              value={sanitizeOptionalPublicText(report.damageTypeEtcText)}
            />
            <DetailItem
              label="피해 금액"
              value={formatAmount(
                report.damageAmount,
                report.damageAmountUnknown,
              )}
            />
            <DetailItem
              label="입금액"
              value={formatAmount(report.depositAmount)}
            />
            <DetailItem
              label="입금일"
              value={
                report.depositDate ? formatKoreanDate(report.depositDate) : null
              }
            />
            <DetailItem
              label="증빙 메모"
              value={sanitizeOptionalPublicText(report.evidenceNote)}
            />
          </dl>
        </section>
      </ScamReportPublicDetailsDisclosure>
    </div>
  );
}
