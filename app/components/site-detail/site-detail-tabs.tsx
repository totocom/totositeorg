import Link from "next/link";

export type SiteDetailTab = "main" | "scam-reports" | "reviews" | "domains";

type SiteDetailTabsProps = {
  slug: string;
  activeTab: SiteDetailTab;
  counts: {
    scamReports: number;
    reviews: number;
    domains: number;
  };
};

export function SiteDetailTabs({
  slug,
  activeTab,
  counts,
}: SiteDetailTabsProps) {
  const encodedSlug = encodeURIComponent(slug);
  const tabs = [
    { id: "main", label: "메인 정보", href: `/sites/${encodedSlug}` },
    {
      id: "scam-reports",
      label: `먹튀 제보 (${counts.scamReports})`,
      href: `/sites/${encodedSlug}/scam-reports`,
    },
    {
      id: "reviews",
      label: `후기 (${counts.reviews})`,
      href: `/sites/${encodedSlug}/reviews`,
    },
    {
      id: "domains",
      label: `주소·도메인 (${counts.domains})`,
      href: `/sites/${encodedSlug}/domains`,
    },
  ] satisfies Array<{
    id: SiteDetailTab;
    label: string;
    href: string;
  }>;

  return (
    <nav
      className="mt-4 border-t border-line pt-3"
      aria-label="사이트 상세 페이지 탐색"
    >
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const className =
            "shrink-0 rounded-md border px-3 py-2 text-sm font-bold transition";

          return (
            <li key={tab.id} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? `${className} border-accent bg-accent-soft text-accent`
                    : `${className} border-line bg-background text-foreground hover:border-accent hover:text-accent`
                }
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
