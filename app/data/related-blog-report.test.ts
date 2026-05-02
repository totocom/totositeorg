import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRelatedBlogReportCardModel,
  findLatestRelatedBlogReport,
  hasForbiddenRelatedBlogReportAnchor,
  isPublishedApprovedSiteBlogReport,
  mapEligiblePublicSiteRelatedBlogReportRow,
  type PublicSiteRelatedBlogReportRow,
} from "./related-blog-report";

const siteId = "site-1";

function createRow(
  overrides: Partial<PublicSiteRelatedBlogReportRow> = {},
): PublicSiteRelatedBlogReportRow {
  return {
    site_id: siteId,
    slug: "bettok-report",
    title: "벳톡 도메인 리포트",
    status: "published",
    legal_review_status: "approved",
    published_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

test("published approved blog report creates site detail related report card model", () => {
  const report = findLatestRelatedBlogReport([createRow()], siteId);
  const model = buildRelatedBlogReportCardModel({
    siteName: "벳톡",
    report,
  });

  assert.notEqual(model, null);
  assert.equal(model?.heading, "관련 정보 리포트");
  assert.equal(model?.anchor, "벳톡 토토사이트 정보 리포트");
  assert.equal(model?.href, "/blog/bettok-report");
  assert.match(model?.description ?? "", /주소, 도메인, DNS·WHOIS/);
  assert.match(model?.description ?? "", /원본 사이트 관측 정보/);
  assert.match(model?.description ?? "", /먹튀 제보와 후기 데이터/);
});

test("draft blog report is hidden from public site detail card", () => {
  const report = findLatestRelatedBlogReport(
    [createRow({ status: "draft" })],
    siteId,
  );

  assert.equal(report, null);
  assert.equal(
    mapEligiblePublicSiteRelatedBlogReportRow(
      createRow({ status: "draft" }),
      siteId,
    ),
    null,
  );
});

test("archived blog report is hidden from public site detail card", () => {
  const report = findLatestRelatedBlogReport(
    [createRow({ status: "archived" })],
    siteId,
  );

  assert.equal(report, null);
});

test("blog report without approved legal review is hidden", () => {
  const report = findLatestRelatedBlogReport(
    [createRow({ legal_review_status: "needs_review" })],
    siteId,
  );

  assert.equal(report, null);
});

test("related report card anchor does not use prohibited promotional phrases", () => {
  const report = findLatestRelatedBlogReport(
    [
      createRow({
        title: "벳톡 바로가기 최신 주소 추천",
      }),
    ],
    siteId,
  );
  const model = buildRelatedBlogReportCardModel({
    siteName: "벳톡",
    report,
  });

  assert.equal(model?.anchor, "벳톡 토토사이트 정보 리포트");
  assert.equal(hasForbiddenRelatedBlogReportAnchor(model?.anchor ?? ""), false);
});

test("related report selection requires matching site_id and keeps latest report", () => {
  const report = findLatestRelatedBlogReport(
    [
      createRow({
        site_id: "other-site",
        slug: "other-report",
        updated_at: "2026-05-03T00:00:00.000Z",
      }),
      createRow({
        slug: "older-report",
        updated_at: "2026-05-01T00:00:00.000Z",
      }),
      createRow({
        slug: "latest-report",
        updated_at: "2026-05-02T00:00:00.000Z",
      }),
    ],
    siteId,
  );

  assert.equal(report?.slug, "latest-report");
  assert.equal(isPublishedApprovedSiteBlogReport(createRow(), siteId), true);
});
