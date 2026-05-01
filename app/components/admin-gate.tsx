"use client";

import Link from "next/link";
import {
  AdminDashboard,
  type AdminSection,
} from "@/app/components/admin-dashboard";
import { useAuth } from "@/app/components/auth-provider";

export function AdminGate({ section = "home" }: { section?: AdminSection }) {
  const { user, isAdmin, isLoading, errorMessage } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-lg border border-line bg-surface p-5 text-sm text-muted shadow-sm">
          로그인 상태를 확인하는 중입니다.
        </section>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
          {errorMessage}
        </section>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h1 className="text-2xl font-bold">관리자 페이지 로그인 필요</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            관리자 페이지는 로그인 후 관리자 권한이 확인된 계정만 접근할 수
            있습니다.
          </p>
          <Link
            href="/login?redirectTo=/admin"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white"
          >
            로그인으로 이동
          </Link>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h1 className="text-2xl font-bold">관리자 권한이 없습니다.</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            현재 로그인한 계정은 관리자 목록에 등록되어 있지 않습니다.
            관리자 이메일 등록은 Supabase SQL Editor에서 처리해야 합니다.
          </p>
        </section>
      </div>
    );
  }

  return <AdminDashboard section={section} />;
}
