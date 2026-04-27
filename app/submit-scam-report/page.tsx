import type { Metadata } from "next";
import { ScamReportForm } from "@/app/components/scam-report-form";

export const metadata: Metadata = {
  title: "먹튀 피해 제보",
  description:
    "등록된 토토사이트에 대해 먹튀 피해 발생 일자, 피해 유형, 금액, 상황 설명을 작성해 관리자 검토를 요청하세요.",
};

type SubmitScamReportPageProps = {
  searchParams?: Promise<{
    siteId?: string;
  }>;
};

export default async function SubmitScamReportPage({
  searchParams,
}: SubmitScamReportPageProps) {
  const params = await searchParams;
  const selectedSiteId = params?.siteId ?? "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          먹튀 피해 이력
        </p>
        <h1 className="mt-1 text-3xl font-bold">먹튀 피해 제보</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          등록된 사이트를 선택한 뒤 피해 발생 일자, 이용 기간, 피해 유형,
          피해 금액, 상황 설명을 작성해주세요. 제출된 제보는 관리자 검토 후
          공개됩니다.
        </p>
      </div>

      <ScamReportForm selectedSiteId={selectedSiteId} />
    </main>
  );
}
