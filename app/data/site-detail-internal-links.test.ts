import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildRelatedBlogReportCardModel,
  hasForbiddenRelatedBlogReportAnchor,
} from "./related-blog-report";
import { reviewRenderedBlogInternalAnchors } from "./blog-seo-review";
import {
  footerNavigationLinks,
  primaryNavigationLinks,
} from "./site-navigation";
import {
  buildSiteDetailInternalLinks,
  findDuplicateSiteDetailAnchorTexts,
  getSiteDetailAllowedAnchorText,
  hasForbiddenSiteDetailAnchorText,
} from "./site-detail-internal-links";
import {
  buildSiteFeedbackSubmissionGuide,
  siteFeedbackSubmissionGuideForbiddenPhrases,
} from "./site-feedback-submission-guide";

const siteName = "벳톡";

test("site detail body anchors use the allowed unique text set", () => {
  const links = buildSiteDetailInternalLinks({ siteName });
  const labels = links.map((link) => link.label);

  assert.deepEqual(labels, [
    "벳톡 상세 정보",
    "벳톡 주소·도메인 기록",
    "벳톡 DNS 조회 결과",
    "벳톡 먹튀 제보 현황",
    "벳톡 후기 데이터",
  ]);
  assert.deepEqual(findDuplicateSiteDetailAnchorTexts(links), []);
  assert.equal(labels.every((label) => !hasForbiddenSiteDetailAnchorText(label)), true);
});

test("related blog card anchor is not reused by body internal links", () => {
  const bodyLinks = buildSiteDetailInternalLinks({ siteName });
  const relatedCard = buildRelatedBlogReportCardModel({
    siteName,
    report: {
      slug: "bettok-totosite",
      title: "벳톡 토토사이트 정보 리포트",
      publishedAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  });

  assert.equal(
    relatedCard?.anchor,
    getSiteDetailAllowedAnchorText(siteName, "blogReport"),
  );
  assert.equal(
    bodyLinks.some((link) => link.label === relatedCard?.anchor),
    false,
  );
  assert.equal(
    hasForbiddenRelatedBlogReportAnchor(relatedCard?.anchor ?? ""),
    false,
  );
});

test("rendered site detail anchors do not duplicate body text or header nav sets", () => {
  const bodyLinks = buildSiteDetailInternalLinks({ siteName });
  const relatedCard = buildRelatedBlogReportCardModel({
    siteName,
    report: {
      slug: "bettok-totosite",
      title: "벳톡 토토사이트 정보 리포트",
      publishedAt: null,
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  });

  const review = reviewRenderedBlogInternalAnchors({
    headerNavLinkSets: [primaryNavigationLinks],
    breadcrumbLinks: [
      { href: "/", label: "홈" },
      { href: "/sites", label: "사이트 목록" },
    ],
    bodyInternalLinks: bodyLinks,
    relatedPostLinks: relatedCard
      ? [{ href: relatedCard.href, label: relatedCard.anchor }]
      : [],
    footerLinks: footerNavigationLinks,
  });

  assert.deepEqual(review.duplicateBodyAnchorTexts, []);
  assert.deepEqual(review.duplicateHeaderNavSets, []);
  assert.equal(
    review.renderedAnchors.filter(
      (anchor) => anchor.label === relatedCard?.anchor,
    ).length,
    1,
  );
});

test("header and footer navigation label sets are individually unique", () => {
  assert.deepEqual(findDuplicateStrings(primaryNavigationLinks.map((link) => link.label)), []);
  assert.deepEqual(findDuplicateStrings(footerNavigationLinks.map((link) => link.label)), []);
});

test("site header renders mobile nav only after the mobile menu is open", () => {
  const headerSource = readFileSync("app/components/header.tsx", "utf8");

  assert.match(headerSource, /isDesktopViewport\s*\?\s*\(/);
  assert.match(headerSource, /!\s*isDesktopViewport\s*&&\s*isMenuOpen\s*\?/);
});

test("site detail page renders the feedback and scam report submission guide", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");

  assert.match(siteDetailPageSource, /import\s+\{\s*SiteFeedbackSubmissionGuide\s*\}/);
  assert.match(siteDetailPageSource, /<SiteFeedbackSubmissionGuide\s+siteId=\{site\.id\}\s+siteName=\{site\.siteName\}\s*\/>/);
});

test("feedback submission guide copy and actions use review and report routes", () => {
  const guide = buildSiteFeedbackSubmissionGuide({
    siteId: "site-1",
    siteName,
  });
  const combinedCopy = [
    guide.title,
    ...guide.paragraphs,
    ...guide.actions.map((action) => action.label),
  ].join("\n");
  const buttonLabels = guide.actions.map((action) => action.label).join("\n");

  assert.equal(guide.title, "벳톡 후기 및 먹튀 제보 등록 안내");
  assert.match(combinedCopy, /벳톡 후기/);
  assert.match(combinedCopy, /벳톡 먹튀 제보/);
  assert.match(combinedCopy, /실제 이용 경험이 있는 분/);
  assert.match(combinedCopy, /관리자 검토를 거쳐 공개될 수 있으며/);
  assert.match(
    combinedCopy,
    /개인정보가 포함된 내용은 승인되지 않을 수 있습니다/,
  );
  assert.equal(guide.reviewHref, "/submit-review?siteId=site-1");
  assert.equal(guide.scamReportHref, "/submit-scam-report?siteId=site-1");
  assert.deepEqual(
    guide.actions.map((action) => action.href),
    [guide.reviewHref, guide.scamReportHref],
  );
  assert.equal(
    siteFeedbackSubmissionGuideForbiddenPhrases.some((phrase) =>
      buttonLabels.includes(phrase),
    ),
    false,
  );
});

function findDuplicateStrings(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .map(([value, count]) => ({ value, count }));
}
