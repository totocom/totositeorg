import Link from "next/link";
import {
  EmptyStateIllustration,
  type EmptyStateIllustrationKind,
} from "@/app/components/empty-state-illustration";

type SiteEmptyStateProps = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  actionRel?: string;
  illustrationKind?: EmptyStateIllustrationKind;
  illustrationAlt?: string;
};

export function SiteEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  actionRel,
  illustrationKind = "search",
  illustrationAlt,
}: SiteEmptyStateProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 text-center shadow-sm">
      <EmptyStateIllustration
        kind={illustrationKind}
        alt={illustrationAlt}
      />
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <Link
        href={actionHref}
        rel={actionRel}
        className="mt-4 inline-flex min-h-10 items-center rounded-md border border-accent bg-accent px-4 text-sm font-bold text-white transition hover:bg-accent/80"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
