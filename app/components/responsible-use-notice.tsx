import { responsibleUseNotice } from "@/app/data/sites";

export function ResponsibleUseNotice() {
  return (
    <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">
        책임 있는 이용 안내
      </h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
        {responsibleUseNotice.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </section>
  );
}
