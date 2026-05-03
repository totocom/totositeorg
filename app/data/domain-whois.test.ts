import assert from "node:assert/strict";
import test from "node:test";
import { extractDomain } from "./domain-whois";

test("extractDomain preserves existing ASCII domain behavior", () => {
  assert.equal(extractDomain("https://example.com/path"), "example.com");
  assert.equal(extractDomain("example.com/path?x=1"), "example.com");
  assert.equal(extractDomain("www.example.com"), "example.com");
  assert.equal(
    extractDomain("https://sub.example.co.kr/path"),
    "sub.example.co.kr",
  );
});

test("extractDomain supports Korean IDN inputs by returning punycode", () => {
  assert.equal(extractDomain("https://예시.kr/path"), "xn--vv4b11d.kr");
  assert.equal(extractDomain("예시.kr"), "xn--vv4b11d.kr");
  assert.equal(extractDomain("www.예시.kr"), "xn--vv4b11d.kr");
  assert.equal(extractDomain("https://www.예시.kr"), "xn--vv4b11d.kr");
});

test("extractDomain accepts punycode domains", () => {
  assert.equal(extractDomain("xn--vv4b11d.kr"), "xn--vv4b11d.kr");
  assert.equal(
    extractDomain("https://xn--fsqu00a.xn--3e0b707e/path"),
    "xn--fsqu00a.xn--3e0b707e",
  );
});

test("extractDomain safely rejects invalid or empty input", () => {
  assert.equal(extractDomain("잘못된 문자열"), "");
  assert.equal(extractDomain("not-a-domain"), "");
  assert.equal(extractDomain(""), "");
  assert.equal(extractDomain("   "), "");
});
