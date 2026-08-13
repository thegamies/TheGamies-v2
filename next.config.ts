import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** Extra hosts for `next dev` when opening via LAN IP / alternate hostname. */
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Dev server blocks cross-origin /_next assets unless the browser host is
  // allowlisted (localhost alone is not enough for 127.0.0.1 or LAN IPs).
  allowedDevOrigins: ["127.0.0.1", "192.168.1.164", ...extraDevOrigins],
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
