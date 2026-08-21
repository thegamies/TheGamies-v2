import Link from "next/link";
import { Suspense } from "react";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { SignInLink } from "@/components/auth/SignInLink";
import { SiteAccountMenu } from "@/components/SiteAccountMenu";
import { SiteBrand } from "@/components/SiteBrand";
import { SiteCreateLink } from "@/components/SiteCreateLink";
import { SiteHeaderChrome } from "@/components/SiteHeaderChrome";
import { SiteMobileNav } from "@/components/SiteMobileNav";
import {
  buildAccountMenuGroups,
  buildPrimarySiteNavLinks,
  buildUtilitySiteNavLinks,
  showDesignSystemNav,
  type SiteNavAccount,
} from "@/lib/site-nav";

export async function SiteHeader() {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const includeDesignSystem = showDesignSystemNav({
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    showDesignSystem: process.env.SHOW_DESIGN_SYSTEM,
  });
  const primaryLinks = buildPrimarySiteNavLinks();
  const utilityLinks = buildUtilitySiteNavLinks({ includeDesignSystem });
  const account: SiteNavAccount = user
    ? {
        status: "authenticated",
        label: profile?.displayName ?? user.name ?? "Account",
        groups: buildAccountMenuGroups({
          username: profile?.username ?? null,
          includeDesignSystem,
        }),
      }
    : { status: "anonymous" };

  return (
    <SiteHeaderChrome>
      <div className="mx-auto flex max-w-[var(--page-max)] items-center justify-between gap-6 px-[var(--gutter)] py-2">
        <SiteBrand />
        <nav
          className="hidden items-center gap-5 text-sm font-semibold text-muted lg:flex"
          aria-label="Site"
        >
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
          <SiteCreateLink />
          {account.status === "authenticated" ? (
            <SiteAccountMenu label={account.label} groups={account.groups} />
          ) : (
            <Suspense
              fallback={
                <Link
                  href="/auth/sign-in"
                  className="font-semibold hover:text-ink"
                >
                  Sign in
                </Link>
              }
            >
              <SignInLink className="font-semibold hover:text-ink" />
            </Suspense>
          )}
        </nav>
        <div className="flex items-center gap-3 lg:hidden">
          <SiteCreateLink />
          <SiteMobileNav
            primaryLinks={primaryLinks}
            utilityLinks={utilityLinks}
            account={account}
          />
        </div>
      </div>
    </SiteHeaderChrome>
  );
}
