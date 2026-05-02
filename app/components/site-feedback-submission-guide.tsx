import Link from "next/link";
import { buildSiteFeedbackSubmissionGuide } from "@/app/data/site-feedback-submission-guide";

type SiteFeedbackSubmissionGuideProps = {
  siteId: string;
  siteName: string;
};

const actionClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-center text-sm font-semibold leading-5 text-white transition hover:bg-accent/80 active:scale-95";

const secondaryActionClassName =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-background px-4 py-2 text-center text-sm font-semibold leading-5 text-foreground transition hover:border-accent/40 hover:text-accent active:scale-95";

export function SiteFeedbackSubmissionGuide({
  siteId,
  siteName,
}: SiteFeedbackSubmissionGuideProps) {
  const guide = buildSiteFeedbackSubmissionGuide({ siteId, siteName });

  return (
    <section
      id="feedback-submission-guide"
      className="mt-5 scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm"
    >
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          후기 및 제보 등록 안내
        </p>
        <h2 className="mt-1 break-keep text-base font-bold">{guide.title}</h2>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_17rem] lg:items-start">
        <div className="space-y-3 text-sm leading-7 text-muted">
          {guide.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link href={guide.actions[0].href} className={actionClassName}>
            {guide.actions[0].label}
          </Link>
          <Link
            href={guide.actions[1].href}
            className={secondaryActionClassName}
          >
            {guide.actions[1].label}
          </Link>
        </div>
      </div>
    </section>
  );
}
