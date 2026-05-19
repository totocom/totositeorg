import Link from "next/link";

const calculatorLinks = [
  {
    href: "/tools/payout-calculator",
    title: "예상 당첨금 계산기",
    description:
      "베팅 금액과 소수 배당을 입력해 예상 지급액과 예상 수익을 계산합니다. 단일 배당 결과를 빠르게 확인할 때 사용할 수 있습니다.",
    ctaText: "예상 당첨금 계산하기",
  },
  {
    href: "/tools/parlay-calculator",
    title: "조합 배당 계산기",
    description:
      "여러 개의 소수 배당을 곱해 조합 배당, 예상 지급액, 예상 수익을 계산합니다. 2개 이상 선택한 조합 결과를 비교할 때 사용할 수 있습니다.",
    ctaText: "조합 배당 계산하기",
  },
  {
    href: "/tools/implied-probability-calculator",
    title: "배당 확률 계산기",
    description:
      "소수 배당을 암시 확률로 변환합니다. 배당 2.00은 50%, 배당 1.50은 약 66.7%처럼 이론상 확률을 확인할 수 있습니다.",
    ctaText: "배당 확률 계산하기",
  },
  {
    href: "/tools/expected-value-calculator",
    title: "기대값 계산기",
    description:
      "베팅 금액, 소수 배당, 예상 적중 확률을 입력해 이론상 기대값을 계산합니다. 계산 결과는 사용자가 입력한 확률에 따른 참고값입니다.",
    ctaText: "기대값 계산하기",
  },
  {
    href: "/tools/hedge-calculator",
    title: "헤지 계산기",
    description:
      "기존 베팅과 반대 결과 배당을 입력해 결과별 예상 손익을 비교합니다. 실제 결과를 확정하는 기능이 아니라 손익 구조를 확인하는 참고 계산기입니다.",
    ctaText: "헤지 금액 계산하기",
  },
  {
    href: "/tools/no-vig-calculator",
    title: "북메이커 마진 계산기",
    description:
      "2개 또는 3개 결과의 소수 배당을 입력해 암시 확률 합산값과 이론상 마진을 계산합니다.",
    ctaText: "북메이커 마진 계산하기",
  },
  {
    href: "/tools/odds-difference-calculator",
    title: "배당 차이 계산기",
    description:
      "서로 다른 결과의 배당과 총 계산 금액을 입력해 결과별 배분 금액과 이론상 손익을 비교합니다.",
    ctaText: "배당 차이 계산하기",
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
            <h3 className="text-base font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {item.description}
            </p>
            <Link
              href={item.href}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              {item.ctaText}
            </Link>
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
