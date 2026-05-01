import assert from "node:assert/strict";
import test from "node:test";
import {
  automaticCrawlManualHtmlFallbackText,
  buildAutomaticCrawlFailureBody,
  detectAutomaticAccessChallenge,
} from "./automatic-crawl-support";

test("detectAutomaticAccessChallenge detects HTTP 403", () => {
  assert.equal(detectAutomaticAccessChallenge({ statusCode: 403 }), true);
});

test("detectAutomaticAccessChallenge detects Cloudflare challenge headers", () => {
  assert.equal(
    detectAutomaticAccessChallenge({
      statusCode: 503,
      headers: {
        "cf-mitigated": "challenge",
      },
    }),
    true,
  );
  assert.equal(
    detectAutomaticAccessChallenge({
      statusCode: 200,
      headers: {
        server: "cloudflare",
      },
    }),
    true,
  );
  assert.equal(
    detectAutomaticAccessChallenge({
      statusCode: 200,
      headers: {
        "cf-ray": "1234abcd-ICN",
      },
    }),
    true,
  );
});

test("buildAutomaticCrawlFailureBody returns challenge flag and manual HTML guidance", () => {
  const body = buildAutomaticCrawlFailureBody("자동 조회 실패", true);

  assert.equal(body.ok, false);
  assert.equal(body.challenge_detected, true);
  assert.equal(body.fallback_available, "manual_html");
  assert.match(body.error, new RegExp(automaticCrawlManualHtmlFallbackText));
});
