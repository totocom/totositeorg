import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRequiredBlogReportHeadings,
  getRequiredBlogReportHeadings,
  validateRequiredBlogReportSectionCoverage,
} from "./blog-report-sections";

const siteName = "민속촌";

test("required blog report headings match the comprehensive H2 structure", () => {
  assert.deepEqual(getRequiredBlogReportHeadings(siteName), [
    "민속촌 토토사이트 정보 요약",
    "민속촌 원본 사이트 관측 정보",
    "민속촌 주소와 도메인 현황",
    "민속촌 도메인 DNS·WHOIS 조회 결과",
    "민속촌 화면 구성에서 관측된 주요 요소",
    "민속촌 계정·게임·결제 관련 관측 정보",
    "민속촌 먹튀 제보 현황",
    "민속촌 후기 데이터 현황",
    "확인되지 않은 항목과 해석상 한계",
    "민속촌 이용 전 확인할 체크리스트",
    "민속촌 토토사이트 FAQ",
  ]);

  assert.ok(formatRequiredBlogReportHeadings(siteName).includes(
    "## 민속촌 원본 사이트 관측 정보",
  ));
});

test("required section coverage confirms observation DNS scam and review sections", () => {
  const bodyMd = [
    "# 민속촌 토토사이트 종합 정보 리포트",
    ...getRequiredBlogReportHeadings(siteName).flatMap((heading) => [
      `## ${heading}`,
      `${heading} 본문입니다.`,
    ]),
  ].join("\n\n");
  const coverage = validateRequiredBlogReportSectionCoverage({
    siteName,
    bodyMd,
  });

  assert.deepEqual(coverage.missingHeadings, []);
  assert.equal(coverage.hasObservationSection, true);
  assert.equal(coverage.hasDnsWhoisSection, true);
  assert.equal(coverage.hasScamReportSection, true);
  assert.equal(coverage.hasReviewSection, true);
});

test("old domain-only report is detected as missing observation sections", () => {
  const oldBody = [
    "# 민속촌 토토사이트 도메인 리포트",
    "## 민속촌 주소 확인",
    "## 민속촌 도메인과 DNS 기록",
    "## 민속촌 먹튀 제보 현황",
    "## 민속촌 후기 요약",
  ].join("\n\n");
  const coverage = validateRequiredBlogReportSectionCoverage({
    siteName,
    bodyMd: oldBody,
  });

  assert.equal(coverage.hasObservationSection, false);
  assert.ok(
    coverage.missingHeadings.includes("민속촌 원본 사이트 관측 정보"),
  );
  assert.ok(
    coverage.missingHeadings.includes("민속촌 화면 구성에서 관측된 주요 요소"),
  );
});
