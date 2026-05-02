import Link from "next/link";
import {
  buildRelatedBlogReportCardModel,
  type PublicSiteRelatedBlogReport,
} from "@/app/data/related-blog-report";

type RelatedBlogReportCardProps = {
  siteName: string;
  report: PublicSiteRelatedBlogReport | null;
};

export function RelatedBlogReportCard({
  siteName,
  report,
}: RelatedBlogReportCardProps) {
  const model = buildRelatedBlogReportCardModel({ siteName, report });

  if (!model) return null;

  return (
    <section className="mt-5 rounded-xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        {model.heading}
      </p>
      <h2 className="mt-1 text-base font-bold">{model.anchor}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{model.description}</p>
      <Link
        href={model.href}
        className="mt-3 inline-flex min-h-10 items-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
        aria-label={`${model.anchor} 보기`}
      >
        {model.anchor}
      </Link>
    </section>
  );
}
