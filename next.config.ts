import os from "node:os";
import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextLinkWithoutPrefetch = path.join(
  process.cwd(),
  "src/lib/next-link.tsx",
);

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

function r2PublicBasePattern(): Array<{
  protocol: "http" | "https";
  hostname: string;
}> {
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
  // Viewport Link prefetch runs the destination Server Component. Off by default.
  turbopack: {
    resolveAlias: {
      "next/link": "./src/lib/next-link.tsx",
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    const alias = config.resolve.alias;
    if (Array.isArray(alias)) {
      alias.push({ name: "next/link", alias: nextLinkWithoutPrefetch });
    } else {
      config.resolve.alias = {
        ...alias,
        "next/link": nextLinkWithoutPrefetch,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.igdb.com",
        pathname: "/igdb/image/upload/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
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
