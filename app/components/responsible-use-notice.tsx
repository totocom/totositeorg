import { responsibleUseNotice } from "@/app/data/sites";

const responsibleUseExternalLinks = [
  {
    label: "한국도박문제예방치유원 1336 상담 안내",
    href: "https://www.kcgp.or.kr/",
  },
  {
    label: "경찰청 사이버범죄 신고시스템",
    href: "https://ecrm.police.go.kr/",
  },
] as const;

export function ResponsibleUseNotice({
  variant = "footer",
}: {
  variant?: "footer" | "card";
}) {
  if (variant === "card") {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">책임 있는 이용 안내</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {responsibleUseNotice.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {responsibleUseExternalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              rel="noopener noreferrer"
              target="_blank"
              className="inline-flex min-h-10 items-center rounded-md border border-line bg-background px-3 text-sm font-bold text-foreground transition hover:border-accent hover:text-accent"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-white/40">
        책임 있는 이용 안내
      </h2>
      <ul className="mt-2 grid gap-1 text-xs leading-6 text-white/30">
        {responsibleUseNotice.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </section>
  );
}
