import Link from "next/link";

type RelatedLinkItem = {
  href: string;
  title: string;
  description: string;
};

type RelatedLinkListProps = {
  items: RelatedLinkItem[];
  className?: string;
};

export function RelatedLinkList({
  items,
  className = "mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4",
}: RelatedLinkListProps) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.href}>
          <article className="h-full rounded-lg border border-line bg-background p-4 transition hover:border-accent/40">
            <h3 className="text-base font-bold text-foreground">
              <Link href={item.href} className="transition hover:text-accent">
                {item.title}
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {item.description}
            </p>
          </article>
        </li>
      ))}
    </ul>
  );
}
