export type SiteNavLink = {
  href: string;
  label: string;
};

export type SiteNavAccount =
  | {
      status: "authenticated";
      profileHref: string;
      label: string;
    }
  | { status: "anonymous" };

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
export function buildPrimarySiteNavLinks(options: {
  includeDesignSystem: boolean;
}): SiteNavLink[] {
  const links: SiteNavLink[] = [
    { href: "/games", label: "Games" },
    { href: "/game-of-the-year", label: "Standings" },
    { href: "/communities", label: "Communities" },
    { href: "/create", label: "Create" },
  ];

  if (options.includeDesignSystem) {
    links.push({ href: "/design-system", label: "Design system" });
  }

  links.push({ href: "/admin", label: "Admin" });
  return links;
}
