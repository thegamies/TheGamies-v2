import Link from "next/link";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/sign-out/actions";
import { Button } from "@/components/ui/Button";
import { SiteMobileNav } from "@/components/SiteMobileNav";
import {
  buildPrimarySiteNavLinks,
  showDesignSystemNav,
  type SiteNavAccount,
} from "@/lib/site-nav";

export async function SiteHeader() {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;
  const links = buildPrimarySiteNavLinks({
    includeDesignSystem: showDesignSystemNav({
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV,
      showDesignSystem: process.env.SHOW_DESIGN_SYSTEM,
    }),
  });
  const account: SiteNavAccount = user
    ? {
        status: "authenticated",
        profileHref: profile ? `/u/${profile.username}` : "/account",
        label: profile?.displayName ?? user.name ?? "Account",
      }
    : { status: "anonymous" };

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[var(--page-max)] items-center justify-between gap-6 px-[var(--gutter)] py-5">
        <Link
          href="/"
          className="font-display text-3xl tracking-wide text-ink hover:text-accent"
        >
          The Gamies
        </Link>
        <nav
          className="hidden flex-wrap items-center gap-5 text-sm text-muted lg:flex"
          aria-label="Site"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
          {account.status === "authenticated" ? (
            <>
              <Link href={account.profileHref} className="hover:text-ink">
                {account.label}
              </Link>
              <Link href="/account" className="hover:text-ink">
                Settings
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="quiet" className="px-0 py-0">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/auth/sign-in" className="hover:text-ink">
              Sign in
            </Link>
          )}
        </nav>
        <SiteMobileNav links={links} account={account} />
      </div>
    </header>
  );
}
