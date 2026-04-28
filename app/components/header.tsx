import Link from "next/link";
import { AuthNav } from "@/app/components/auth-nav";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/sites", label: "사이트 목록" },
  { href: "/reviews", label: "만족도 평가" },
  { href: "/scam-reports", label: "먹튀 제보" },
  { href: "/site-registration", label: "사이트 등록" },
];

export function Header() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold text-foreground">
          토토사이트 추천
        </Link>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-muted transition hover:bg-background hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
