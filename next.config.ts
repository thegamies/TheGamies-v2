import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Dev server blocks cross-origin /_next assets; allow 127.0.0.1 when people
  // open that host instead of localhost.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        pathname: "/igdb/image/upload/**",
      },
    ],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
