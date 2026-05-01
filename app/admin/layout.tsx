import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";

export const metadata: Metadata = {
  title: {
    template: "%s | 관리자",
    default: "관리자",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
