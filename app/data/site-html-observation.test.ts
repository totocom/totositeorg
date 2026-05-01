import assert from "node:assert/strict";
import test from "node:test";
import { extractSiteHtmlObservation } from "./site-html-observation";

const sampleHtml = `
<!doctype html>
<html lang="ko">
  <head>
    <title>테스트카지노 공식 화면</title>
    <meta name="description" content="테스트카지노 메인 화면 설명">
    <meta property="og:image" content="/images/og-main.png">
    <meta name="twitter:image" content="https://cdn.example.com/twitter.png">
    <link rel="shortcut icon" href="/favicon.ico">
    <style>.hidden-event { content: "보너스"; }</style>
    <script>window.secretText = "가입 입금 이벤트";</script>
  </head>
  <body>
    <iframe src="/promo">입금 보너스 iframe</iframe>
    <noscript>가입하기 noscript</noscript>
    <header>
      <nav>
        <a href="/">홈</a>
        <a href="/sports">스포츠</a>
        <a href="/casino">라이브카지노</a>
        <button>로그인</button>
        <button>회원가입</button>
      </nav>
    </header>
    <main>
      <h1>테스트카지노 메인</h1>
      <section>
        <p>아이디와 비밀번호 입력 후 마이페이지를 확인할 수 있습니다.</p>
        <p>스포츠북 경기 배당과 카지노 게임 메뉴가 노출됩니다.</p>
        <p>입금, 충전, 환전, 계좌 안내 버튼이 있습니다.</p>
      </section>
      <section class="notice">
        <h2>공지 안내</h2>
        <p>점검 안내 공지가 표시됩니다.</p>
      </section>
      <section class="event">
        <h2>이벤트 보너스</h2>
        <p>가입하기, 입금, 이벤트, 보너스 문구가 있습니다.</p>
      </section>
      <img src="/assets/site-logo.png" alt="테스트카지노 로고">
      <img src="https://images.example.com/banner.jpg" alt="메인 배너">
    </main>
    <footer>
      <p>Copyright 2026 Test Casino Corp. All rights reserved.</p>
      <p>개인정보 처리방침 · 이용약관</p>
    </footer>
  </body>
</html>
`;

test("extractSiteHtmlObservation extracts title meta and h1", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });

  assert.equal(observation.page_title, "테스트카지노 공식 화면");
  assert.equal(observation.meta_description, "테스트카지노 메인 화면 설명");
  assert.equal(observation.h1, "테스트카지노 메인");
});

test("extractSiteHtmlObservation extracts nav and menu labels", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });

  assert.deepEqual(
    ["홈", "스포츠", "라이브카지노", "로그인", "회원가입"].every((label) =>
      observation.observed_menu_labels.includes(label),
    ),
    true,
  );
});

test("extractSiteHtmlObservation extracts footer and copyright text", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });

  assert.equal(
    observation.observed_footer_text.some((text) =>
      text.includes("Copyright 2026 Test Casino Corp."),
    ),
    true,
  );
});

test("extractSiteHtmlObservation extracts og image twitter image and favicon candidates", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com/path/page",
  });

  assert.deepEqual(observation.image_candidates_json.og_images, [
    "https://example.com/images/og-main.png",
  ]);
  assert.deepEqual(observation.image_candidates_json.twitter_images, [
    "https://cdn.example.com/twitter.png",
  ]);
  assert.deepEqual(observation.image_candidates_json.favicon_candidates, [
    "https://example.com/favicon.ico",
  ]);
  assert.deepEqual(observation.image_candidates_json.logo_candidates, [
    "https://example.com/assets/site-logo.png",
  ]);
  assert.equal(
    observation.image_candidates_json.image_alts.includes("테스트카지노 로고"),
    true,
  );
});

test("extractSiteHtmlObservation classifies promotional terms as flags", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });
  const foundTerms = observation.promotional_flags_json.found_terms.map(
    (flag) => flag.term,
  );

  assert.equal(observation.promotional_flags_json.has_promotional_terms, true);
  assert.equal(foundTerms.includes("가입"), true);
  assert.equal(foundTerms.includes("입금"), true);
  assert.equal(foundTerms.includes("이벤트"), true);
  assert.equal(foundTerms.includes("보너스"), true);
});

test("extractSiteHtmlObservation does not emphasize promotional terms in public summary", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });
  const summary = observation.public_observation_summary.join(" ");

  assert.equal(/가입|입금|이벤트|보너스/.test(summary), false);
});

test("extractSiteHtmlObservation removes script style iframe and noscript text", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });

  assert.equal(observation.visible_text.includes("window.secretText"), false);
  assert.equal(observation.visible_text.includes("hidden-event"), false);
  assert.equal(observation.visible_text.includes("iframe"), false);
  assert.equal(observation.visible_text.includes("noscript"), false);
});

test("extractSiteHtmlObservation creates html and visible text hashes", () => {
  const observation = extractSiteHtmlObservation({
    html: sampleHtml,
    sourceUrl: "https://example.com",
  });

  assert.match(observation.html_hash, /^[a-f0-9]{64}$/);
  assert.match(observation.visible_text_hash, /^[a-f0-9]{64}$/);
  assert.equal(observation.html_hash, observation.html_sha256);
  assert.equal(observation.visible_text_hash, observation.visible_text_sha256);
});
