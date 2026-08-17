import { profileHref } from "@/lib/profile/profile-page";

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
      groups: SiteAccountMenuGroup[];
    }
  | { status: "anonymous" };

export const SITE_CREATE_HREF = "/create";

/** Accent-bordered Create control shared by desktop nav, mobile header, and drawer. */
export const siteCreateLinkClass =
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-accent px-4 py-2 text-sm font-semibold tracking-wide text-accent transition-opacity hover:opacity-90";

/** Local + preview only — never on Vercel production. Opt-in elsewhere via SHOW_DESIGN_SYSTEM=1. */
export function showDesignSystemNav(env: {
  vercelEnv?: string;
  nodeEnv?: string;
  showDesignSystem?: string;
}): boolean {
  if (env.vercelEnv === "production") return false;
  if (env.nodeEnv === "development") return true;
  if (env.vercelEnv === "preview") return true;
  return env.showDesignSystem === "1";
}

/** Primary chrome links shared by desktop nav and the mobile drawer. */
export function buildPrimarySiteNavLinks(): SiteNavLink[] {
  return [
    { href: "/games", label: "Games" },
    { href: "/standings", label: "GOTY" },
    { href: "/communities", label: "Communities" },
  ];
}

export function siteCreateLink(): SiteNavLink {
  return { href: SITE_CREATE_HREF, label: "+ Create" };
}

/** Admin and Design system — account menu / drawer utility cluster, not primary chrome. */
export function buildUtilitySiteNavLinks(options: {
  includeDesignSystem: boolean;
}): SiteNavLink[] {
  const links: SiteNavLink[] = [{ href: "/admin", label: "Admin" }];
  if (options.includeDesignSystem) {
    links.push({ href: "/design-system", label: "Design system" });
  }
  return links;
}

export function buildAccountMenuGroups(options: {
  username: string | null;
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

  return [
    { id: "profile", items: profileItems },
    { id: "settings", items: [{ href: "/account", label: "Settings" }] },
    {
      id: "ops",
      items: buildUtilitySiteNavLinks({
        includeDesignSystem: options.includeDesignSystem,
      }),
    },
  ];
}
