export type BlogDraftGenerationMode = "create" | "update";
export type BlogDraftGenerationJobType = "create" | "update";

export type BlogDraftTargetBlog = {
  id: string;
  slug: string;
  status: string;
};

export type BlogDraftTargetResolution<TBlog extends BlogDraftTargetBlog> = {
  targetBlog: TBlog | null;
  isAdditionalPost: boolean;
  jobType: BlogDraftGenerationJobType;
};

export function resolveBlogDraftTarget<TBlog extends BlogDraftTargetBlog>({
  requestedBlog,
  publishedBlog,
  existingBlog,
  mode,
  allowAdditionalPostForSameSite,
}: {
  requestedBlog?: TBlog | null;
  publishedBlog?: TBlog | null;
  existingBlog?: TBlog | null;
  mode: BlogDraftGenerationMode;
  allowAdditionalPostForSameSite: boolean;
}): BlogDraftTargetResolution<TBlog> {
  const targetBlog = requestedBlog
    ? requestedBlog
    : mode === "update"
      ? publishedBlog ?? null
      : allowAdditionalPostForSameSite
        ? null
        : publishedBlog ?? existingBlog ?? null;
  const isAdditionalPost =
    allowAdditionalPostForSameSite && mode === "create" && !targetBlog;

  return {
    targetBlog,
    isAdditionalPost,
    jobType: targetBlog ? "update" : "create",
  };
}

export function getPreferredBlogSlug({
  existingSlug,
  fallbackSlug,
  isAdditionalPost,
  now,
}: {
  existingSlug?: string | null;
  fallbackSlug: string;
  isAdditionalPost: boolean;
  now: Date;
}) {
  if (existingSlug) return existingSlug;

  return isAdditionalPost
    ? `${fallbackSlug}-${now.toISOString().slice(0, 10)}`
    : fallbackSlug;
}
