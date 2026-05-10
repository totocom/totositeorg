import Link from "next/link";
import { sanitizePublicSiteName } from "@/app/data/public-display";

export type SiteDetailTab = "main" | "scam-reports" | "reviews" | "domains";

type SiteDetailTabsProps = {
  slug: string;
  siteName: string;
  activeTab: SiteDetailTab;
  counts: {
    scamReports: number;
    reviews: number;
    domains: number;
  };
};

export function SiteDetailTabs({
  slug,
  siteName,
  activeTab,
  counts,
}: SiteDetailTabsProps) {
  const encodedSlug = encodeURIComponent(slug);
  const tabSiteName = getTabSiteName(siteName);
  const tabs = [
    {
      id: "main",
      label: `${tabSiteName} 기본 정보`,
      href: `/sites/${encodedSlug}`,
    },
    {
      id: "scam-reports",
      label: `${tabSiteName} 먹튀 제보 ${counts.scamReports}건`,
      href: `/sites/${encodedSlug}/scam-reports`,
    },
    {
      id: "reviews",
      label: `${tabSiteName} 후기 ${counts.reviews}건`,
      href: `/sites/${encodedSlug}/reviews`,
    },
    {
      id: "domains",
      label: `${tabSiteName} 도메인 ${counts.domains}개`,
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
                aria-label={`${tab.label} 페이지`}
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

function getTabSiteName(siteName: string) {
  return (
    sanitizePublicSiteName(siteName)
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "사이트"
  );
}
