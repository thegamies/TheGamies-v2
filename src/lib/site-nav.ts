import { profileHref } from "@/lib/profile/profile-page";
import { TGA_PUBLIC_LABEL } from "@/lib/tga-pickem/labels";

export type SiteNavLink = {
  href: string;
  label: string;
};

export type SiteAccountMenuGroup = {
  id: string;
  items: SiteNavLink[];
};

export type SiteNavAccount =
  | {
      status: "authenticated";
      label: string;
      username: string;
      avatarUrl: string | null;
      groups: SiteAccountMenuGroup[];
    }
  | { status: "anonymous" };

export const SITE_CREATE_HREF = "/create";

/** Accent-bordered Create control shared by desktop nav, mobile header, and drawer. */
export const siteCreateLinkClass =
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-accent px-4 py-2 text-sm font-semibold tracking-wide text-accent transition-opacity hover:opacity-90";

/** Local + PR Worker previews. Lasting staging/production stay hidden (even with SHOW_DESIGN_SYSTEM=1). */
export function showDesignSystemNav(env: {
  nodeEnv?: string;
  showDesignSystem?: string;
  /** Public app origin; used to detect lasting Cloudflare hosts. */
  appUrl?: string;
}): boolean {
  if (env.nodeEnv === "development") return true;
  const appUrl = env.appUrl?.trim();
  if (appUrl) {
    try {
      const hostname = new URL(appUrl).hostname.toLowerCase();
      if (
        hostname === "thegamies.gg" ||
        hostname.endsWith(".thegamies.gg") ||
        hostname.includes("thegamies-v2-develop") ||
        hostname === "thegamies-v2.ecdm981.workers.dev"
      ) {
        return false;
      }
      // PR / branch Workers.
      if (hostname.endsWith(".workers.dev")) return true;
    } catch {
      // fall through
    }
  }
  return env.showDesignSystem === "1";
}

/** Primary chrome links shared by desktop nav and the mobile drawer. */
export function buildPrimarySiteNavLinks(options?: {
  tgaHref?: string | null;
}): SiteNavLink[] {
  const links: SiteNavLink[] = [
    { href: "/games", label: "Games" },
    { href: "/game-of-the-year", label: "GOTY" },
  ];
  if (options?.tgaHref) {
    links.push({ href: options.tgaHref, label: TGA_PUBLIC_LABEL });
  }
  links.push({ href: "/communities", label: "Communities" });
  return links;
}

export function siteCreateLink(): SiteNavLink {
  return { href: SITE_CREATE_HREF, label: "+ Create" };
}

/** Admin (site operators only) and Design system — account menu / drawer, not primary chrome. */
export function buildUtilitySiteNavLinks(options: {
  includeAdmin?: boolean;
  includeDesignSystem: boolean;
}): SiteNavLink[] {
  const links: SiteNavLink[] = [];
  if (options.includeAdmin) {
    links.push({ href: "/admin", label: "Admin" });
  }
  if (options.includeDesignSystem) {
    links.push({ href: "/design-system", label: "Design system" });
  }
  return links;
}

export function buildAccountMenuGroups(options: {
  username: string | null;
  includeAdmin?: boolean;
  includeDesignSystem: boolean;
}): SiteAccountMenuGroup[] {
  const profileItems: SiteNavLink[] = options.username
    ? [
        { href: profileHref(options.username), label: "View Profile" },
        { href: profileHref(options.username, { tab: "lists" }), label: "My Lists" },
        {
          href: profileHref(options.username, { tab: "communities" }),
          label: "My Communities",
        },
      ]
    : [{ href: "/account", label: "View Profile" }];

  const ops = buildUtilitySiteNavLinks({
    includeAdmin: options.includeAdmin,
    includeDesignSystem: options.includeDesignSystem,
  });

  return [
    { id: "profile", items: profileItems },
    { id: "settings", items: [{ href: "/account", label: "Settings" }] },
    ...(ops.length > 0 ? [{ id: "ops", items: ops }] : []),
  ];
}
