import type { Metadata } from "next";
import { SubmitReviewForm } from "@/app/components/submit-review-form";
import { getApprovedSites } from "@/app/data/sites";

export const metadata: Metadata = {
  title: "토토사이트 만족도 평가",
  description:
    "관리자가 등록한 토토사이트에 대해 이용 목적, 카테고리, 배당, 이벤트, 고객센터, 충환전, 사용성, 신뢰도 만족도를 평가해 주세요.",
};

type SubmitReviewPageProps = {
  searchParams?: Promise<{
    siteId?: string;
  }>;
};

export default async function SubmitReviewPage({
  searchParams,
}: SubmitReviewPageProps) {
  const sites = getApprovedSites();
  const params = await searchParams;
  const selectedSiteId = params?.siteId?.trim() ?? "";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">
          만족도 평가
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          사이트 이용 리뷰/만족도 평가
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          관리자가 등록한 사이트를 선택한 뒤 이용 목적, 서비스 카테고리,
          배당, 이벤트, 고객센터, 충환전, 사용성, 신뢰도 항목을 평가해주세요.
          제출된 내용은 관리자 검토 후 공개됩니다.
        </p>
      </div>

      <SubmitReviewForm sites={sites} selectedSiteId={selectedSiteId} />
    </main>
  );
}
