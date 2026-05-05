import type { HomePageStats } from "@/app/data/public-home";

type HomeHeroStatsProps = {
  stats: HomePageStats;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

export function HomeHeroStats({ stats }: HomeHeroStatsProps) {
  const items = [
    { label: "등록 사이트", value: `${formatCount(stats.siteCount)}개` },
    { label: "누적 제보", value: `${formatCount(stats.scamReportCount)}건` },
    { label: "누적 후기", value: `${formatCount(stats.reviewCount)}건` },
  ];

  return (
    <dl className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-2xl">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-white/15 bg-white/10 px-4 py-3"
        >
          <dt className="text-xs font-semibold text-white/50">{item.label}</dt>
          <dd className="mt-1 text-2xl font-black text-white">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
