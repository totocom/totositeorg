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
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-16 items-center justify-center px-3 py-2"
      >
        <span
          aria-hidden="true"
          className="h-4 w-12 rounded bg-muted/20 motion-safe:animate-pulse"
        />
      </span>
    );
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
