import { POST as generateBlogDraftFromSite } from "@/app/api/admin/blog/generate-from-site/route";

export const runtime = "nodejs";

type SiteBlogDraftContext = {
  params: Promise<{
    siteId: string;
  }>;
};

export async function POST(request: Request, context: SiteBlogDraftContext) {
  const { siteId } = await context.params;
  const headers = new Headers(request.headers);

  headers.set("content-type", "application/json");

  return generateBlogDraftFromSite(
    new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        siteId,
        mode: "create",
      }),
    }),
  );
}
