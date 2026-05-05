# 사이트 상세 페이지 SEO 분리 설계

## 현재 코드 확인

### 결정 사항

이번 설계는 현재 코드 구조를 기준으로 잡는다. 앱 코드는 이 문서 작성 단계에서 수정하지 않는다.

확인한 기준은 다음과 같다.

- 사이트 상세 페이지는 `app/sites/[slug]/page.tsx` 하나에 모여 있다.
- 해당 페이지는 `dynamicParams = true`, `revalidate = 300`을 사용한다.
- 페이지 내부에서 `react`의 `cache()`로 `getPublicSiteDetail(slug)`를 감싼다.
- `getPublicSiteDetail`은 `app/data/public-sites.ts`에서 `unstable_cache()`로 감싼 함수다.
- 상세 데이터는 `sites`, `reviews`, `scam_reports`, `site_crawl_snapshot_public`, `blog_posts`, 도메인 생성일 조회를 함께 사용한다.
- sitemap은 `app/sitemap.ts`에 있고, `getPublicSitesForSitemap()` 결과를 `calculateSiteDetailIndexability()`로 거른 뒤 `/sites/[slug]`만 넣는다.
- 별도 `lib/cache` 유틸은 없다. Supabase 클라이언트는 `lib/supabase/client.ts`의 싱글턴 패턴을 쓴다.
- 기존 메타데이터는 `app/data/site-detail-metadata.ts`의 `buildSiteDetailMetadata()`에서 `title`, `description`, `canonical`, `robots`, `openGraph`, `twitter`를 만든다.

### 코드 예시

현재 상세 페이지의 핵심 흐름은 아래 형태다.

```tsx
// app/sites/[slug]/page.tsx
export const dynamicParams = true;
export const revalidate = 300;

const getCachedPublicSiteDetail = cache((slug: string) =>
  getPublicSiteDetail(slug),
);

export async function generateMetadata({ params }: SiteDetailPageProps) {
  const { slug: rawSlug } = await params;
  const detail = await getCachedPublicSiteDetail(rawSlug.trim());
  const indexability = calculateSiteDetailIndexability({
    site: detail.site,
    reviewsCount: detail.reviews.length,
    scamReportsCount: detail.scamReports.length,
    observationSnapshot: detail.observationSnapshot,
    domainCreationDates: detail.domainCreationDates,
    relatedBlogReport: detail.relatedBlogReport,
    source: detail.source,
  });

  return buildSiteDetailMetadata(detail.site, rawSlug.trim(), {
    shouldIndex: indexability.shouldIndex,
  });
}
```

현재 공개 데이터 캐시는 아래 형태다.

```ts
// app/data/public-sites.ts
export const getPublicSiteDetail = unstable_cache(
  getPublicSiteDetailUncached,
  ["public-site-detail"],
  {
    revalidate: 300,
    tags: ["public-sites"],
  },
);
```

### 의사결정 근거

기존 흐름과 모순되지 않으려면 새 라우트도 `generateMetadata()`와 페이지 렌더가 같은 데이터 로더를 공유해야 한다. 현재처럼 `cache()`를 페이지 파일에서 한 번 더 감싸면 같은 요청 안에서 메타데이터와 본문 렌더가 중복 호출되는 일을 줄일 수 있다.

## 1. 파일 구조

### 결정 사항

새 URL은 확정된 4개 구조를 그대로 쓴다.

```txt
/sites/[slug]
/sites/[slug]/scam-reports
/sites/[slug]/reviews
/sites/[slug]/domains
```

첫 구현에서는 `app/sites/[slug]/layout.tsx`를 만들지 않는다. 공통 헤더는 일반 컴포넌트로 만들고 각 페이지에서 명시적으로 렌더한다.

새로 만들 파일은 아래 기준을 권장한다.

| 경로 | 역할 |
| --- | --- |
| `app/sites/[slug]/page.tsx` | 기존 메인 정보 페이지. 사이트 개요, 화면 스크린샷, 관측 스냅샷, 후기/제보 3건 요약, 도메인 요약 카드만 남긴다. |
| `app/sites/[slug]/scam-reports/page.tsx` | 먹튀 제보 전용 신규 페이지. 제보 전체 목록, 제보 FAQ, 빈 데이터 보강 콘텐츠를 렌더한다. |
| `app/sites/[slug]/reviews/page.tsx` | 후기 전용 신규 페이지. 후기 전체 목록, 후기 FAQ, 빈 데이터 보강 콘텐츠를 렌더한다. |
| `app/sites/[slug]/domains/page.tsx` | 도메인 이력 전용 신규 페이지. 대표 주소, 추가 도메인, DNS, WHOIS, 도메인 FAQ를 렌더한다. |
| `app/components/site-detail/site-header-common.tsx` | 4개 페이지 공통 헤더. 사이트명, 대표 주소, 신뢰점수, 탭 내비게이션을 담당한다. |
| `app/components/site-detail/site-detail-tabs.tsx` | 탭 링크와 active 상태 렌더링. 카운트 표시 포함. |
| `app/components/site-detail/site-empty-state.tsx` | 후기/제보 0건 페이지의 안내 카드 공통 컴포넌트. |
| `app/components/site-detail/site-scam-report-faq.tsx` | 사이트별 먹튀 제보 페이지 FAQ. |
| `app/components/site-detail/site-review-faq.tsx` | 사이트별 후기 페이지 FAQ. |
| `app/components/site-detail/site-domain-faq.tsx` | 사이트별 도메인 페이지 FAQ. |
| `app/data/public-site-detail.ts` | 사이트 상세 전용 데이터 로더 분리 모듈. |
| `app/data/site-detail-subpage-metadata.ts` | 서브페이지 메타데이터 빌더. |
| `app/data/site-detail-subpage-indexability.ts` | 서브페이지별 robots/index 판단 함수. |
| `app/data/site-page-split-flags.ts` | 파일럿 slug 활성화 판단 함수. |

`layout.tsx`를 쓰지 않는 이유는 두 가지다. 첫째, 각 서브페이지가 서로 다른 `robots`와 본문 데이터를 가져야 한다. 둘째, 현재 메타데이터와 본문이 같은 로더를 공유하는 패턴을 유지하는 편이 안전하다.

### 코드 예시

```txt
app/
  sites/
    [slug]/
      page.tsx
      scam-reports/
        page.tsx
      reviews/
        page.tsx
      domains/
        page.tsx
app/
  components/
    site-detail/
      site-header-common.tsx
      site-detail-tabs.tsx
      site-empty-state.tsx
      site-scam-report-faq.tsx
      site-review-faq.tsx
      site-domain-faq.tsx
app/
  data/
    public-site-detail.ts
    site-detail-subpage-metadata.ts
    site-detail-subpage-indexability.ts
    site-page-split-flags.ts
```

신규 라우트 페이지 기본 형태:

```tsx
// app/sites/[slug]/reviews/page.tsx
import { cache } from "react";
import { SiteHeaderCommon } from "@/app/components/site-detail/site-header-common";
import { getSiteReviewsDetail } from "@/app/data/public-site-detail";

export const dynamicParams = true;
export const revalidate = 300;

type SiteReviewsPageProps = {
  params: Promise<{ slug: string }>;
};

const getCachedDetail = cache((slug: string) => getSiteReviewsDetail(slug));

export async function generateMetadata({ params }: SiteReviewsPageProps) {
  const { slug } = await params;
  const detail = await getCachedDetail(slug.trim());

  return buildSiteReviewsMetadata(detail, slug.trim());
}

export default async function SiteReviewsPage({ params }: SiteReviewsPageProps) {
  const { slug } = await params;
  const detail = await getCachedDetail(slug.trim());

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <SiteHeaderCommon
        common={detail.common}
        activeTab="reviews"
      />
      <SiteReviewsBody detail={detail} />
    </main>
  );
}
```

### 의사결정 근거

공통 컴포넌트를 `app/components/site-detail/` 아래에 두면 기존 `app/components` 패턴과 맞고, `[slug]` 경로가 들어간 import를 피할 수 있다. `layout.tsx`는 탭 사이 공통 UI를 줄일 수 있지만, 파일럿 단계에서는 데이터 흐름을 숨겨 디버깅이 어려워질 수 있다.

## 2. 메타 태그 템플릿

### 결정 사항

4개 페이지 모두 자기 자신을 canonical로 둔다. 메인 페이지와 도메인 페이지는 승인된 사이트가 존재하면 항상 `index,follow`다. 먹튀 제보와 후기 페이지는 데이터 0건이면 `noindex,follow`, 1건 이상이면 `index,follow`다.

타이틀에는 `사이트명 + 키워드 + 고유 숫자` 조합을 우선한다. 다만 실제 검색 결과에서는 한국어 타이틀이 30~35자 안팎에서 잘릴 수 있으므로, 타이틀은 짧은 버전을 기본값으로 둔다. 첫 구현 전에는 실제 `sites` 데이터로 사이트명 길이 분포와 생성 타이틀 길이를 반드시 확인한다.

타이틀 작성 원칙은 아래 순서다.

- 1순위: `사이트명 + 핵심 키워드 + 핵심 숫자`
- 2순위: 길면 괄호 안 영문명을 제거한 사이트명 사용
- 3순위: 그래도 길면 일반 단어를 제거하고 숫자 중심으로 축약
- 메인 타이틀도 `토토사이트 검증`을 무조건 붙이지 않는다. 사이트명이 길면 `먹튀 제보`, `후기`, `도메인` 같은 페이지별 핵심어만 남긴다.

미존재 slug는 404나 리다이렉트 대신 기존처럼 안내 화면을 렌더하되 `noindex,follow`를 준다.

### 코드 예시

공통 유틸:

```ts
import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/config";
import { buildSiteDetailRobots } from "@/app/data/site-detail-metadata";

type SiteSubpageMetaInput = {
  site: ReviewTarget | null;
  slug: string;
  title: string;
  description: string;
  path: string;
  shouldIndex: boolean;
  imageUrl?: string | null;
  imageAlt?: string;
};

function buildSubpageMetadata(input: SiteSubpageMetaInput): Metadata {
  const canonical = `${siteUrl}${input.path}`;

  if (!input.site) {
    return {
      title: { absolute: "사이트 정보를 찾을 수 없습니다" },
      alternates: { canonical },
      robots: buildSiteDetailRobots(false),
    };
  }

  return {
    title: { absolute: input.title },
    description: input.description,
    keywords: null,
    alternates: { canonical },
    robots: buildSiteDetailRobots(input.shouldIndex),
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName,
      url: canonical,
      title: input.title,
      description: input.description,
      images: input.imageUrl
        ? [{ url: input.imageUrl, alt: input.imageAlt ?? input.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  };
}

const titleTargetLength = 32;
const titleHardLimit = 42;

function stripParenthesizedEnglish(siteName: string) {
  return siteName.replace(/\s*\([A-Za-z0-9._ -]+\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function buildOptimalSiteTitle(
  siteName: string,
  suffix: string,
  compactSuffix = suffix,
) {
  const normalizedSiteName = siteName.replace(/\s+/g, " ").trim();
  const full = `${normalizedSiteName} ${suffix}`.trim();

  if (full.length <= titleTargetLength) return full;

  const shortSiteName = stripParenthesizedEnglish(normalizedSiteName);
  const shortened = `${shortSiteName} ${suffix}`.trim();

  if (shortened.length <= titleTargetLength) return shortened;

  const compact = `${shortSiteName} ${compactSuffix}`.trim();

  if (compact.length <= titleHardLimit) return compact;

  return compact.slice(0, titleHardLimit - 1).trim();
}
```

실제 DB 길이 점검용 SQL:

```sql
select
  id,
  slug,
  name,
  coalesce(nullif(trim(name_ko), ''), name) as display_name,
  char_length(coalesce(nullif(trim(name_ko), ''), name)) as ko_name_len,
  char_length(name) as raw_name_len,
  char_length(
    coalesce(nullif(trim(name_ko), ''), name)
    || ' 먹튀 제보 '
    || 99
    || '건·도메인 '
    || greatest(1, coalesce(array_length(domains, 1), 1))
    || '개'
  ) as worst_case_title_len
from sites
where status = 'approved'
order by worst_case_title_len desc
limit 50;
```

실제 구현 전 점검 기준:

```ts
function inspectTitleLength(site: ReviewTarget) {
  const domainCount = Math.max(1, site.domains.length);

  return {
    siteName: site.siteName,
    main: buildOptimalSiteTitle(
      site.siteName,
      `제보 ${site.scamReportCount ?? 0}건·후기 ${site.reviewCount}건`,
    ),
    scamReports: buildOptimalSiteTitle(
      site.siteName,
      `먹튀 제보 ${site.scamReportCount ?? 0}건`,
    ),
    reviews: buildOptimalSiteTitle(site.siteName, `후기 ${site.reviewCount}건`),
    domains: buildOptimalSiteTitle(site.siteName, `도메인 ${domainCount}개`),
  };
}
```

메인 페이지:

```ts
export function buildSiteMainMetadata(
  detail: SiteMainDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reportCount = site?.scamReportCount ?? 0;
  const reviewCount = site?.reviewCount ?? 0;
  const domainCount = site ? Math.max(1, site.domains.length) : 0;

  return buildSubpageMetadata({
    site,
    slug,
    path: `/sites/${encodeURIComponent(slug)}`,
    shouldIndex: Boolean(site),
    title: site
      ? buildOptimalSiteTitle(
          site.siteName,
          `제보 ${reportCount}건·후기 ${reviewCount}건·도메인 ${domainCount}개`,
          `제보 ${reportCount}건·후기 ${reviewCount}건`,
        )
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? `${site.siteName} 토토사이트의 메인 화면 내용, 대표 주소, 관측 스냅샷, 후기와 먹튀 제보 요약을 정리했습니다.`
      : "",
    imageUrl: site?.screenshotUrl ?? site?.screenshotThumbUrl,
    imageAlt: site ? `${site.siteName} 토토사이트 메인 화면` : undefined,
  });
}
```

먹튀 제보 페이지:

```ts
export function buildSiteScamReportsMetadata(
  detail: SiteScamReportsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reportCount = detail.scamReports.length;

  return buildSubpageMetadata({
    site,
    slug,
    path: `/sites/${encodeURIComponent(slug)}/scam-reports`,
    shouldIndex: Boolean(site && reportCount > 0),
    title: site
      ? buildOptimalSiteTitle(site.siteName, `먹튀 제보 ${reportCount}건`)
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? reportCount > 0
        ? `${site.siteName} 토토사이트 관련 승인된 먹튀 제보 ${reportCount}건의 피해 유형, 접수 시점, 공개 신고 내용을 정리했습니다.`
        : `${site.siteName} 토토사이트 관련 승인된 먹튀 제보는 아직 없습니다. 제보 방법과 확인 기준을 안내합니다.`
      : "",
    imageUrl: site?.screenshotUrl ?? site?.screenshotThumbUrl,
  });
}
```

후기 페이지:

```ts
export function buildSiteReviewsMetadata(
  detail: SiteReviewsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const reviewCount = detail.reviews.length;
  const averageRating = site?.averageRating ?? 0;

  return buildSubpageMetadata({
    site,
    slug,
    path: `/sites/${encodeURIComponent(slug)}/reviews`,
    shouldIndex: Boolean(site && reviewCount > 0),
    title: site
      ? buildOptimalSiteTitle(
          site.siteName,
          `후기 ${reviewCount}건·평점 ${averageRating.toFixed(1)}점`,
          `후기 ${reviewCount}건`,
        )
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? reviewCount > 0
        ? `${site.siteName} 토토사이트의 승인된 후기 ${reviewCount}건과 평점, 이용 경험을 모아 정리했습니다.`
        : `${site.siteName} 토토사이트에 대해 승인된 후기는 아직 없습니다. 후기 작성 방법과 확인 기준을 안내합니다.`
      : "",
    imageUrl: site?.screenshotUrl ?? site?.screenshotThumbUrl,
  });
}
```

도메인 페이지:

```ts
export function buildSiteDomainsMetadata(
  detail: SiteDomainsDetailResult,
  slug: string,
): Metadata {
  const site = detail.common.site;
  const domainCount = detail.domains.length;
  const dnsRecordCount = detail.dnsRecords.length;

  return buildSubpageMetadata({
    site,
    slug,
    path: `/sites/${encodeURIComponent(slug)}/domains`,
    shouldIndex: Boolean(site),
    title: site
      ? buildOptimalSiteTitle(
          site.siteName,
          `도메인 ${domainCount}개·DNS ${dnsRecordCount}건`,
          `도메인 ${domainCount}개`,
        )
      : "사이트 정보를 찾을 수 없습니다",
    description: site
      ? `${site.siteName} 토토사이트의 대표 주소, 추가 도메인 ${domainCount}개, DNS와 WHOIS 조회 정보를 정리했습니다.`
      : "",
    imageUrl: site?.screenshotUrl ?? site?.screenshotThumbUrl,
  });
}
```

### 의사결정 근거

메인 페이지를 항상 index로 두면 기존 URL의 SEO 신호를 유지한다. 도메인 페이지도 대표 도메인이 최소 1개 있으므로 항상 index 대상으로 둔다. 반면 후기와 먹튀 제보는 0건일 때 본문이 보강되더라도 핵심 데이터가 없으므로 sitemap 제외와 `noindex,follow`가 맞다.

타이틀은 긴 설명형보다 짧은 숫자형이 우선이다. `토토사이트 검증` 같은 일반 표현은 메인 페이지에 항상 넣고 싶지만, 긴 사이트명에서는 검색 결과 노출 폭을 잡아먹는다. 그래서 타이틀 빌더가 사이트명 길이에 따라 영문 병기 제거와 축약을 먼저 수행해야 한다.

## 3. 구조화 데이터(JSON-LD)

### 결정 사항

첫 구현에 JSON-LD를 포함한다. 기존 `app/sites/[slug]/page.tsx`에는 `Review` 타입 JSON-LD가 들어 있지만, 페이지를 나누면 페이지별 검색 의도에 맞게 구조화 데이터도 나눠야 한다.

적용 원칙은 다음과 같다.

| 페이지 | JSON-LD |
| --- | --- |
| `/sites/[slug]` | `WebPage`, `BreadcrumbList`, 후기 1건 이상일 때만 `AggregateRating` |
| `/sites/[slug]/scam-reports` | `WebPage`, `BreadcrumbList`, `FAQPage` |
| `/sites/[slug]/reviews` | `WebPage`, `BreadcrumbList`, 후기 1건 이상일 때만 `AggregateRating`, `FAQPage` |
| `/sites/[slug]/domains` | `WebPage`, `BreadcrumbList`, `FAQPage` |

`Organization`이나 `LocalBusiness`는 사용하지 않는다. 이 서비스가 해당 토토사이트의 공식 조직을 대표하는 것이 아니고, 오프라인 사업장 정보도 아니기 때문이다. 메인 엔티티는 해당 사이트 자체가 아니라 “이 사이트에 대한 정보 페이지”이므로 `WebPage`가 더 안전하다.

도메인 변경 이력은 schema.org에 정확히 맞는 공개 타입이 애매하다. 따라서 도메인 페이지는 `WebPage`와 `BreadcrumbList`, FAQ 중심으로 간다. 도메인 목록이나 DNS 값을 억지로 `ItemList`로 넣는 것은 보류한다.

### 코드 예시

공통 JSON-LD 렌더 유틸:

```tsx
function JsonLd({ value }: { value: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
    />
  );
}
```

공통 WebPage:

```ts
function buildSiteWebPageJsonLd({
  site,
  canonical,
  title,
  description,
}: {
  site: ReviewTarget;
  canonical: string;
  title: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: canonical,
    description,
    about: {
      "@type": "WebSite",
      name: site.siteName,
      url: site.siteUrl,
    },
  };
}
```

후기 1건 이상일 때만 붙이는 평점:

```ts
function buildAggregateRatingJsonLd(site: ReviewTarget) {
  if (site.reviewCount <= 0 || site.averageRating <= 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: {
      "@type": "WebSite",
      name: site.siteName,
      url: site.siteUrl,
    },
    ratingValue: site.averageRating.toFixed(1),
    reviewCount: site.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}
```

BreadcrumbList:

```ts
function buildSiteBreadcrumbJsonLd({
  site,
  items,
}: {
  site: ReviewTarget;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

FAQPage:

```ts
type FaqItem = {
  question: string;
  answer: string;
};

function buildFaqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
```

메인 페이지 적용 예시:

```tsx
const canonical = `${siteUrl}/sites/${encodeURIComponent(slug)}`;
const webPageJsonLd = buildSiteWebPageJsonLd({
  site,
  canonical,
  title: pageTitle,
  description: pageDescription,
});
const breadcrumbJsonLd = buildSiteBreadcrumbJsonLd({
  site,
  items: [
    { name: "홈", url: siteUrl },
    { name: "사이트 목록", url: `${siteUrl}/sites` },
    { name: site.siteName, url: canonical },
  ],
});
const aggregateRatingJsonLd = buildAggregateRatingJsonLd(site);

return (
  <>
    <JsonLd value={webPageJsonLd} />
    <JsonLd value={breadcrumbJsonLd} />
    {aggregateRatingJsonLd ? <JsonLd value={aggregateRatingJsonLd} /> : null}
    <main>{/* page body */}</main>
  </>
);
```

먹튀 제보 페이지 적용 예시:

```tsx
const faqItems = getSiteScamReportFaqItems(site.siteName);
const faqJsonLd = buildFaqPageJsonLd(faqItems);

return (
  <>
    <JsonLd value={webPageJsonLd} />
    <JsonLd value={breadcrumbJsonLd} />
    <JsonLd value={faqJsonLd} />
    <main>{/* scam report body */}</main>
  </>
);
```

도메인 페이지 적용 예시:

```tsx
const faqItems = getSiteDomainFaqItems(site.siteName);

return (
  <>
    <JsonLd value={webPageJsonLd} />
    <JsonLd value={breadcrumbJsonLd} />
    <JsonLd value={buildFaqPageJsonLd(faqItems)} />
    <main>{/* domain body */}</main>
  </>
);
```

### 의사결정 근거

JSON-LD는 검색 결과와 AI 검색 인용에서 페이지의 주제를 명확히 전달하는 보조 신호다. 다만 과한 타입 매핑은 리스크가 있다. 공식 사업체가 아닌 대상을 `Organization`으로 선언하거나, 맞지 않는 도메인 이력을 억지로 schema 타입에 끼우면 신뢰도가 떨어진다. 그래서 `WebPage`, `BreadcrumbList`, `FAQPage`, 조건부 `AggregateRating`만 사용한다.

`AggregateRating`은 후기 0건일 때 넣지 않는다. 평점 데이터가 없는데 구조화 데이터에 평점 객체를 넣으면 리치 결과 품질 가이드 위반 소지가 있다.

## 4. 데이터 페칭 함수 분리

### 결정 사항

상세 전용 데이터 로더를 `app/data/public-site-detail.ts`로 분리한다. 기존 `app/data/public-sites.ts`는 사이트 목록, 전체 후기 목록, 전체 제보 목록 중심으로 남긴다. 기존 `getPublicSiteDetail(slug)`는 초기 전환 기간에 호환용 래퍼로 유지한다.

분리할 함수는 다음과 같다.

| 함수 | 사용 페이지 | 가져오는 데이터 |
| --- | --- | --- |
| `getSiteCommonHeader(slug)` | 4개 페이지 공통 | 사이트 row, 대표/추가 도메인, 리뷰/제보 카운트, 평균 평점, 피해 금액 집계, 신뢰점수, 탭 카운트 |
| `getSiteMainDetail(slug)` | `/sites/[slug]` | 공통 헤더, 관측 스냅샷, 관련 블로그, 후기 3건, 먹튀 제보 3건, 도메인 요약 |
| `getSiteScamReportsDetail(slug)` | `/scam-reports` | 공통 헤더, 승인/공개 먹튀 제보 전체, 유사 제보 카드 |
| `getSiteReviewsDetail(slug)` | `/reviews` | 공통 헤더, 승인 후기 전체, 유사 후기/사이트 카드 |
| `getSiteDomainsDetail(slug)` | `/domains` | 공통 헤더, 도메인 목록, 생성일, 저장된 DNS, WHOIS cache |

### 코드 예시

타입:

```ts
type PublicSource = "supabase" | "fallback" | "none";

export type SiteCommonHeaderResult = {
  site: ReviewTarget | null;
  tabCounts: {
    scamReports: number;
    reviews: number;
    domains: number;
  };
  trustScore: ReturnType<typeof calculateSiteTrustScore> | null;
  source: PublicSource;
  errorMessage: string;
};

export type SiteMainDetailResult = {
  common: SiteCommonHeaderResult;
  observationSnapshot: PublicSiteObservationSnapshot | null;
  relatedBlogReport: PublicSiteRelatedBlogReport | null;
  scamReportSummary: ScamReport[];
  reviewSummary: SiteReview[];
  domainSummary: SiteDomainSummary[];
};

export type SiteScamReportsDetailResult = {
  common: SiteCommonHeaderResult;
  scamReports: ScamReport[];
  relatedScamReportCards: RelatedSiteCard[];
};

export type SiteReviewsDetailResult = {
  common: SiteCommonHeaderResult;
  reviews: SiteReview[];
  relatedReviewCards: RelatedSiteCard[];
};

export type SiteDomainsDetailResult = {
  common: SiteCommonHeaderResult;
  domains: SiteDomainSummary[];
  dnsRecords: PublicSiteDnsRecord[];
  whoisRecords: PublicDomainWhoisRecord[];
};
```

시그니처:

```ts
export function getSiteCommonHeader(slug: string) {
  return unstable_cache(
    () => getSiteCommonHeaderUncached(slug),
    ["site-common-header-v1", slug],
    {
      revalidate: 300,
      tags: ["public-sites", `site:${slug}`],
    },
  )();
}

export function getSiteMainDetail(slug: string) {
  return unstable_cache(
    () => getSiteMainDetailUncached(slug),
    ["site-main-detail-v1", slug],
    {
      revalidate: 300,
      tags: ["public-sites", `site:${slug}`, `site-main:${slug}`],
    },
  )();
}

export function getSiteScamReportsDetail(slug: string) {
  return unstable_cache(
    () => getSiteScamReportsDetailUncached(slug),
    ["site-scam-reports-detail-v1", slug],
    {
      revalidate: 300,
      tags: ["public-sites", `site:${slug}`, `site-scam-reports:${slug}`],
    },
  )();
}

export function getSiteReviewsDetail(slug: string) {
  return unstable_cache(
    () => getSiteReviewsDetailUncached(slug),
    ["site-reviews-detail-v1", slug],
    {
      revalidate: 300,
      tags: ["public-sites", `site:${slug}`, `site-reviews:${slug}`],
    },
  )();
}

export function getSiteDomainsDetail(slug: string) {
  return unstable_cache(
    () => getSiteDomainsDetailUncached(slug),
    ["site-domains-detail-v1", slug],
    {
      revalidate: 300,
      tags: ["public-sites", `site:${slug}`, `site-domains:${slug}`],
    },
  )();
}
```

페이지 파일에서의 React `cache()` 적용:

```ts
const getCachedDetail = cache((slug: string) => getSiteScamReportsDetail(slug));

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const detail = await getCachedDetail(slug.trim());
  return buildSiteScamReportsMetadata(detail, slug.trim());
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const detail = await getCachedDetail(slug.trim());
  return <SiteScamReportsBody detail={detail} />;
}
```

`getSiteMainDetailUncached()`의 데이터 범위:

```ts
async function getSiteMainDetailUncached(slug: string) {
  const common = await getSiteCommonHeader(slug);
  const siteId = common.site?.id;

  if (!siteId) {
    return {
      common,
      observationSnapshot: null,
      relatedBlogReport: null,
      scamReportSummary: [],
      reviewSummary: [],
      domainSummary: [],
    };
  }

  const [
    observationSnapshotResult,
    relatedBlogResult,
    scamReportSummaryResult,
    reviewSummaryResult,
  ] = await Promise.all([
    getLatestPublicObservationSnapshot(siteId),
    getLatestRelatedBlogReport(siteId),
    getApprovedScamReportsBySiteId(siteId, { limit: 3 }),
    getApprovedReviewsBySiteId(siteId, { limit: 3 }),
  ]);

  return {
    common,
    observationSnapshot: observationSnapshotResult,
    relatedBlogReport: relatedBlogResult,
    scamReportSummary: scamReportSummaryResult,
    reviewSummary: reviewSummaryResult,
    domainSummary: getDomainSummary(common.site),
  };
}
```

기존 호환 래퍼:

```ts
export async function getPublicSiteDetail(slug: string) {
  const [main, scamReports, reviews, domains] = await Promise.all([
    getSiteMainDetail(slug),
    getSiteScamReportsDetail(slug),
    getSiteReviewsDetail(slug),
    getSiteDomainsDetail(slug),
  ]);

  return {
    site: main.common.site,
    reviews: reviews.reviews,
    scamReports: scamReports.scamReports,
    dnsRecords: domains.dnsRecords,
    domainCreationDates: domains.domains
      .filter((domain) => domain.creationDate)
      .map((domain) => ({
        domain: domain.domain,
        creationDate: domain.creationDate,
      })),
    observationSnapshot: main.observationSnapshot,
    relatedBlogReport: main.relatedBlogReport,
    errorMessage:
      main.common.errorMessage ||
      scamReports.common.errorMessage ||
      reviews.common.errorMessage ||
      domains.common.errorMessage,
    source: main.common.source,
  };
}
```

### 의사결정 근거

서브페이지는 자기 주제 데이터만 깊게 필요하다. 현재처럼 모든 페이지에서 후기 전체, 제보 전체, 스냅샷, 블로그, 도메인 데이터를 한 번에 가져오면 새 라우트가 늘수록 불필요한 쿼리가 커진다. 공통 헤더만 공유하고 본문 데이터는 함수 단위로 나누면 캐시 무효화와 성능 튜닝이 쉬워진다.

## 5. 공통 헤더 컴포넌트

### 결정 사항

`SiteHeaderCommon`은 4개 페이지 공통으로 쓴다. 공통 헤더에는 사이트명, 대표 주소, 신뢰점수, 평점/제보 카운트, 탭 내비게이션을 넣는다. 사이트 개요 본문, 스크린샷, 관측 스냅샷은 메인 페이지 전용이므로 헤더에 넣지 않는다.

탭 라벨에는 카운트를 붙인다.

```txt
메인 정보
먹튀 제보 (1)
후기 (3)
주소·도메인 (2)
```

파일럿 단계에서 split 비활성 사이트는 서브페이지 탭을 렌더하지 않거나 `nofollow`가 아니라 일반 링크 자체를 숨긴다. 라우트 파일은 존재하되 내부 링크와 sitemap 노출을 막고, 직접 접근은 메인 페이지로 영구 리다이렉트한다.

### 코드 예시

```tsx
export type SiteDetailTab = "main" | "scam-reports" | "reviews" | "domains";

export type SiteHeaderCommonProps = {
  common: SiteCommonHeaderResult;
  activeTab: SiteDetailTab;
  splitEnabled: boolean;
};

export function SiteHeaderCommon({
  common,
  activeTab,
  splitEnabled,
}: SiteHeaderCommonProps) {
  const site = common.site;

  if (!site) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-semibold uppercase text-accent">사이트 상세</p>
        <h1 className="mt-2 text-2xl font-bold">사이트 정보를 찾을 수 없습니다</h1>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase text-accent">사이트 상세</p>
      <h1 className="mt-2 text-2xl font-bold">
        {site.siteName} 토토사이트 검증
      </h1>
      <p className="mt-2 break-all text-sm text-muted">
        대표 주소: {formatDisplayUrl(site.siteUrl)}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <HeaderMetric label="신뢰점수" value={`${site.trustScore.total}/100`} />
        <HeaderMetric label="먹튀 제보" value={`${common.tabCounts.scamReports}건`} />
        <HeaderMetric label="후기" value={`${common.tabCounts.reviews}건`} />
      </div>

      {splitEnabled ? (
        <SiteDetailTabs
          slug={site.slug}
          activeTab={activeTab}
          counts={common.tabCounts}
        />
      ) : null}
    </section>
  );
}
```

탭 컴포넌트:

```tsx
type SiteDetailTabsProps = {
  slug: string;
  activeTab: SiteDetailTab;
  counts: {
    scamReports: number;
    reviews: number;
    domains: number;
  };
};

export function SiteDetailTabs({ slug, activeTab, counts }: SiteDetailTabsProps) {
  const encodedSlug = encodeURIComponent(slug);
  const tabs = [
    { id: "main", label: "메인 정보", href: `/sites/${encodedSlug}` },
    {
      id: "scam-reports",
      label: `먹튀 제보 (${counts.scamReports})`,
      href: `/sites/${encodedSlug}/scam-reports`,
    },
    {
      id: "reviews",
      label: `후기 (${counts.reviews})`,
      href: `/sites/${encodedSlug}/reviews`,
    },
    {
      id: "domains",
      label: `주소·도메인 (${counts.domains})`,
      href: `/sites/${encodedSlug}/domains`,
    },
  ] satisfies Array<{
    id: SiteDetailTab;
    label: string;
    href: string;
  }>;

  return (
    <nav className="mt-4 border-t border-line pt-3" aria-label="사이트 상세 페이지 탐색">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "tab-active" : "tab"}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### 의사결정 근거

탭에 숫자를 넣으면 검색자와 크롤러 모두 페이지의 고유성을 빠르게 파악할 수 있다. 공통 헤더를 너무 크게 만들면 4개 페이지의 중복 콘텐츠가 늘어나므로, 공통 헤더는 사이트 식별과 이동에 필요한 정보로 제한한다.

## 6. 내부 링크와 외부 참조 링크

### 결정 사항

4개 상세 페이지는 탭으로 서로 연결한다. 다만 자기 자신을 중복 링크로 반복하지 않는다. active 탭은 `aria-current="page"`만 주고, 클릭 가능한 링크 대신 현재 위치 표시로 렌더한다.

관련 사이트 카드와 관련 블로그 카드는 페이지별 주제에 맞을 때만 제한적으로 둔다. 한 사이트 안에서 탭 링크, 관련 카드, 블로그 링크가 모두 순환하면 내부 PageRank 흐름이 과도하게 닫힐 수 있다. 이를 보완하기 위해 4개 페이지 모두 책임 있는 이용 안내 영역에 외부 권위 링크 1~2개를 넣는다.

권장 외부 링크는 아래처럼 제한한다.

| 링크 | 용도 |
| --- | --- |
| 한국도박문제예방치유원 1336 안내 | 책임 있는 이용, 과몰입 예방, 상담 안내 |
| 경찰청 사이버범죄 신고시스템 또는 사이버수사 안내 | 피해 신고, 온라인 사기 대응 안내 |

외부 링크는 토토사이트, 가입 페이지, 이벤트 페이지, 주소 우회 페이지로 절대 연결하지 않는다.

### 코드 예시

active 탭은 링크로 만들지 않는다.

```tsx
function SiteDetailTabs({ slug, activeTab, counts }: SiteDetailTabsProps) {
  return (
    <nav aria-label="사이트 상세 페이지 탐색">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (isActive) {
          return (
            <span
              key={tab.id}
              aria-current="page"
              className="tab-active"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link key={tab.id} href={tab.href} className="tab">
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

기존 `ResponsibleUseNotice` 확장 방향:

```tsx
const responsibleUseExternalLinks = [
  {
    label: "한국도박문제예방치유원 1336 상담 안내",
    href: "https://www.kcgp.or.kr/",
  },
  {
    label: "경찰청 사이버범죄 신고시스템",
    href: "https://ecrm.police.go.kr/",
  },
] as const;

export function ResponsibleUseNotice({
  variant = "footer",
}: {
  variant?: "footer" | "card";
}) {
  return (
    <section>
      <h2>책임 있는 이용 안내</h2>
      <ul>
        {responsibleUseNotice.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
      <div>
        {responsibleUseExternalLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}
```

링크 배치 기준:

```txt
메인 페이지:
- 탭 3개
- 후기 요약 3건 → /reviews
- 먹튀 제보 요약 3건 → /scam-reports
- 도메인 요약 카드 → /domains
- 관련 블로그 1개
- 책임 있는 이용 외부 링크 1~2개

후기 페이지:
- 탭 3개
- 후기 전체
- 후기 작성 링크
- 관련 후기/사이트 카드 최대 3개
- 책임 있는 이용 외부 링크 1~2개

먹튀 제보 페이지:
- 탭 3개
- 제보 전체
- 제보 작성 링크
- 관련 제보 카드 최대 3개
- 책임 있는 이용 외부 링크 1~2개

도메인 페이지:
- 탭 3개
- 도메인/DNS/WHOIS
- 도메인 제보 링크
- 책임 있는 이용 외부 링크 1~2개
```

### 의사결정 근거

탭 구조 자체는 문제가 아니다. 문제는 모든 페이지가 자기 자신과 같은 사이트 내부 URL만 반복해서 가리키는 경우다. 외부 권위 링크는 검색엔진에 이 페이지가 폐쇄적인 홍보 허브가 아니라 공공 안내와 책임 있는 이용 맥락을 함께 제공한다는 신호를 준다.

현재 `app/components/responsible-use-notice.tsx`가 이미 있으므로 새 컴포넌트를 만들기보다 이 컴포넌트를 확장하는 편이 좋다. 기존 푸터 디자인을 깨지 않기 위해 `variant`를 두고, 상세 페이지에서는 카드형으로 사용할 수 있게 한다.

## 7. 빈 데이터 페이지 콘텐츠 보강 전략

### 결정 사항

먹튀 제보와 후기 페이지는 0건이어도 접근 가능해야 한다. 다만 `noindex,follow`로 처리하고, 사용자에게 다음 행동과 판단 기준을 안내한다.

0건 페이지에도 공통 헤더는 유지한다. 본문에는 자기 주제에 맞는 보강 콘텐츠만 넣는다.

0건 페이지도 thin content로 보이지 않도록 본문 텍스트 길이를 측정한다. 정확한 고정 기준은 없지만, 첫 구현 검수 기준은 한국어 공백 기준 200~300단어 이상 또는 순수 텍스트 900자 이상을 목표로 둔다. 단순히 문장을 늘리는 방식은 피하고, 사이트별 고유 정보가 들어간 카드와 FAQ로 채운다.

FAQ는 사이트명만 바꾸는 고정 템플릿으로 만들지 않는다. 답변마다 대표 도메인, 도메인 개수, 도메인 운영 이력, 후기/제보 카운트, 최근 관측일 같은 고유 값을 최소 1개 이상 섞는다.

### 코드 예시

먹튀 제보 0건 본문:

```tsx
function EmptyScamReportsBody({ common }: { common: SiteCommonHeaderResult }) {
  const site = common.site;

  if (!site) return <MissingSiteBody />;

  const context = buildEmptyPageContext(site);

  return (
    <div className="mt-5 grid gap-5">
      <SiteBasicInfoCard site={site} />

      <SiteEmptyState
        title="현재 승인된 먹튀 제보가 없습니다"
        description={`${site.siteName} 관련 공개 승인 제보는 아직 없습니다. 접수된 내용이 관리자 검토를 통과하면 이 페이지에 표시됩니다.`}
        actionHref="/submit-scam-report"
        actionLabel="먹튀 제보 작성"
      />

      <ScamReportHowToCard siteName={site.siteName} />
      <SiteScamReportFaq context={context} />
      <RelatedScamReportCards currentSiteId={site.id} />
      <ResponsibleUseNotice />
    </div>
  );
}
```

본문 길이 측정 유틸:

```ts
function getPlainPageTextLength(value: string) {
  return value.replace(/\s+/g, " ").trim().length;
}

function getKoreanWhitespaceWordCount(value: string) {
  return value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function assertEmptyPageContentQuality({
  renderedText,
  minChars = 900,
  minWords = 200,
}: {
  renderedText: string;
  minChars?: number;
  minWords?: number;
}) {
  const charLength = getPlainPageTextLength(renderedText);
  const wordCount = getKoreanWhitespaceWordCount(renderedText);

  return {
    pass: charLength >= minChars || wordCount >= minWords,
    charLength,
    wordCount,
  };
}
```

사이트별 FAQ context:

```ts
type EmptyPageFaqContext = {
  siteName: string;
  representativeDomain: string;
  domainCount: number;
  operatingPeriod: string;
  reviewCount: number;
  scamReportCount: number;
  latestObservationDate: string | null;
};

function buildEmptyPageContext(site: ReviewTarget): EmptyPageFaqContext {
  return {
    siteName: site.siteName,
    representativeDomain: formatDisplayDomain(site.siteUrl),
    domainCount: Math.max(1, site.domains.length),
    operatingPeriod: site.oldestDomainCreationDate
      ? getDomainAge(site.oldestDomainCreationDate)
      : "확인 불가",
    reviewCount: site.reviewCount,
    scamReportCount: site.scamReportCount ?? 0,
    latestObservationDate: site.dnsCheckedAt,
  };
}
```

먹튀 제보 FAQ 예시:

```tsx
function getScamReportFaqItems(context: EmptyPageFaqContext) {
  return [
  {
    question: "먹튀 제보가 0건이면 문제가 없다는 뜻인가요?",
    answer: `아닙니다. ${context.siteName}은 대표 도메인 ${context.representativeDomain}과 도메인 ${context.domainCount}개를 기준으로 정리되어 있지만, 이런 정보만으로 안전성을 보장할 수는 없습니다. 이 페이지에는 관리자 승인을 거친 공개 제보만 표시됩니다.`,
  },
  {
    question: "제보는 바로 공개되나요?",
    answer: `${context.siteName} 관련 제보가 접수되더라도 바로 공개되지는 않습니다. 개인정보, 중복 여부, 증빙 내용을 확인한 뒤 공개 여부가 결정됩니다. 현재 공개 승인 제보 수는 ${context.scamReportCount}건입니다.`,
  },
  {
    question: "피해 금액을 모르면 제보할 수 있나요?",
    answer: `가능합니다. ${context.siteName} 제보를 작성할 때 피해 금액을 모르면 금액 미상으로 접수하고, 상황 설명과 증빙을 중심으로 남길 수 있습니다.`,
  },
  {
    question: "비슷한 사례는 어디서 볼 수 있나요?",
    answer: `${context.siteName} 페이지 안에서는 아직 공개 제보가 없으므로, 관련 제보 카드와 전체 먹튀 제보 목록에서 다른 공개 사례를 함께 확인하는 방식이 좋습니다.`,
  },
  ];
}
```

후기 0건 본문:

```tsx
function EmptyReviewsBody({ common }: { common: SiteCommonHeaderResult }) {
  const site = common.site;

  if (!site) return <MissingSiteBody />;

  const context = buildEmptyPageContext(site);

  return (
    <div className="mt-5 grid gap-5">
      <SiteBasicInfoCard site={site} />

      <SiteEmptyState
        title="현재 승인된 후기가 없습니다"
        description={`${site.siteName} 관련 공개 승인 후기는 아직 없습니다. 작성된 후기가 검토를 통과하면 이 페이지에 표시됩니다.`}
        actionHref="/submit-review"
        actionLabel="후기 작성"
      />

      <ReviewWritingGuideCard siteName={site.siteName} />
      <SiteReviewFaq context={context} />
      <RelatedReviewSiteCards currentSiteId={site.id} />
      <ResponsibleUseNotice />
    </div>
  );
}
```

후기 FAQ 예시:

```tsx
function getReviewFaqItems(context: EmptyPageFaqContext) {
  return [
  {
    question: "후기가 0건이면 이용자가 없다는 뜻인가요?",
    answer: `아닙니다. ${context.siteName}은 현재 대표 도메인 ${context.representativeDomain} 기준으로 공개되어 있지만, 승인된 후기가 ${context.reviewCount}건이라는 뜻일 뿐 실제 이용자 수를 의미하지 않습니다.`,
  },
  {
    question: "후기는 어떤 기준으로 공개되나요?",
    answer: `${context.siteName} 후기는 중복, 욕설, 개인정보, 근거 없는 단정 표현을 검토한 뒤 공개됩니다. 도메인 ${context.domainCount}개나 운영 이력 ${context.operatingPeriod} 같은 정보는 참고값일 뿐 후기 검토를 대체하지 않습니다.`,
  },
  {
    question: "평점은 어떻게 반영되나요?",
    answer: `평점은 ${context.siteName}에 대해 승인된 후기만 평균에 반영합니다. 현재 공개 승인 후기가 없으면 평점도 검색 결과나 구조화 데이터에 넣지 않습니다.`,
  },
  {
    question: "부정적인 후기도 작성할 수 있나요?",
    answer: `가능합니다. ${context.siteName} 이용 중 불편했던 내용도 작성할 수 있지만, 사실 관계와 경험 내용을 구체적으로 적어야 공개 검토가 가능합니다.`,
  },
  ];
}
```

### 의사결정 근거

0건 페이지를 비워두면 사용자는 왜 페이지가 있는지 이해하기 어렵다. 반대로 0건 페이지를 색인하면 얇은 페이지가 많아진다. `noindex,follow`와 보강 콘텐츠를 함께 쓰면 사용자 경험과 크롤링 경로를 유지하면서 품질 리스크를 줄일 수 있다.

FAQ를 고정 문장으로 두면 사이트 100개에 같은 답변이 반복된다. 사이트명만 바뀐 FAQ는 중복 콘텐츠로 보일 수 있으므로, 답변 안에 대표 도메인, 도메인 수, 운영 이력, 공개 후기/제보 수 같은 고유 값을 넣어야 한다. 첫 구현에서는 렌더된 HTML에서 텍스트 길이와 FAQ 유사도를 테스트로 확인한다.

## 8. `sitemap.ts` 갱신

### 결정 사항

현재 `app/sitemap.ts`는 `getPublicSitesForSitemap()` 결과에서 기존 `/sites/[slug]`만 추가한다. 분리 후에는 같은 위치에서 서브페이지 3개를 조건부로 추가한다.

정책은 다음과 같다.

| URL | sitemap 포함 |
| --- | --- |
| `/sites/[slug]` | 파일럿 활성 slug면 항상 포함. 확대 후 전체 승인 사이트 포함. |
| `/sites/[slug]/scam-reports` | 파일럿 활성 + 승인/공개 먹튀 제보 1건 이상일 때만 포함. |
| `/sites/[slug]/reviews` | 파일럿 활성 + 승인 후기 1건 이상일 때만 포함. |
| `/sites/[slug]/domains` | 파일럿 활성 slug면 항상 포함. |

파일럿 비활성 slug는 메인 페이지만 sitemap에 남긴다.

sitemap 데이터는 사이트별 N+1 쿼리로 만들지 않는다. `latestReviewAt`, `latestScamReportAt`, `latestDomainSignalAt` 같은 값은 사이트 수만큼 개별 조회하지 않고, Supabase view 또는 materialized view, 최소한 배치 쿼리 2~4개로 한 번에 가져온다.

### 코드 예시

```ts
const siteEntries: MetadataRoute.Sitemap = publicSitesForSitemapResult.entries
  .flatMap((entry) => {
    const splitEnabled = isSitePageSplitEnabled(entry.site.slug);
    const baseUrl = `${siteUrl}/sites/${entry.site.slug}`;

    const pages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: entry.lastModified ? new Date(entry.lastModified) : new Date(),
        changeFrequency: "weekly",
        priority: 0.75,
      },
    ];

    if (!splitEnabled) {
      return pages;
    }

    if ((entry.site.scamReportCount ?? 0) > 0) {
      pages.push({
        url: `${baseUrl}/scam-reports`,
        lastModified: entry.latestScamReportAt
          ? new Date(entry.latestScamReportAt)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    if (entry.site.reviewCount > 0) {
      pages.push({
        url: `${baseUrl}/reviews`,
        lastModified: entry.latestReviewAt
          ? new Date(entry.latestReviewAt)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }

    pages.push({
      url: `${baseUrl}/domains`,
      lastModified: entry.latestDomainSignalAt
        ? new Date(entry.latestDomainSignalAt)
        : new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });

    return pages;
  });
```

`getPublicSitesForSitemap()` 확장 타입:

```ts
export type PublicSiteSitemapEntry = {
  site: ReviewTarget;
  observationSnapshot: PublicSitemapSnapshot | null;
  relatedBlogReport: PublicSitemapBlogReport | null;
  latestReviewAt: string | null;
  latestScamReportAt: string | null;
  latestDomainSignalAt: string | null;
  lastModified: string | null;
};
```

권장 view 예시:

```sql
create or replace view public_sites_sitemap_v1 as
select
  s.id,
  s.slug,
  s.name,
  s.name_ko,
  s.name_en,
  s.url,
  s.domains,
  s.screenshot_url,
  s.screenshot_thumb_url,
  s.favicon_url,
  s.logo_url,
  s.category,
  s.available_states,
  s.license_info,
  s.resolved_ips,
  s.dns_checked_at,
  s.description,
  s.updated_at,
  coalesce(r.review_count, 0) as review_count,
  coalesce(r.latest_review_at, null) as latest_review_at,
  coalesce(sr.scam_report_count, 0) as scam_report_count,
  coalesce(sr.latest_scam_report_at, null) as latest_scam_report_at,
  coalesce(d.latest_domain_signal_at, s.dns_checked_at) as latest_domain_signal_at
from sites s
left join (
  select
    site_id,
    count(*) as review_count,
    max(coalesce(updated_at, created_at)) as latest_review_at
  from reviews
  where status = 'approved'
  group by site_id
) r on r.site_id = s.id
left join (
  select
    site_id,
    count(*) as scam_report_count,
    max(coalesce(updated_at, created_at)) as latest_scam_report_at
  from scam_reports
  where review_status = 'approved'
    and is_published = true
  group by site_id
) sr on sr.site_id = s.id
left join (
  select
    site_id,
    max(checked_at) as latest_domain_signal_at
  from site_dns_records
  group by site_id
) d on d.site_id = s.id
where s.status = 'approved';
```

`approved_at` 컬럼이 있다면 `created_at/updated_at`보다 `approved_at`을 우선한다. 현재 코드에서는 `reviews.created_at`, `scam_reports.created_at`, `site_dns_records.checked_at`, `sites.dns_checked_at` 사용 패턴이 보이므로 실제 마이그레이션 전에 컬럼 존재 여부를 확인한다.

view 사용 예시:

```ts
async function getPublicSitesForSitemapUncached() {
  const [sitesResult, snapshotsResult, blogReportsResult] = await Promise.all([
    supabase
      .from("public_sites_sitemap_v1")
      .select(PUBLIC_SITEMAP_SITE_SELECT)
      .order("updated_at", { ascending: false }),
    supabase
      .from("site_crawl_snapshot_public")
      .select(PUBLIC_SITEMAP_SNAPSHOT_SELECT)
      .order("collected_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select(PUBLIC_SITEMAP_BLOG_REPORT_SELECT)
      .eq("status", "published")
      .eq("legal_review_status", "approved"),
  ]);

  return mapSitemapRows({
    siteRows: sitesResult.data ?? [],
    snapshotRows: snapshotsResult.data ?? [],
    blogRows: blogReportsResult.data ?? [],
  });
}
```

view를 바로 만들기 어렵다면 최소한 배치 쿼리로 처리한다.

```ts
const siteIds = siteRows.map((site) => site.id);

const [reviewStatsResult, scamReportStatsResult, dnsStatsResult] =
  await Promise.all([
    supabase
      .from("reviews")
      .select("site_id, created_at, updated_at")
      .in("site_id", siteIds)
      .eq("status", "approved"),
    supabase
      .from("scam_reports")
      .select("site_id, created_at, updated_at")
      .in("site_id", siteIds)
      .eq("review_status", "approved")
      .eq("is_published", true),
    supabase
      .from("site_dns_records")
      .select("site_id, checked_at")
      .in("site_id", siteIds),
  ]);
```

N+1 방지 테스트 예시:

```ts
test("sitemap loader does not query per site", async () => {
  const calls = createSupabaseCallRecorder();

  await getPublicSitesForSitemapUncached({ supabase: calls.client });

  assert.equal(calls.countByTable("reviews") <= 1, true);
  assert.equal(calls.countByTable("scam_reports") <= 1, true);
  assert.equal(calls.countByTable("site_dns_records") <= 1, true);
});
```

### 의사결정 근거

`robots`가 `noindex`인 페이지를 sitemap에 넣으면 검색엔진에 상충 신호를 준다. 후기/제보 0건 페이지는 접근 가능하지만 sitemap에서는 제외한다. domains는 대표 도메인이 항상 있으므로 파일럿 활성 사이트에서는 sitemap에 넣는다.

sitemap은 `dynamic = "force-dynamic"`이라 요청 시점 성능이 중요하다. 사이트 1000개에서 리뷰, 제보, DNS 최신일을 사이트별로 따로 조회하면 수천 번의 DB 쿼리가 발생한다. view나 배치 쿼리로 한 번에 가져오면 sitemap 생성 시간이 예측 가능해지고, Search Console이나 크롤러가 sitemap을 자주 요청해도 DB 부하를 낮출 수 있다.

## 9. 캐싱 전략

### 결정 사항

캐시는 함수 단위로 나눈다. 공통 헤더 캐시와 페이지별 상세 캐시를 분리하고, 태그는 기존 `public-sites`와 신규 `site:${slug}`를 함께 둔다.

캐시 원칙은 다음과 같다.

- `getSiteCommonHeader(slug)`는 4개 페이지가 공유한다.
- 본문 상세 캐시는 `main`, `scam-reports`, `reviews`, `domains`별로 분리한다.
- `generateMetadata()`와 페이지 렌더는 각 페이지 파일에서 `cache()`로 같은 요청 안의 중복 호출을 줄인다.
- 기존 무효화와 호환되도록 `public-sites` 태그는 유지한다.
- 새 승인/수정 API에는 점진적으로 `revalidateTag(\`site:${slug}\`)`를 추가한다.

### 코드 예시

캐시 키:

```ts
const siteCacheKeys = {
  common: (slug: string) => ["site-common-header-v1", slug],
  main: (slug: string) => ["site-main-detail-v1", slug],
  scamReports: (slug: string) => ["site-scam-reports-detail-v1", slug],
  reviews: (slug: string) => ["site-reviews-detail-v1", slug],
  domains: (slug: string) => ["site-domains-detail-v1", slug],
};
```

태그:

```ts
const siteCacheTags = {
  common: (slug: string) => ["public-sites", `site:${slug}`],
  main: (slug: string) => ["public-sites", `site:${slug}`, `site-main:${slug}`],
  scamReports: (slug: string) => [
    "public-sites",
    `site:${slug}`,
    `site-scam-reports:${slug}`,
  ],
  reviews: (slug: string) => [
    "public-sites",
    `site:${slug}`,
    `site-reviews:${slug}`,
  ],
  domains: (slug: string) => [
    "public-sites",
    `site:${slug}`,
    `site-domains:${slug}`,
  ],
};
```

무효화:

```ts
// 사이트 설명, 대표 URL, 도메인 목록, 스크린샷, favicon 변경
revalidateTag("public-sites", "max");
revalidateTag(`site:${slug}`, "max");
revalidateTag(`site-main:${slug}`, "max");
revalidateTag(`site-domains:${slug}`, "max");

// 먹튀 제보 승인/수정/비공개 전환
revalidateTag("public-sites", "max");
revalidateTag(`site:${slug}`, "max");
revalidateTag(`site-scam-reports:${slug}`, "max");

// 후기 승인/수정/비공개 전환
revalidateTag("public-sites", "max");
revalidateTag(`site:${slug}`, "max");
revalidateTag(`site-reviews:${slug}`, "max");

// DNS/WHOIS 갱신
revalidateTag("public-sites", "max");
revalidateTag(`site:${slug}`, "max");
revalidateTag(`site-domains:${slug}`, "max");
```

파일럿 단계에서 동적 태그 도입이 부담되면 1차는 기존 `public-sites` 태그만 유지해도 된다. 다만 설계 목표는 사이트 단위 무효화다.

### 의사결정 근거

사이트 상세가 4개 URL로 늘면 하나의 `public-site-detail` 캐시에 모두 묶는 방식은 비효율적이다. 제보가 승인될 때 도메인 페이지 캐시까지 매번 흔들 필요가 없다. 함수 단위 캐시는 초기 구현량이 조금 늘지만, 장기적으로 성능과 무효화 범위를 관리하기 쉽다.

## 10. 단계적 적용 계획

### 결정 사항

파일럿은 유튜벳 `youtoobet-morjcswx-p7k7` 하나로 시작한다. 피처 플래그는 서버 환경 변수로 제어한다.

권장 환경 변수:

```txt
SITE_PAGE_SPLIT_ENABLED_SLUGS=youtoobet-morjcswx-p7k7
```

전체 오픈 시에는 아래처럼 쓴다.

```txt
SITE_PAGE_SPLIT_ENABLED_SLUGS=*
```

파일럿 비활성 slug의 정책:

- `/sites/[slug]`는 기존처럼 노출한다.
- `/sites/[slug]/scam-reports`, `/reviews`, `/domains` 라우트는 존재해도 내부 탭과 sitemap에 넣지 않는다.
- 직접 접근하면 안내 페이지를 만들지 않고 `/sites/[slug]`로 `308` 영구 리다이렉트한다.
- 예외적으로 리다이렉트를 못 쓰는 상황에서만 `noindex,follow` 안내 페이지를 fallback으로 둔다. 이 경우 본문 최상단에 메인 페이지 링크를 강하게 노출하고, 클라이언트 자동 이동은 보조 장치로만 사용한다.

### 코드 예시

피처 플래그:

```ts
const pilotSlug = "youtoobet-morjcswx-p7k7";

export function getSitePageSplitEnabledSlugs() {
  return (process.env.SITE_PAGE_SPLIT_ENABLED_SLUGS ?? pilotSlug)
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function isSitePageSplitEnabled(slug: string) {
  const enabledSlugs = getSitePageSplitEnabledSlugs();

  return enabledSlugs.includes("*") || enabledSlugs.includes(slug);
}
```

비활성 slug 서버 리다이렉트:

```tsx
import { permanentRedirect } from "next/navigation";

function redirectDisabledSplitPage(slug: string): never {
  permanentRedirect(`/sites/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: SiteSubPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);
  return buildSiteReviewsMetadata(detail, slug);
}

export default async function SiteReviewsPage({ params }: SiteSubPageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim();

  if (!isSitePageSplitEnabled(slug)) {
    redirectDisabledSplitPage(slug);
  }

  const detail = await getCachedDetail(slug);
  return <SiteReviewsBody detail={detail} />;
}
```

리다이렉트를 쓰지 못할 때만 쓰는 fallback 안내 페이지:

```tsx
function DisabledSplitPage({ slug }: { slug: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <Link href={`/sites/${encodeURIComponent(slug)}`}>
        메인 정보로 돌아가기
      </Link>
      <section className="mt-5 rounded-lg border border-line bg-surface p-6">
        <h1 className="text-2xl font-bold">상세 분리 페이지 준비 중</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          현재 이 사이트는 메인 정보 페이지에서만 공개 정보를 확인할 수 있습니다.
        </p>
        <p className="mt-3 text-sm font-semibold text-accent">
          이 주소는 검색 색인 대상이 아니며, 메인 페이지에서 같은 정보를 확인할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
```

단계:

### Week 1: 유튜벳 파일럿

`youtoobet-morjcswx-p7k7`만 탭, sitemap, 서브페이지 메타를 활성화한다. Search Console 제출 전에는 `site:` 검색과 실제 렌더 HTML의 `robots`, `canonical`, 내부 링크를 확인한다.

### Week 2~4: Search Console 모니터링

확인할 항목은 색인 생성 페이지 수, 제외된 noindex 페이지, 클릭/노출 변화, 중복 canonical 경고, 크롤링 빈도다. 특히 후기/제보 0건 페이지가 sitemap에 들어가지 않는지 확인한다.

### Month 2+: 확대 기준

확대 기준은 다음 정도가 적당하다.

- 파일럿 사이트의 메인 페이지 색인에 악영향이 없다.
- `/domains`가 정상 색인된다.
- `/reviews`, `/scam-reports`는 데이터 1건 이상일 때만 색인된다.
- Search Console에서 중복 페이지 또는 대체 canonical 경고가 늘지 않는다.
- 서버 로그상 신규 페이지의 Supabase 쿼리 비용이 기존 상세 페이지 대비 과도하게 늘지 않는다.

### 의사결정 근거

SEO용 URL 분리는 한 번에 전체 적용하면 문제 원인 추적이 어렵다. 파일럿 slug를 하나로 제한하면 Search Console에서 색인, canonical, noindex, sitemap 동작을 작은 범위에서 먼저 검증할 수 있다.

비활성 slug의 서브페이지는 안내 페이지보다 `308` 리다이렉트가 우선이다. 같은 URL 패턴에서 파일럿 사이트는 정상 콘텐츠를 보여주고 비활성 사이트는 얇은 안내 페이지만 보여주면 soft 404 또는 중복 얇은 페이지로 판단될 수 있다. 서버 리다이렉트는 검색엔진과 사용자 모두에게 메인 URL이 정식 목적지라는 신호를 더 명확하게 준다.
