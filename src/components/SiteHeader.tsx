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
import { AUTH_ENTRY_REL } from "@/lib/auth/return-to";
import {
  buildAccountMenuGroups,
  buildPrimarySiteNavLinks,
  buildUtilitySiteNavLinks,
  showDesignSystemNav,
  type SiteNavAccount,
} from "@/lib/site-nav";
import { getPromotedTgaHref } from "@/lib/tga-pickem/service";

export async function SiteHeader() {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const includeDesignSystem = showDesignSystemNav({
    nodeEnv: process.env.NODE_ENV,
    showDesignSystem: process.env.SHOW_DESIGN_SYSTEM,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
  const includeAdmin = profile?.isSiteAdmin === true;
  const tgaHref = await getPromotedTgaHref().catch(() => null);
  const primaryLinks = buildPrimarySiteNavLinks({ tgaHref });
  const utilityLinks = buildUtilitySiteNavLinks({
    includeAdmin,
    includeDesignSystem,
  });
  const account: SiteNavAccount = user
    ? {
        status: "authenticated",
        label: profile?.displayName ?? user.name ?? "Account",
        username: profile?.username ?? "account",
        avatarUrl: profile?.avatarUrl ?? null,
        groups: buildAccountMenuGroups({
          username: profile?.username ?? null,
          includeAdmin,
          includeDesignSystem,
        }),
      }
    : { status: "anonymous" };

  return (
    <SiteHeaderChrome signedIn={account.status === "authenticated"}>
      <div className="mx-auto flex max-w-[var(--page-max)] items-center justify-between gap-6 px-[var(--gutter)] py-2">
        <SiteBrand />
        <nav
          className="hidden items-center gap-5 text-sm font-semibold text-muted lg:flex"
          aria-label="Site"
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              scroll={false}
              className="hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <SiteCreateLink />
          {account.status === "authenticated" ? (
            <SiteAccountMenu
              label={account.label}
              username={account.username}
              avatarUrl={account.avatarUrl}
              groups={account.groups}
            />
          ) : (
            <Suspense
              fallback={
                <Link
                  href="/auth/sign-in"
                  rel={AUTH_ENTRY_REL}
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
