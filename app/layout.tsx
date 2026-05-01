import type { Metadata } from "next";
import { AuthProvider } from "@/app/components/auth-provider";
import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";
import { SiteShell } from "@/app/components/site-shell";
import { siteDescription, siteName, siteUrl } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: `%s | ${siteName}`,
    default: `${siteName} - 안전한 토토사이트 순위 및 리뷰`,
  },
  description: siteDescription,
  keywords: [
    "토토사이트",
    "토토사이트 추천",
    "안전한 토토사이트",
    "먹튀검증 토토사이트",
    "토토사이트 순위",
    "토토사이트 리뷰",
    "해외 토토사이트",
    "스포츠토토",
    "온라인토토",
    "토토 커뮤니티",
    "먹튀사이트",
    "토토사이트 후기",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - 안전한 토토사이트 순위 및 리뷰`,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - 안전한 토토사이트 순위 및 리뷰`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <SiteShell header={<Header />} footer={<Footer />}>
            {children}
          </SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
