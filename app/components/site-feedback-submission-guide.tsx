import { buildSiteFeedbackSubmissionGuide } from "@/app/data/site-feedback-submission-guide";

type SiteFeedbackSubmissionGuideProps = {
  siteId: string;
  siteName: string;
};

export function SiteFeedbackSubmissionGuide({
  siteId,
  siteName,
}: SiteFeedbackSubmissionGuideProps) {
  const guide = buildSiteFeedbackSubmissionGuide({ siteId, siteName });

  return (
    <section
      id="feedback-submission-guide"
      className="scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm"
    >
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          후기 및 제보 등록 안내
        </p>
        <h2 className="mt-1 break-keep text-base font-bold">{guide.title}</h2>
      </div>
      <div className="space-y-3 p-5 text-sm leading-7 text-muted">
        {guide.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
