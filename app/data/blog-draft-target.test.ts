import assert from "node:assert/strict";
import test from "node:test";
import {
  getPreferredBlogSlug,
  resolveBlogDraftTarget,
  type BlogDraftTargetBlog,
} from "./blog-draft-target";

const publishedBlog: BlogDraftTargetBlog = {
  id: "post-1",
  slug: "minsokchon-totosite-report",
  status: "published",
};

test("existing published blog resolves to an update draft target", () => {
  const result = resolveBlogDraftTarget({
    mode: "create",
    allowAdditionalPostForSameSite: false,
    requestedBlog: null,
    publishedBlog,
    existingBlog: null,
  });

  assert.equal(result.targetBlog, publishedBlog);
  assert.equal(result.jobType, "update");
  assert.equal(result.isAdditionalPost, false);
});

test("preferred slug keeps the existing published blog slug on update", () => {
  const slug = getPreferredBlogSlug({
    existingSlug: publishedBlog.slug,
    fallbackSlug: "minsokchon-totosite",
    isAdditionalPost: false,
    now: new Date("2026-05-02T00:00:00.000Z"),
  });

  assert.equal(slug, "minsokchon-totosite-report");
});

test("additional post mode can still create a dated slug when explicitly allowed", () => {
  const result = resolveBlogDraftTarget({
    mode: "create",
    allowAdditionalPostForSameSite: true,
    requestedBlog: null,
    publishedBlog,
    existingBlog: null,
  });
  const slug = getPreferredBlogSlug({
    existingSlug: result.targetBlog?.slug,
    fallbackSlug: "minsokchon-totosite",
    isAdditionalPost: result.isAdditionalPost,
    now: new Date("2026-05-02T00:00:00.000Z"),
  });

  assert.equal(result.targetBlog, null);
  assert.equal(result.jobType, "create");
  assert.equal(result.isAdditionalPost, true);
  assert.equal(slug, "minsokchon-totosite-2026-05-02");
});
