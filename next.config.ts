import type { NextConfig } from "next";

function getSupabaseImageHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "";
  }
}

function getSiteImageHostname() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredSiteUrl) {
    return "";
  }

  try {
    return new URL(configuredSiteUrl).hostname;
  } catch {
    return "";
  }
}

const supabaseImageHostname = getSupabaseImageHostname();
const siteImageHostname = getSiteImageHostname();
const remoteImagePatterns = [
  ...(supabaseImageHostname
    ? [
        {
          protocol: "https" as const,
          hostname: supabaseImageHostname,
          pathname: "/storage/v1/object/public/**",
        },
      ]
    : []),
  ...(siteImageHostname && siteImageHostname !== supabaseImageHostname
    ? [
        {
          protocol: "https" as const,
          hostname: siteImageHostname,
          pathname: "/**",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: remoteImagePatterns,
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [160, 320, 480, 640],
    minimumCacheTTL: 86_400,
  },
};

export default nextConfig;
