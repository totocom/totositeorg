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
  assert.match(
    siteDetailPageSource,
    /<SiteDescriptionNotice\s+siteName=\{site\.siteName\}\s*\/>/,
  );
});

test("site detail page uses the same two-column detail layout as blog posts", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
  const blogDetailPageSource = readFileSync("app/blog/[slug]/page.tsx", "utf8");

  assert.match(blogDetailPageSource, /lg:grid-cols-\[1fr_320px\]/);
  assert.match(siteDetailPageSource, /lg:grid-cols-\[1fr_320px\]/);
  assert.match(siteDetailPageSource, /<div className="min-w-0">/);
  assert.match(
    siteDetailPageSource,
    /<article id="site-overview" className="scroll-mt-24 rounded-xl border border-line bg-surface shadow-sm">[\s\S]*?<nav aria-label="Breadcrumb" className="px-5 pt-5 text-sm text-muted">[\s\S]*?aria-current="page"[\s\S]*?\{site\.siteName\}/,
  );
  assert.match(
    siteDetailPageSource,
    /<aside className="grid content-start gap-4">[\s\S]*?<SiteShareActions[\s\S]*?상세 페이지 탐색[\s\S]*?<SiteTelegramAlertSubscription[\s\S]*?<RelatedBlogReportCard[\s\S]*?<SiteFeedbackSubmissionGuide[\s\S]*?<\/aside>/,
  );
});

test("site detail overview stacks trust and report summaries below the title", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");

  assert.doesNotMatch(
    siteDetailPageSource,
    /flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between/,
  );
  assert.match(
    siteDetailPageSource,
    /<div className="grid gap-5 p-5">[\s\S]*?\{siteDetailHeading\}[\s\S]*?<div className="grid gap-3 sm:grid-cols-2">[\s\S]*?신뢰 점수[\s\S]*?scamReportStatusCopy/,
  );
  assert.match(
    siteDetailPageSource,
    /<div className="flex w-full min-w-0 items-start gap-4">[\s\S]*?\{site\.siteName\}[\s\S]*?<\/div>\s*<\/div>\s*<div className="mt-4">\s*<h1 className="break-keep text-2xl font-bold sm:text-3xl">\s*\{siteDetailHeading\}/,
  );
  assert.match(
    siteDetailPageSource,
    /className="h-12 w-12 shrink-0 rounded-xl border border-line bg-white object-contain p-1\.5 dark:bg-surface"/,
  );
});

test("site detail sections do not render duplicate review and scam report action buttons", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");

  assert.doesNotMatch(siteDetailPageSource, /site-author-actions/);
  assert.doesNotMatch(siteDetailPageSource, /<SiteAuthorActions\b/);
});

test("site detail review submission action is rendered in the review section header", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");

  assert.match(
    siteDetailPageSource,
    /const primarySubmissionActionClassName =\s*"inline-flex min-h-11 w-full items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-center text-sm font-semibold leading-5 text-white transition hover:bg-accent\/80 active:scale-95"/,
  );
  assert.match(
    siteDetailPageSource,
    /href=\{`\/submit-review\?siteId=\$\{encodeURIComponent\(site\.id\)\}`\}/,
  );
  assert.match(siteDetailPageSource, /\{site\.siteName\} 후기 남기기/);
  assert.match(
    siteDetailPageSource,
    /<p className="text-xs font-semibold uppercase tracking-wider text-accent">커뮤니티 리뷰<\/p>[\s\S]*?<h2 className="mt-1 text-base font-bold">최근 이용 경험<\/h2>[\s\S]*?primarySubmissionActionClassName/,
  );
});

test("site detail scam report submission action is rendered in the scam reports section header", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
  const feedbackSubmissionGuideSource = readFileSync(
    "app/components/site-feedback-submission-guide.tsx",
    "utf8",
  );

  assert.match(
    siteDetailPageSource,
    /const primarySubmissionActionClassName =\s*"inline-flex min-h-11 w-full items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-center text-sm font-semibold leading-5 text-white transition hover:bg-accent\/80 active:scale-95"/,
  );
  assert.doesNotMatch(siteDetailPageSource, /scamReportSubmissionActionClassName/);
  assert.match(
    siteDetailPageSource,
    /href=\{`\/submit-scam-report\?siteId=\$\{encodeURIComponent\(site\.id\)\}`\}/,
  );
  assert.match(siteDetailPageSource, /\{site\.siteName\} 먹튀 피해 제보하기/);
  assert.match(
    siteDetailPageSource,
    /<p className="text-xs font-semibold uppercase tracking-wider text-accent">먹튀 피해 이력<\/p>[\s\S]*?<h2 className="mt-1 text-base font-bold">승인된 피해 제보<\/h2>[\s\S]*?primarySubmissionActionClassName/,
  );
  assert.doesNotMatch(feedbackSubmissionGuideSource, /guide\.actions\[/);
  assert.doesNotMatch(feedbackSubmissionGuideSource, /Action\.href/);
});

test("site detail domain submission button uses site-specific label", () => {
  const siteDetailPageSource = readFileSync("app/sites/[slug]/page.tsx", "utf8");
  const domainInfoTabsSource = readFileSync(
    "app/components/domain-info-tabs.tsx",
    "utf8",
  );
  const siteDomainSubmissionFormSource = readFileSync(
    "app/components/site-domain-submission-form.tsx",
    "utf8",
  );

  assert.match(siteDetailPageSource, /siteName:\s*site\.siteName/);
  assert.match(
    domainInfoTabsSource,
    /siteName=\{domainItems\[0\]\?\.siteName\s*\?\?\s*""\}/,
  );
  assert.match(
    siteDomainSubmissionFormSource,
    /\$\{normalizedSiteName\}도메인 추가/,
  );
  assert.match(
    siteDomainSubmissionFormSource,
    /className="h-10 rounded-md bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent\/80 active:scale-95 disabled:opacity-50"/,
  );
  assert.doesNotMatch(siteDomainSubmissionFormSource, /"도메인 추가"/);
  assert.doesNotMatch(siteDomainSubmissionFormSource, /"로그인 후 추가"/);
});

test("review helpfulness vote keeps a stable disabled shell during auth loading", () => {
  const reviewHelpfulnessVoteSource = readFileSync(
    "app/components/review-helpfulness-vote.tsx",
    "utf8",
  );

  assert.doesNotMatch(
    reviewHelpfulnessVoteSource,
    /if\s*\(\s*isAuthLoading\s*\|\|\s*!\s*user\s*\)\s*\{[\s\S]*?return null;[\s\S]*?\}/,
  );
  assert.match(reviewHelpfulnessVoteSource, /const isVoteDisabled =/);
  assert.match(reviewHelpfulnessVoteSource, /const statusMessage =/);
  assert.match(reviewHelpfulnessVoteSource, /로그인 상태를 확인하는 중입니다/);
  assert.match(reviewHelpfulnessVoteSource, /로그인 후 투표할 수 있습니다/);
  assert.match(reviewHelpfulnessVoteSource, /disabled=\{isVoteDisabled\}/);
  assert.match(reviewHelpfulnessVoteSource, /min-h-4/);
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
