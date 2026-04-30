"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/auth-provider";
import { supabase } from "@/lib/supabase/client";

type UserProfile = {
  username: string;
  nickname: string;
};

type ProfileDataResult =
  | {
      profile: UserProfile | null;
      errorMessage: "";
    }
  | {
      profile: null;
      errorMessage: string;
    };

async function fetchProfileData(userId: string): Promise<ProfileDataResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, nickname")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      profile: null,
      errorMessage:
        "계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return {
    profile: (data as UserProfile | null) ?? null,
    errorMessage: "",
  };
}

export function ProfileDashboard() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        return;
      }

      const result = await fetchProfileData(user.id);

      if (!isMounted) {
        return;
      }

      setProfile(result.profile);
      setErrorMessage(result.errorMessage);
      setIsLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user, isAuthLoading]);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          계정 정보를 불러오는 중입니다.
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            내 계정 정보를 확인하려면 먼저 로그인해주세요.
          </p>
          <Link
            href="/login?redirectTo=/profiles"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            로그인
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-accent">내 계정</p>
        <h1 className="mt-1 text-3xl font-bold">계정 정보</h1>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">아이디</p>
            <p className="mt-2 font-semibold">{profile?.username ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted">닉네임</p>
            <p className="mt-2 font-semibold">{profile?.nickname ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted">내 이메일</p>
            <p className="mt-2 break-all font-semibold">{user.email ?? "-"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
