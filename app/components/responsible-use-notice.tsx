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

const shortResponsibleUseNotice =
  "본 사이트는 이용자 경험 공유와 정보 제공을 위한 플랫폼이며, 특정 사이트 이용이나 가입을 권장하지 않습니다. 후기와 제보는 참고 자료이며, 단일 정보만으로 사이트 전체 상태를 단정하지 않는 것이 좋습니다.";

export function ResponsibleUseNotice({
  variant = "footer",
  heading = "책임 있는 이용 안내",
}: {
  variant?: "footer" | "card" | "compact";
  heading?: string;
}) {
  if (variant === "compact") {
    return (
      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-base font-bold text-foreground">{heading}</h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          {shortResponsibleUseNotice}
        </p>
      </section>
    );
  }

  if (variant === "card") {
    return (
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-bold text-foreground">{heading}</h2>
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
      <p className="mt-2 max-w-xl text-xs leading-6 text-white/35">
        {shortResponsibleUseNotice}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {responsibleUseExternalLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
            className="text-xs font-semibold text-white/40 transition hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
