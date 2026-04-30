"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

export function AuthNav() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (isLoading) {
    return <span className="px-3 py-2 text-sm text-muted">확인 중</span>;
  }

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
        >
          로그인
        </Link>
      </>
    );
  }

  return (
    <>
      {!isAdmin ? (
        <Link
          href="/account"
          className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
        >
          내 리뷰
        </Link>
      ) : null}
      {isAdmin ? (
        <Link
          href="/admin"
          className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
        >
          관리자
        </Link>
      ) : null}
      <Link
        href="/profiles"
        className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
      >
        내 계정
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
      >
        로그아웃
      </button>
    </>
  );
}
