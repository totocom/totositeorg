"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type AdminShellProps = {
  children: ReactNode;
};

type AdminNavItem = {
  href: string;
  label: string;
  description: string;
};

type AdminNavCounts = {
  totalPending: number;
  pendingSites: number;
  pendingDomainSubmissions: number;
  pendingReviews: number;
  pendingScamReports: number;
  rejectedSites: number;
  rejectedReviews: number;
  rejectedScamReports: number;
  users: number;
  publishedBlogPosts: number;
  draftBlogPosts: number;
};

const primaryNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "대시보드",
    description: "검토 현황",
  },
  {
    href: "/admin/sites",
    label: "사이트 검토",
    description: "승인 대기와 공개 사이트",
  },
  {
    href: "/admin/site-registration",
    label: "사이트 등록",
    description: "관리자 직접 등록",
  },
  {
    href: "/admin/blog",
    label: "블로그 관리",
    description: "게시물 작성과 공개",
  },
  {
    href: "/admin/reviews",
    label: "만족도 평가",
    description: "리뷰 승인 관리",
  },
  {
    href: "/admin/scam-reports",
    label: "먹튀 제보",
    description: "피해 제보 검토",
  },
  {
    href: "/admin/users",
    label: "회원 관리",
    description: "계정과 권한 확인",
  },
];

const secondaryNavItems: AdminNavItem[] = [
  {
    href: "/admin/rejected-sites",
    label: "거절된 사이트",
    description: "반려된 사이트",
  },
  {
    href: "/admin/rejected-reviews",
    label: "거절된 리뷰",
    description: "반려된 평가",
  },
  {
    href: "/admin/surveys",
    label: "설문 관리",
    description: "리뷰 설문",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function countOrZero(result: { count: number | null }) {
  return result.count ?? 0;
}

function getNavCount(item: AdminNavItem, counts: AdminNavCounts | null) {
  if (!counts) return undefined;

  switch (item.href) {
    case "/admin":
      return counts.totalPending;
    case "/admin/sites":
      return counts.pendingSites + counts.pendingDomainSubmissions;
    case "/admin/reviews":
      return counts.pendingReviews;
    case "/admin/scam-reports":
      return counts.pendingScamReports;
    case "/admin/blog":
      return counts.publishedBlogPosts + counts.draftBlogPosts;
    case "/admin/users":
      return counts.users;
    case "/admin/rejected-sites":
      return counts.rejectedSites;
    case "/admin/rejected-reviews":
      return counts.rejectedReviews;
    case "/admin/surveys":
      return counts.pendingReviews;
    default:
      return undefined;
  }
}

function getNavDescription(item: AdminNavItem, counts: AdminNavCounts | null) {
  if (!counts) return item.description;

  switch (item.href) {
    case "/admin":
      return `${counts.totalPending}개 검토 필요`;
    case "/admin/sites":
      return `사이트 ${counts.pendingSites} · 도메인 ${counts.pendingDomainSubmissions}`;
    case "/admin/reviews":
      return `대기 ${counts.pendingReviews} · 거절 ${counts.rejectedReviews}`;
    case "/admin/scam-reports":
      return `대기 ${counts.pendingScamReports} · 거절 ${counts.rejectedScamReports}`;
    case "/admin/blog":
      return `공개 ${counts.publishedBlogPosts} · 초안 ${counts.draftBlogPosts}`;
    case "/admin/users":
      return `${counts.users}명`;
    case "/admin/rejected-sites":
      return `${counts.rejectedSites}개`;
    case "/admin/rejected-reviews":
      return `${counts.rejectedReviews}개`;
    case "/admin/surveys":
      return `대기 리뷰 ${counts.pendingReviews}개`;
    default:
      return item.description;
  }
}

function AdminNavLink({
  item,
  counts,
}: {
  item: AdminNavItem;
  counts: AdminNavCounts | null;
}) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, item.href);
  const count = getNavCount(item, counts);
  const description = getNavDescription(item, counts);

  return (
    <Link
      href={item.href}
      className={`block rounded-md border px-3 py-2.5 transition ${
        isActive
          ? "border-accent bg-accent text-white shadow-sm"
          : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="block text-sm font-bold">{item.label}</span>
        {typeof count === "number" ? (
          <span
            className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ${
              isActive ? "bg-white text-accent" : "bg-white/10 text-white"
            }`}
          >
            {count}
          </span>
        ) : null}
      </span>
      <span
        className={`mt-0.5 block text-xs ${
          isActive ? "text-white/75" : "text-white/40"
        }`}
      >
        {description}
      </span>
    </Link>
  );
}

function MobileNavLink({
  item,
  counts,
}: {
  item: AdminNavItem;
  counts: AdminNavCounts | null;
}) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, item.href);
  const count = getNavCount(item, counts);

  return (
    <Link
      href={item.href}
      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-bold transition ${
        isActive
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-muted hover:text-foreground"
      }`}
    >
      <span>{item.label}</span>
      {typeof count === "number" ? (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
            isActive ? "bg-white text-accent" : "bg-background text-muted"
          }`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();
  const navItems = [...primaryNavItems, ...secondaryNavItems];
  const [navCounts, setNavCounts] = useState<AdminNavCounts | null>(null);

  const loadNavCounts = useCallback(async () => {
    if (!isAdmin) {
      return null;
    }

    const [
      pendingSites,
      rejectedSites,
      pendingDomainSubmissions,
      pendingReviews,
      rejectedReviews,
      pendingScamReports,
      rejectedScamReports,
      publishedBlogPosts,
      draftBlogPosts,
      sessionResult,
    ] = await Promise.all([
      supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
      supabase
        .from("site_domain_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
      supabase
        .from("scam_reports")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "pending"),
      supabase
        .from("scam_reports")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "rejected"),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase.auth.getSession(),
    ]);

    let users = 0;
    const accessToken = sessionResult.data.session?.access_token;

    if (accessToken) {
      const response = await fetch("/api/admin/users", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => null);
      const result = response
        ? ((await response.json().catch(() => null)) as {
            users?: unknown[];
          } | null)
        : null;

      users = result?.users?.length ?? 0;
    }

    const nextCounts = {
      pendingSites: countOrZero(pendingSites),
      pendingDomainSubmissions: countOrZero(pendingDomainSubmissions),
      pendingReviews: countOrZero(pendingReviews),
      pendingScamReports: countOrZero(pendingScamReports),
      rejectedSites: countOrZero(rejectedSites),
      rejectedReviews: countOrZero(rejectedReviews),
      rejectedScamReports: countOrZero(rejectedScamReports),
      publishedBlogPosts: countOrZero(publishedBlogPosts),
      draftBlogPosts: countOrZero(draftBlogPosts),
      users,
    };

    return {
      ...nextCounts,
      totalPending:
        nextCounts.pendingSites +
        nextCounts.pendingDomainSubmissions +
        nextCounts.pendingReviews +
        nextCounts.pendingScamReports,
    };
  }, [isAdmin]);

  useEffect(() => {
    let isCancelled = false;

    async function refreshCounts() {
      const nextCounts = await loadNavCounts();

      if (!isCancelled) {
        setNavCounts(nextCounts);
      }
    }

    function handleCountsRefresh() {
      void refreshCounts();
    }

    void refreshCounts();
    window.addEventListener("admin-counts-refresh", handleCountsRefresh);

    return () => {
      isCancelled = true;
      window.removeEventListener("admin-counts-refresh", handleCountsRefresh);
    };
  }, [loadNavCounts]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-foreground dark:bg-[#0f0f0f]">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-white/10 lg:bg-[#111111]">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <Link href="/admin" className="flex items-center gap-3 text-white">
              <picture className="shrink-0">
                <source srcSet="/logo-96.avif" type="image/avif" />
                <source srcSet="/logo-96.webp" type="image/webp" />
                <img
                  src="/logo-96.webp"
                  alt="토토사이트 정보 로고"
                  width="56"
                  height="56"
                  className="neon-logo h-9 w-9 shrink-0"
                />
              </picture>
              <span>
                <span className="block text-base font-extrabold">
                  관리자 콘솔
                </span>
                <span className="block text-xs font-semibold text-white/40">
                  토토사이트 정보
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="grid gap-1.5">
              {primaryNavItems.map((item) => (
                <AdminNavLink key={item.href} item={item} counts={navCounts} />
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="px-3 text-xs font-bold uppercase text-white/30">
                보관함
              </p>
              <div className="mt-2 grid gap-1.5">
                {secondaryNavItems.map((item) => (
                  <AdminNavLink key={item.href} item={item} counts={navCounts} />
                ))}
              </div>
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold uppercase text-white/35">
                로그인 상태
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {isLoading
                  ? "확인 중"
                  : user?.email ?? "로그인이 필요합니다"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {isAdmin ? "관리자 권한 확인됨" : "권한 확인 대기"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/95">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-accent">
                Admin
              </p>
              <h1 className="truncate text-base font-extrabold text-foreground sm:text-lg">
                운영 관리
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/"
                className="hidden h-10 items-center rounded-md border border-line px-3 text-sm font-bold text-muted transition hover:text-foreground sm:inline-flex"
              >
                사이트 보기
              </Link>
              <Link
                href="/profiles"
                className="hidden h-10 items-center rounded-md border border-line px-3 text-sm font-bold text-muted transition hover:text-foreground sm:inline-flex"
              >
                내 계정
              </Link>
              <ThemeToggle />
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="h-10 rounded-md border border-line px-3 text-sm font-bold text-muted transition hover:text-foreground"
                >
                  로그아웃
                </button>
              ) : (
                <Link
                  href="/login?redirectTo=/admin"
                  className="h-10 rounded-md bg-accent px-3 py-2 text-sm font-bold text-white"
                >
                  로그인
                </Link>
              )}
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-line px-4 py-3 sm:px-6 lg:hidden">
            {navItems.map((item) => (
              <MobileNavLink key={item.href} item={item} counts={navCounts} />
            ))}
          </nav>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
