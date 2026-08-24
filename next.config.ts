import os from "node:os";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** Extra hosts for `next dev` when opening via LAN IP / alternate hostname. */
const extraDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Current machine IPv4s so a phone can load `/_next` after DHCP changes. */
function lanDevOrigins(): string[] {
  const hosts = new Set<string>(["127.0.0.1", "192.168.1.123"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) hosts.add(addr.address);
    }
  }
  return [...hosts];
}

function r2PublicBasePattern(): NonNullable<
  NextConfig["images"]
>["remotePatterns"] {
  const raw = process.env.AVATAR_PUBLIC_BASE_URL?.trim();
  if (!raw) return [];
  try {
    const url = new URL(raw);
    if (!url.hostname || url.hostname === "images.igdb.com") return [];
    if (url.hostname.endsWith(".r2.dev")) return [];
    return [
      {
        protocol: url.protocol === "http:" ? "http" : "https",
        hostname: url.hostname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Dev server blocks cross-origin /_next assets unless the browser host is
  // allowlisted (localhost alone is not enough for 127.0.0.1 or LAN IPs).
  allowedDevOrigins: [...lanDevOrigins(), ...extraDevOrigins],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        pathname: "/igdb/image/upload/**",
      },
      // TGA nominees, avatars, and community art (R2 public / custom base).
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      ...r2PublicBasePattern(),
    ],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
