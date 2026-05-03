import Link from "next/link";
import { buildSiteFeedbackSubmissionGuide } from "@/app/data/site-feedback-submission-guide";

type SiteFeedbackSubmissionGuideProps = {
  siteId: string;
  siteName: string;
  reduced?: boolean;
};

export function SiteFeedbackSubmissionGuide({
  siteId,
  siteName,
  reduced = false,
}: SiteFeedbackSubmissionGuideProps) {
  const guide = buildSiteFeedbackSubmissionGuide({ siteId, siteName });
  const paragraphs = reduced ? guide.paragraphs.slice(0, 1) : guide.paragraphs;

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
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="grid gap-2 pt-1">
          {guide.actions.map((action) => (
            <Link
              key={action.kind}
              href={action.href}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
