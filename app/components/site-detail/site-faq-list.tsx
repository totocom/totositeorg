import type { SiteFaqItem } from "@/app/components/site-detail/site-json-ld";

type SiteFaqListProps = {
  title: string;
  items: SiteFaqItem[];
};

export function SiteFaqList({ title, items }: SiteFaqListProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <details
            key={item.question}
            className="rounded-md border border-line bg-background p-4"
          >
            <summary className="cursor-pointer text-sm font-bold text-foreground">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
