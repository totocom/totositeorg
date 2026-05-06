import type { Metadata } from "next";
import { ProfileDashboard } from "@/app/components/profile-dashboard";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function ProfilesPage() {
  return <ProfileDashboard />;
}
