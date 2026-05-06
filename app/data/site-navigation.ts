export type SiteNavigationLink = {
  href: string;
  label: string;
};

export const primaryNavigationLinks: SiteNavigationLink[] = [
  { href: "/", label: "홈" },
  { href: "/sites", label: "사이트 목록" },
  { href: "/reviews", label: "이용 후기" },
  { href: "/scam-reports", label: "먹튀 제보" },
  { href: "/domains", label: "도메인 정보" },
  { href: "/site-registration", label: "사이트 등록" },
  { href: "/blog", label: "블로그" },
];

export const footerNavigationLinks: SiteNavigationLink[] = [
  { href: "/blog", label: "블로그" },
  { href: "/telegram-guide", label: "텔레그램 기능 안내" },
];
