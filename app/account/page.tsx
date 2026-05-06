import type { Metadata } from "next";
import { AccountDashboard } from "@/app/components/account-dashboard";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function AccountPage() {
  return <AccountDashboard />;
}
