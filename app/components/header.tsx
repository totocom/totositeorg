"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthNav } from "@/app/components/auth-nav";
import { ThemeToggle } from "@/app/components/theme-toggle";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/sites", label: "사이트 목록" },
  { href: "/reviews", label: "만족도 평가" },
  { href: "/scam-reports", label: "먹튀 제보" },
  { href: "/site-registration", label: "사이트 등록" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111111]">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/android-chrome-192x192.png"
              alt="토토사이트 추천 로고"
              width="56"
              height="56"
              className="neon-logo h-7 w-7 shrink-0"
            />
            토토사이트 추천
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/20 text-white transition hover:bg-white/10 md:hidden"
          >
            <span className="grid gap-1.5" aria-hidden="true">
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-current transition ${
                  isMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-1 flex items-center gap-1 [&_a]:text-white/70 [&_a:hover]:text-white [&_button]:text-white/70 [&_button:hover]:text-white">
              <AuthNav />
              <ThemeToggle />
            </div>
          </nav>
        </div>

        <nav
          id="mobile-navigation"
          className={`md:hidden ${
            isMenuOpen ? "grid" : "hidden"
          } mt-3 gap-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-3 [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_button]:flex [&_button]:min-h-11 [&_button]:items-center [&_button]:rounded-md [&_button]:px-3 [&_button]:py-2`}
        >
          <div className="grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="grid gap-1 border-t border-white/10 pt-2 [&_a]:text-white/70 [&_a:hover]:text-white [&_button]:text-white/70 [&_button:hover]:text-white">
            <AuthNav />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
