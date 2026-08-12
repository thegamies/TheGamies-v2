import Link from "next/link";
import {
  getRequestProfileByAuthUserId,
  getRequestSessionUser,
} from "@/lib/auth/session";
import { signOutAction } from "@/app/auth/sign-out/actions";
import { Button } from "@/components/ui/Button";

export async function SiteHeader() {
  const user = await getRequestSessionUser();
  const profile = user?.id
    ? await getRequestProfileByAuthUserId(user.id).catch(() => null)
    : null;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[var(--page-max)] items-baseline justify-between gap-6 px-[var(--gutter)] py-5">
        <Link
          href="/"
          className="font-display text-3xl tracking-wide text-ink hover:text-accent"
        >
          The Gamies
        </Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm text-muted">
          <Link href="/games" className="hover:text-ink">
            Games
          </Link>
          <Link href="/game-of-the-year" className="hover:text-ink">
            Standings
          </Link>
          <Link href="/create" className="hover:text-ink">
            Create
          </Link>
          <Link href="/admin" className="hover:text-ink">
            Admin
          </Link>
          {user ? (
            <>
              <Link
                href={profile ? `/u/${profile.username}` : "/account"}
                className="hover:text-ink"
              >
                {profile?.displayName ?? user.name ?? "Account"}
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
      </div>
    </header>
  );
}
