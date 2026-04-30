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

const supabaseImageHostname = getSupabaseImageHostname();

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
    remotePatterns: supabaseImageHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseImageHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [160, 320, 480, 640],
    minimumCacheTTL: 86_400,
  },
};

export default nextConfig;
