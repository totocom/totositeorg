import Link from "next/link";
import { AdminFooterButton } from "@/app/components/admin-footer-button";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";
import { footerNavigationLinks } from "@/app/data/site-navigation";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-[#111111]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-accent">★</span>
              토토사이트 추천
            </div>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
              이용자 경험 공유와 정보 제공을 위한 플랫폼입니다.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerNavigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/50 transition hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-6 border-t border-white/10 pt-6">
          <ResponsibleUseNotice />
        </div>
        <AdminFooterButton />
      </div>
    </footer>
  );
}
