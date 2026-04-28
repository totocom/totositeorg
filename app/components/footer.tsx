import Link from "next/link";
import { ResponsibleUseNotice } from "@/app/components/responsible-use-notice";

const footerLinks = [
  { href: "/telegram-guide", label: "텔레그램 기능 안내" },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-muted">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ResponsibleUseNotice />
      </div>
    </footer>
  );
}
