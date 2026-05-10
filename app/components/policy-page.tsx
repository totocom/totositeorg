import type { ReactNode } from "react";

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  effectiveDate: string;
  children: ReactNode;
};

export function PolicyPage({
  eyebrow,
  title,
  description,
  effectiveDate,
  children,
}: PolicyPageProps) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase text-accent">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        <p className="mt-4 text-xs font-semibold text-muted">
          시행일: {effectiveDate}
        </p>
      </header>
      <div className="mt-6 grid gap-5">{children}</div>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
        {children}
      </div>
    </section>
  );
}

export function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-md bg-background px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}
