"use client";

import Link from "next/link";
import { useAuth } from "@/app/components/auth-provider";

type AdminSiteDetailActionsProps = {
  siteId: string;
  siteSlug: string;
};

export function AdminSiteDetailActions({
  siteId,
  siteSlug,
}: AdminSiteDetailActionsProps) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/blog?siteSlug=${encodeURIComponent(siteSlug)}`}
        className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
      >
        AI 블로그 초안
      </Link>
      <Link
        href={`/admin/sites/${siteId}/edit`}
        className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
      >
        사이트 수정
      </Link>
    </div>
  );
}
