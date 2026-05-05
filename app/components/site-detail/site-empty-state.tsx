import Link from "next/link";

type SiteEmptyStateProps = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

export function SiteEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: SiteEmptyStateProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <Link
        href={actionHref}
        className="mt-4 inline-flex min-h-10 items-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
