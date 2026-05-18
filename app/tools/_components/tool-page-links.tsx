import Link from "next/link";

const calculatorLinks = [
  {
    href: "/tools/payout-calculator",
    title: "예상 당첨금 계산기",
    description: "베팅 금액과 소수 배당으로 예상 지급액을 계산합니다.",
  },
  {
    href: "/tools/parlay-calculator",
    title: "조합 배당 계산기",
    description: "여러 소수 배당을 곱해 조합 배당을 계산합니다.",
  },
  {
    href: "/tools/implied-probability-calculator",
    title: "배당 확률 계산기",
    description: "소수 배당을 암시 확률로 환산합니다.",
  },
  {
    href: "/tools/expected-value-calculator",
    title: "기대값 계산기",
    description: "예상 적중 확률을 기준으로 이론상 기대값을 계산합니다.",
  },
];

export const toolNoticeText =
  "본 계산기는 소수 배당 기준의 단순 계산을 돕기 위한 정보 제공용 도구입니다. 계산 결과는 실제 수익이나 결과를 보장하지 않으며, 본 사이트는 도박 참여나 특정 사이트 이용을 권장하지 않습니다.";

export function ToolNotice() {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 text-sm leading-6 text-muted shadow-sm">
      {toolNoticeText}
    </section>
  );
}

export function CalculatorLinkGrid({
  currentHref,
  title = "다른 계산기",
}: {
  currentHref?: string;
  title?: string;
}) {
  const links = calculatorLinks.filter((item) => item.href !== currentHref);

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <article
            key={item.href}
            className="rounded-lg border border-line bg-background p-4 transition hover:border-accent/40"
          >
            <h3 className="text-base font-bold text-foreground">
              <Link href={item.href} className="transition hover:text-accent">
                {item.title}
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ToolsHubLink() {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-xl font-bold text-foreground">계산기 모음</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        다른 소수 배당 계산 도구는 계산기 모음 페이지에서 확인할 수 있습니다.
      </p>
      <Link
        href="/tools"
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-background"
      >
        계산기 모음 보기
      </Link>
    </section>
  );
}

export function getCalculatorLinks() {
  return calculatorLinks;
}
