import { AdminSiteEdit } from "@/app/components/admin-site-edit";

type AdminSiteEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminSiteEditPage({
  params,
}: AdminSiteEditPageProps) {
  const { id } = await params;

  return <AdminSiteEdit siteId={id} />;
}
