import { AdminGate } from "@/app/components/admin-gate";

type AdminBlogPageProps = {
  searchParams?: Promise<{
    siteSlug?: string | string[];
    siteId?: string | string[];
  }>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AdminBlogPage({
  searchParams,
}: AdminBlogPageProps) {
  const params = searchParams ? await searchParams : {};
  const initialBlogSourceSiteInput =
    firstSearchParam(params.siteSlug) || firstSearchParam(params.siteId);

  return (
    <AdminGate
      section="blog"
      initialBlogSourceSiteInput={initialBlogSourceSiteInput}
    />
  );
}
